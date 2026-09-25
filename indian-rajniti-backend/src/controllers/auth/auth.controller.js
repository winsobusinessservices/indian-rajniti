const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../../models/user.model");
const Site = require("../../models/site.model");
const Policy = require("../../models/policy.model");
const DeletionAudit = require("../../models/deletionAudit.model");
const {
  sendPasswordResetEmail,
  sendRoleChangedEmail,
  sendRegistrationOtpEmail,
} = require("../../services/nodemailer.service");
const { AmazeSmsError, sendRegistrationOtpSms } = require("../../services/amazesms.service");
const { userDocumentUrl } = require("../../middleware/upload.middleware");
const { PERMISSIONS, ALL_PERMISSIONS, normalizePermissions } = require("../../config/permissions");

const EMAIL_REGEX = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const VALID_NAME_REGEX = /^[a-zA-Z\s]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const OTP_TTL = "10m";
const VERIFIED_EMAIL_TTL = "15m";
const OTP_RESEND_DELAY_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpSendTimes = new Map();
const otpAttempts = new Map();
const configuredClientOrigins = String(process.env.CLIENT_ORIGIN || "https://indianrajniti.in")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const PUBLIC_CLIENT_ORIGIN = configuredClientOrigins[0] || "https://indianrajniti.in";
const PANEL_CLIENT_ORIGIN = String(process.env.PANEL_ORIGIN || "https://indianrajneeti.com")
  .split(",")[0]
  .trim()
  .replace(/\/$/, "");
const STAFF_ROLES = new Set(["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN"]);

function clientOriginForRole(role) {
  return STAFF_ROLES.has(role) ? PANEL_CLIENT_ORIGIN : PUBLIC_CLIENT_ORIGIN;
}

function normalizedEmailOf(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizedMobileOf(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return INDIAN_MOBILE_REGEX.test(digits) ? `+91${digits}` : "";
}

function otpHash(identifier, otp) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${identifier}:${otp}`).digest("hex");
}

function tokenKey(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sendRoleChangedEmailInBackground(user, oldRole, newRole) {
  void sendRoleChangedEmail(user.email, user.name, oldRole, newRole).catch((error) => {
    console.error("Role changed email error:", error);
  });
}

async function validateAcceptedPolicies(value) {
  const submittedIds = new Set(
    (Array.isArray(value) ? value : [])
      .map(Number)
      .filter(Number.isInteger)
  );
  const requiredPolicies = await Policy.findRegistrationPolicies();
  const missing = requiredPolicies.filter((policy) => !submittedIds.has(Number(policy.id)));
  return {
    acceptedPolicyIds: requiredPolicies.map((policy) => Number(policy.id)),
    missing,
  };
}

async function validateRegistrationFields(payload, { requirePasswordConfirmation = false } = {}) {
  const name = String(payload?.name || "").trim();
  const email = normalizedEmailOf(payload?.email);
  const rawPhone = String(payload?.phone || "").trim();
  const phone = normalizedMobileOf(rawPhone);
  const password = String(payload?.password || "");
  const confirmPassword = String(payload?.confirmPassword || "");

  if (!name || !email || !rawPhone || !password || (requirePasswordConfirmation && !confirmPassword)) {
    return {
      error: requirePasswordConfirmation
        ? "Name, email, mobile number, password and password confirmation are required"
        : "Name, email, mobile number and password are required",
    };
  }
  if (!VALID_NAME_REGEX.test(name)) {
    return { error: "Name can only contain letters and spaces" };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address" };
  }
  if (!phone) {
    return { error: "Enter a valid 10-digit Indian mobile number" };
  }
  if (!STRONG_PASSWORD_REGEX.test(password)) {
    return {
      error: "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
    };
  }
  if (requirePasswordConfirmation && password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }
  if (!payload?.agreeToTerms) {
    return { error: "You must agree to the Terms of Service and Privacy Policy" };
  }

  const policyAcceptance = await validateAcceptedPolicies(payload?.acceptedPolicyIds);
  if (policyAcceptance.missing.length) {
    return { error: "Please review and accept all required policies" };
  }

  return { name, email, phone, password, policyAcceptance };
}

const requestRegistrationOtp = async (req, res) => {
  try {
    const validation = await validateRegistrationFields(req.body, { requirePasswordConfirmation: true });
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }
    const { email, phone } = validation;
    const existingUser = await User.findByEmail(email);
    if (existingUser && !existingUser.deleted_at) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }
    const existingPhoneUser = await User.findByPhone(phone);
    if (existingPhoneUser && !existingPhoneUser.deleted_at && existingPhoneUser.id !== existingUser?.id) {
      return res.status(409).json({ success: false, message: "An account with this mobile number already exists" });
    }

    const rateKey = `${req.ip}:${email}:${phone}`;
    const lastSentAt = otpSendTimes.get(rateKey) || 0;
    const waitSeconds = Math.ceil((OTP_RESEND_DELAY_MS - (Date.now() - lastSentAt)) / 1000);
    if (waitSeconds > 0) {
      return res.status(429).json({ success: false, message: `Please wait ${waitSeconds} seconds before requesting another code` });
    }

    // Reserve the cooldown before either delivery starts. Without this lock,
    // two near-simultaneous requests can both pass the check and send duplicate
    // email and SMS codes.
    const reservedAt = Date.now();
    otpSendTimes.set(rateKey, reservedAt);

    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const mobileOtp = crypto.randomInt(100000, 1000000).toString();
    const challengeToken = jwt.sign(
      { purpose: "registration-otp", email, phone, emailOtpHash: otpHash(email, emailOtp), mobileOtpHash: otpHash(phone, mobileOtp) },
      process.env.JWT_SECRET,
      { expiresIn: OTP_TTL }
    );
    try {
      await Promise.all([
        sendRegistrationOtpEmail(email, emailOtp),
        sendRegistrationOtpSms(phone, mobileOtp),
      ]);
    } catch (error) {
      if (otpSendTimes.get(rateKey) === reservedAt) otpSendTimes.delete(rateKey);
      throw error;
    }
    setTimeout(() => {
      if (otpSendTimes.get(rateKey) === reservedAt) otpSendTimes.delete(rateKey);
    }, OTP_RESEND_DELAY_MS).unref();
    return res.status(200).json({ success: true, message: "Email and mobile verification codes sent", challengeToken });
  } catch (error) {
    console.error("Request registration OTP error:", error);
    if (error instanceof AmazeSmsError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: `Mobile verification SMS could not be sent: ${error.message}`,
      });
    }
    return res.status(500).json({ success: false, message: "Unable to send verification code" });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = normalizedEmailOf(req.body.email);
    const phone = normalizedMobileOf(req.body.phone);
    const emailOtp = String(req.body.emailOtp || "").trim();
    const mobileOtp = String(req.body.mobileOtp || "").trim();
    const challengeToken = String(req.body.challengeToken || "");
    if (!/^\d{6}$/.test(emailOtp) || !/^\d{6}$/.test(mobileOtp) || !phone || !challengeToken) {
      return res.status(400).json({ success: false, message: "Enter both six-digit verification codes" });
    }

    const key = tokenKey(challengeToken);
    const attempts = (otpAttempts.get(key) || 0) + 1;
    otpAttempts.set(key, attempts);
    if (attempts === 1) setTimeout(() => otpAttempts.delete(key), 10 * 60 * 1000).unref();
    if (attempts > MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new code" });
    }

    const challenge = jwt.verify(challengeToken, process.env.JWT_SECRET);
    if (challenge.purpose !== "registration-otp" || challenge.email !== email || challenge.phone !== phone) {
      return res.status(400).json({ success: false, message: "Verification request does not match this email and mobile number" });
    }
    const expectedEmail = Buffer.from(challenge.emailOtpHash, "hex");
    const suppliedEmail = Buffer.from(otpHash(email, emailOtp), "hex");
    const expectedMobile = Buffer.from(challenge.mobileOtpHash, "hex");
    const suppliedMobile = Buffer.from(otpHash(phone, mobileOtp), "hex");
    if (expectedEmail.length !== suppliedEmail.length || !crypto.timingSafeEqual(expectedEmail, suppliedEmail)) {
      return res.status(400).json({ success: false, message: "Incorrect email verification code" });
    }
    if (expectedMobile.length !== suppliedMobile.length || !crypto.timingSafeEqual(expectedMobile, suppliedMobile)) {
      return res.status(400).json({ success: false, message: "Incorrect mobile verification code" });
    }

    otpAttempts.delete(key);
    const verificationToken = jwt.sign(
      { purpose: "registration-verified", email, phone },
      process.env.JWT_SECRET,
      { expiresIn: VERIFIED_EMAIL_TTL }
    );
    return res.status(200).json({ success: true, message: "Email and mobile number verified", verificationToken });
  } catch (error) {
    const expired = error.name === "TokenExpiredError";
    return res.status(400).json({ success: false, message: expired ? "Verification code expired. Request a new code" : "Invalid verification request" });
  }
};

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Must match the name/options auth.middleware.js reads and logout clears.
const AUTH_COOKIE_NAME = "token";
const cookieSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || cookieSameSite === "none",
  sameSite: cookieSameSite,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_EXPIRES_IN

function setAuthCookie(res, user) {
  res.cookie(AUTH_COOKIE_NAME, signToken(user), {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

function authUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions,
    status: user.status,
    siteId: Number(user.site_id || 1),
    site: { id: Number(user.site_id || 1), name: user.site_name || "Indian Rajneeti", slug: user.site_slug || "indian-rajneeti", domain: user.site_domain || "indianrajneeti.com" },
  };
}

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const { verificationToken } = req.body;
    const validation = await validateRegistrationFields(req.body);
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }
    const { name, email: normalizedEmail, phone, password, policyAcceptance } = validation;

    try {
      const verification = jwt.verify(verificationToken || "", process.env.JWT_SECRET);
      if (verification.purpose !== "registration-verified" || verification.email !== normalizedEmail || verification.phone !== phone) {
        return res.status(400).json({ success: false, message: "Please verify this email address and mobile number before registering" });
      }
    } catch {
      return res.status(400).json({ success: false, message: "Email and mobile verification has expired. Please verify again" });
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser && !existingUser.deleted_at) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }
    const existingPhoneUser = await User.findByPhone(phone);
    if (existingPhoneUser && !existingPhoneUser.deleted_at && existingPhoneUser.id !== existingUser?.id) {
      return res.status(409).json({ success: false, message: "An account with this mobile number already exists" });
    }


    const passwordHash = await bcrypt.hash(password, 10);

    const user = existingUser?.deleted_at
      ? await User.reactivateDeletedRegistration(existingUser.id, {
        name,
        phone,
        passwordHash,
        acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
        siteId: req.site?.id || 1,
      })
      : await User.create({
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        termsAccepted: true,
        acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
        siteId: req.site?.id || 1,
      });
    if (!user) {
      return res.status(409).json({ success: false, message: "This account is no longer available for re-registration" });
    }

    return res.status(201).json({
      success: true,
      message: existingUser?.deleted_at ? "Deleted account re-registered successfully" : "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// LOGIN
// =========================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findByEmail(normalizedEmailOf(email));
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or invalid email/password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is inactive. Please contact an administrator to reactivate it.",
      });
    }

    if (user.site_status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        code: "SITE_INACTIVE",
        message: "You don't have access to this panel",
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google sign-in. Continue with Google instead.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    setAuthCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: authUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// GOOGLE AUTH
// =========================

const googleAuth = async (req, res) => {
  try {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
      return res.status(503).json({ success: false, message: "Google authentication is not configured" });
    }

    const credential = String(req.body?.credential || "");
    const intent = req.body?.intent === "register" ? "register" : "login";
    if (intent === "register") {
      return res.status(400).json({ success: false, message: "Use the registration form so both your email and mobile number can be verified." });
    }
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential is required" });
    }
    if (intent === "register" && !req.body?.agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the Terms of Service and Privacy Policy",
      });
    }
    const policyAcceptance = intent === "register"
      ? await validateAcceptedPolicies(req.body?.acceptedPolicyIds)
      : { acceptedPolicyIds: [], missing: [] };
    if (policyAcceptance.missing.length) {
      return res.status(400).json({ success: false, message: "Please review and accept all required policies" });
    }

    let ticket;
    try {
      ticket = await new OAuth2Client(clientId).verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Google sign-in expired or is invalid. Please try again.",
      });
    }
    const profile = ticket.getPayload();
    const googleSub = String(profile?.sub || "");
    const email = normalizedEmailOf(profile?.email);
    if (!googleSub || !EMAIL_REGEX.test(email) || profile?.email_verified !== true) {
      return res.status(401).json({ success: false, message: "Google could not verify this email address" });
    }

    let created = false;
    let user = await User.findByGoogleSub(googleSub);
    if (user?.deleted_at && intent === "register") {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("base64url"), 10);
      user = await User.reactivateDeletedRegistration(user.id, {
        name: String(profile?.name || email.split("@")[0]).trim().slice(0, 120),
        passwordHash,
        googleSub,
        acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
        siteId: req.site?.id || 1,
      });
      created = true;
    }
    if (!user) {
      const emailUser = await User.findByEmail(email);
      if (emailUser) {
        if (emailUser.deleted_at && intent === "register") {
          const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("base64url"), 10);
          user = await User.reactivateDeletedRegistration(emailUser.id, {
            name: String(profile?.name || email.split("@")[0]).trim().slice(0, 120),
            passwordHash,
            googleSub,
            acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
            siteId: req.site?.id || 1,
          });
          created = true;
        } else if (emailUser.status !== "ACTIVE") {
          return res.status(403).json({ success: false, code: "ACCOUNT_INACTIVE", message: "Your account is inactive. Please contact an administrator to reactivate it." });
        } else {
          user = await User.linkGoogleAccount(emailUser.id, googleSub);
        }
      } else if (intent === "register") {
        // Keep password_hash non-null for compatibility. This random value is
        // never disclosed and cannot be used to sign in; password reset can
        // still establish a normal password later.
        const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString("base64url"), 10);
        const name = String(profile?.name || email.split("@")[0]).trim().slice(0, 120);
        user = await User.create({
          name,
          email,
          passwordHash,
          googleSub,
          termsAccepted: true,
          acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
          siteId: req.site?.id || 1,
        });
        created = true;
      } else {
        return res.status(404).json({
          success: false,
          message: "No account uses this Google email. Create an account first.",
        });
      }
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, code: "ACCOUNT_INACTIVE", message: "Your account is inactive. Please contact an administrator to reactivate it." });
    }
    if (user.site_status !== "ACTIVE") {
      return res.status(403).json({ success: false, code: "SITE_INACTIVE", message: "You don't have access to this panel" });
    }

    setAuthCookie(res, user);
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Account created successfully" : "Login successful",
      user: authUserResponse(user),
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This Google account is already linked" });
    }
    console.error("Google auth error:", error);
    return res.status(500).json({ success: false, message: "Unable to authenticate with Google" });
  }
};

const getGoogleAuthConfig = (req, res) => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  return res.status(200).json({ success: true, clientId });
};

// =========================
// CURRENT USER
// =========================

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        status: user.status,
        siteId: Number(user.site_id || 1),
        site: { id: Number(user.site_id || 1), name: user.site_name || "Indian Rajneeti", slug: user.site_slug || "indian-rajneeti", domain: user.site_domain || "indianrajneeti.com" },
        termsAccepted: user.terms_accepted,
        termsAcceptedAt: user.terms_accepted_at,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const logout = async (req, res) => {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// LIST USERS (ADMIN ONLY)
// =========================

const listUsers = async (req, res) => {
  try {
    const requestedSiteId = Number(req.query?.siteId || req.get("x-management-site-id") || req.user.siteId || 1);
    const siteId = req.user.role === "ADMIN" ? requestedSiteId : Number(req.user.siteId);
    const includeDeleted = req.user.role === "ADMIN" && String(req.query?.includeDeleted || "") === "true";
    const allUsers = await User.findAll({ siteId, includeDeleted });
    const primarySite = await Site.findBySlug(process.env.DEFAULT_SITE_SLUG || "indian-rajneeti");
    const sites = primarySite ? [primarySite] : [];
    const siteById = new Map(sites.map((site) => [Number(site.id), site]));
    const assignments = await User.getEditorAssignments();
    const assignmentByAuthor = new Map(assignments.map((assignment) => [Number(assignment.author_id), assignment]));
    const canManageTeam = req.user.role === "ADMIN" || req.user.permissions?.includes(PERMISSIONS.TEAM_MEMBERS);
    const canManageUsers = req.user.role === "ADMIN" || req.user.permissions?.includes(PERMISSIONS.MANAGE_USERS);
    const visibleUsers = req.user.role === "INVESTOR" || (canManageTeam && canManageUsers)
      ? allUsers
      : canManageUsers
        ? allUsers.filter((user) => user.role === "USER")
        : allUsers.filter((user) => [...MEMBER_ASSIGNABLE_ROLES, "SUBADMIN"].includes(user.role));
    const users = visibleUsers.map((user) => {
      const assignment = assignmentByAuthor.get(Number(user.id));
      return {
        ...user,
        assigned_editor_id: assignment ? Number(assignment.editor_id) : null,
        assigned_editor_name: assignment?.editor_name || null,
        site: siteById.get(Number(user.site_id)) || null,
      };
    });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("List users error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// ASSIGN ROLE (ADMIN ONLY)
// =========================
// Admin assigns an Author/Editor/Investor role to an existing account —
// the person must have already self-registered via the public
// /auth/register signup flow; this no longer creates accounts or sets
// passwords. Author and Editor require KYC documents on file — PAN and
// Aadhar for both, plus a graduation certificate for Editor specifically —
// which only need to be (re-)uploaded here if not already on file.
// Investor has no document requirement.

const MEMBER_ASSIGNABLE_ROLES = ["AUTHOR", "EDITOR", "INVESTOR"];
const ADMIN_ASSIGNABLE_ROLES = [...MEMBER_ASSIGNABLE_ROLES, "SUBADMIN"];
const REQUIRED_DOCS_BY_ROLE = {
  AUTHOR: ["panDocument", "aadharDocument"],
  EDITOR: ["panDocument", "aadharDocument", "graduationCertificate"],
  INVESTOR: [],
  SUBADMIN: [],
};
const DOC_LABEL = {
  panDocument: "PAN document",
  aadharDocument: "Aadhar document",
  graduationCertificate: "Graduation certificate",
};
const DOC_COLUMN = {
  panDocument: "pan_document",
  aadharDocument: "aadhar_document",
  graduationCertificate: "graduation_certificate",
};

const adminAssignRole = async (req, res) => {
  try {
    const { email, role } = req.body;
    const siteId = Number(req.site?.id || 1);

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }
    const site = await Site.findById(siteId);
    if (!site || site.status !== "ACTIVE") return res.status(400).json({ success: false, message: "Select an active website" });

    const assignableRoles = req.user.role === "ADMIN" ? ADMIN_ASSIGNABLE_ROLES : MEMBER_ASSIGNABLE_ROLES;
    if (!assignableRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${assignableRoles.join(", ")}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email. Ask them to register first, then assign a role.",
      });
    }

    const files = {
      panDocument: req.files?.panDocument?.[0],
      aadharDocument: req.files?.aadharDocument?.[0],
      graduationCertificate: req.files?.graduationCertificate?.[0],
    };

    const missingDocs = REQUIRED_DOCS_BY_ROLE[role].filter(
      (field) => !files[field] && !existingUser[DOC_COLUMN[field]]
    );
    if (missingDocs.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required document(s) for ${role}: ${missingDocs.map((f) => DOC_LABEL[f]).join(", ")}`,
      });
    }

    const previousRole = existingUser.role;
    let requestedPermissions;
    try {
      requestedPermissions = req.body.permissions ? JSON.parse(req.body.permissions) : null;
    } catch {
      return res.status(400).json({ success: false, message: "Permissions must be a valid JSON array" });
    }
    if (requestedPermissions !== null && (!Array.isArray(requestedPermissions) || requestedPermissions.some((item) => !ALL_PERMISSIONS.includes(item)))) {
      return res.status(400).json({ success: false, message: "One or more permissions are invalid" });
    }

    if (req.user.role !== "ADMIN" && ["ADMIN", "SUBADMIN"].includes(existingUser.role)) {
      return res.status(403).json({ success: false, message: "Only Admin can modify Admin or Subadmin accounts" });
    }
    const effectivePermissions = req.user.role !== "ADMIN"
      ? normalizePermissions(null, role)
      : normalizePermissions(requestedPermissions, role);
    const user = await User.update(existingUser.id, {
      role,
      siteId,
      permissions: effectivePermissions,
      panDocument: files.panDocument ? userDocumentUrl(files.panDocument) : undefined,
      aadharDocument: files.aadharDocument ? userDocumentUrl(files.aadharDocument) : undefined,
      graduationCertificate: files.graduationCertificate ? userDocumentUrl(files.graduationCertificate) : undefined,
    });

    if (role !== previousRole) {
      sendRoleChangedEmailInBackground(user, previousRole, role);
    }

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role}`,
      user,
    });
  } catch (error) {
    console.error("Admin assign role error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// UPDATE USER ROLE (ADMIN ONLY)
// =========================

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !User.ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${User.ROLES.join(", ")}`,
      });
    }
    if (req.user.role !== "ADMIN" && !MEMBER_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(403).json({ success: false, message: "Subadmins can assign only Author, Editor, or Investor roles" });
    }

    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (req.user.role !== "ADMIN" && ["ADMIN", "SUBADMIN"].includes(existing.role)) {
      return res.status(403).json({ success: false, message: "Only Admin can modify Admin or Subadmin accounts" });
    }

    const user = await User.updateRole(id, role);

    if (role !== existing.role) {
      await User.clearEditorAssignmentsForUser(id);
    }

    if (role !== existing.role) {
      sendRoleChangedEmailInBackground(user, existing.role, role);
    }

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user,
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// UPDATE USER DETAILS (ADMIN ONLY)
// =========================
// Combined name/email/role editor backing the Team Members table's single
// "Save" action — distinct from updateUserRole above (role-only, kept as-is
// in case anything else already depends on it).
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, permissions } = req.body;
    const siteId = req.body.siteId !== undefined ? Number(req.site?.id || 1) : undefined;

    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (role !== undefined) {
      if (!User.ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${User.ROLES.join(", ")}`,
        });
      }
      if (req.user.role !== "ADMIN" && !MEMBER_ASSIGNABLE_ROLES.includes(role)) {
        return res.status(403).json({ success: false, message: "Subadmins can assign only Author, Editor, or Investor roles" });
      }
      // An admin editing the table could otherwise demote/reassign their own
      // row and lock themselves out with no one left to undo it.
      if (Number(id) === req.user.userId && role !== existing.role) {
        return res.status(400).json({
          success: false,
          message: "You cannot change your own role",
        });
      }
    }
    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be ACTIVE or INACTIVE" });
      }
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Only Admin can activate or deactivate accounts" });
      }
      if (Number(id) === req.user.userId && status !== existing.status) {
        return res.status(400).json({ success: false, message: "You cannot change your own account status" });
      }
    }
    if (req.user.role !== "ADMIN" && ["ADMIN", "SUBADMIN"].includes(existing.role)) {
      return res.status(403).json({ success: false, message: "Only Admin can modify Admin or Subadmin accounts" });
    }
    if (req.user.role !== "ADMIN" && Number(existing.site_id) !== Number(req.user.siteId)) {
      return res.status(403).json({ success: false, message: "This team member belongs to another website" });
    }
    if (siteId !== undefined) {
      if (req.user.role !== "ADMIN" && siteId !== Number(req.user.siteId)) return res.status(403).json({ success: false, message: "Only Admin can move team members between websites" });
      const site = await Site.findById(siteId);
      if (!site || site.status !== "ACTIVE") return res.status(400).json({ success: false, message: "Select an active website" });
    }

    let normalizedEmail;
    if (email !== undefined) {
      normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }
      if (normalizedEmail !== existing.email) {
        const emailTaken = await User.findByEmail(normalizedEmail);
        if (emailTaken) {
          return res.status(409).json({
            success: false,
            message: "That email is already in use",
          });
        }
      }
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (permissions !== undefined && (!Array.isArray(permissions) || permissions.some((item) => !ALL_PERMISSIONS.includes(item)))) {
      return res.status(400).json({ success: false, message: "One or more permissions are invalid" });
    }

    const effectivePermissions = req.user.role !== "ADMIN" && permissions !== undefined
      ? normalizePermissions(null, role || existing.role)
      : permissions !== undefined
        ? normalizePermissions(permissions, role || existing.role)
        : role !== undefined && role !== existing.role
          ? null
          : undefined;
    const user = await User.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      email: normalizedEmail,
      role,
      status,
      permissions: effectivePermissions,
      siteId,
    });

    if (role !== undefined && role !== existing.role) {
      await User.clearEditorAssignmentsForUser(id);
    }

    if (role !== undefined && role !== existing.role) {
      sendRoleChangedEmailInBackground(user, existing.role, role);
    }

    return res.status(200).json({
      success: true,
      message: "User updated",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const assignAuthorEditor = async (req, res) => {
  try {
    const authorId = Number(req.params.id);
    const rawEditorId = req.body?.editorId;
    const editorId = rawEditorId === null || rawEditorId === "" ? null : Number(rawEditorId);

    if (!Number.isInteger(authorId) || authorId <= 0 || (editorId !== null && (!Number.isInteger(editorId) || editorId <= 0))) {
      return res.status(400).json({ success: false, message: "Creator and reviewer IDs must be valid" });
    }

    const author = await User.findById(authorId);
    if (!author || !["AUTHOR", "EDITOR"].includes(author.role)) {
      return res.status(400).json({ success: false, message: "A reviewer can only be assigned to an Author or Editor" });
    }
    if (req.user.role !== "ADMIN" && Number(author.site_id) !== Number(req.user.siteId)) return res.status(403).json({ success: false, message: "This creator belongs to another website" });

    let editor = null;
    if (editorId !== null) {
      editor = await User.findById(editorId);
      if (!editor || !["EDITOR", "SUBADMIN"].includes(editor.role) || editor.status !== "ACTIVE") {
        return res.status(400).json({ success: false, message: "Select an active Editor or Subadmin reviewer" });
      }
      if (editor.id === author.id) {
        return res.status(400).json({ success: false, message: "An Editor cannot review their own content" });
      }
      if (Number(editor.site_id) !== Number(author.site_id)) return res.status(400).json({ success: false, message: "Creator and reviewer must belong to the same website" });
    }

    await User.setAssignedEditor({ authorId, editorId, assignedBy: req.user.userId });
    return res.status(200).json({
      success: true,
      message: editor ? `${editor.name} will review ${author.name}'s content` : `${author.name} is now unassigned`,
      assignment: editor ? { authorId, editorId, editorName: editor.name } : null,
    });
  } catch (error) {
    console.error("Assign author editor error:", error);
    return res.status(500).json({ success: false, message: "Unable to update editor assignment" });
  }
};

// =========================
// DELETE USER (ADMIN ONLY)
// =========================

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const canManageTarget = existing.role === "USER"
      ? req.user.role === "ADMIN" || req.user.permissions?.includes(PERMISSIONS.MANAGE_USERS)
      : req.user.role === "ADMIN" || req.user.permissions?.includes(PERMISSIONS.TEAM_MEMBERS);
    if (!canManageTarget) {
      return res.status(403).json({ success: false, message: "You do not have permission to delete this account" });
    }
    if (req.user.role !== "ADMIN" && ["ADMIN", "SUBADMIN"].includes(existing.role)) {
      return res.status(403).json({ success: false, message: "Only Admin can delete Admin or Subadmin accounts" });
    }

    // Same guard as the self role-change check above — an admin deleting
    // their own row could lock everyone out with no one left to undo it.
    if (Number(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await DeletionAudit.softDelete({
      entityType: "USER",
      entityId: id,
      deletedBy: req.user.userId,
      reason: req.body?.reason,
    });

    return res.status(200).json({
      success: true,
      message: "User moved to deleted items",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =========================
// FORGOT / RESET PASSWORD
// =========================
// Two-step flow: forgotPassword issues a short-lived reset token for the
// account, resetPassword consumes that token to set a new password.
// A real deployment must email the token to the user instead of returning
// it in the API response.

const RESET_TOKEN_EXPIRES_IN = "15m";

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findByEmail(email.trim().toLowerCase());

    // Always respond the same way, whether or not the email exists,
    // so callers can't use this endpoint to discover registered emails.
    let resetToken;
    if (user) {
      resetToken = jwt.sign(
        { userId: user.id, purpose: "reset" },
        process.env.JWT_SECRET,
        { expiresIn: RESET_TOKEN_EXPIRES_IN }
      );


    const resetUrl =
      `${clientOriginForRole(user.role)}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await sendPasswordResetEmail(
      user.email,
      resetUrl
    );
    }

    return res.status(200).json({
      success: true,
       message:
    "If that email is registered, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    if (payload.purpose !== "reset") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, newPasswordHash);

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findByIdWithPassword(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await User.updatePassword(user.id, newPasswordHash);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  register,
  login,
  googleAuth,
  getGoogleAuthConfig,
  getCurrentUser,
  listUsers,
  adminAssignRole,
  updateUserRole,
  updateUser,
  assignAuthorEditor,
  deleteUser,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
