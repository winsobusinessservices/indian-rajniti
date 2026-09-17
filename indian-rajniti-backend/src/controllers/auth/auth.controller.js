const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../../models/user.model");
const Policy = require("../../models/policy.model");
const {
  sendPasswordResetEmail,
  sendRoleChangedEmail,
  sendRegistrationOtpEmail,
} = require("../../services/nodemailer.service");
const { userDocumentUrl } = require("../../middleware/upload.middleware");
const { ALL_PERMISSIONS, normalizePermissions } = require("../../config/permissions");

const EMAIL_REGEX = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const OTP_TTL = "10m";
const VERIFIED_EMAIL_TTL = "15m";
const OTP_RESEND_DELAY_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpSendTimes = new Map();
const otpAttempts = new Map();

function normalizedEmailOf(value) {
  return String(value || "").trim().toLowerCase();
}

function otpHash(email, otp) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${email}:${otp}`).digest("hex");
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

const requestRegistrationOtp = async (req, res) => {
  try {
    const email = normalizedEmailOf(req.body.email);
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }
    if (await User.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const rateKey = `${req.ip}:${email}`;
    const lastSentAt = otpSendTimes.get(rateKey) || 0;
    const waitSeconds = Math.ceil((OTP_RESEND_DELAY_MS - (Date.now() - lastSentAt)) / 1000);
    if (waitSeconds > 0) {
      return res.status(429).json({ success: false, message: `Please wait ${waitSeconds} seconds before requesting another code` });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const challengeToken = jwt.sign(
      { purpose: "registration-otp", email, otpHash: otpHash(email, otp) },
      process.env.JWT_SECRET,
      { expiresIn: OTP_TTL }
    );
    await sendRegistrationOtpEmail(email, otp);
    otpSendTimes.set(rateKey, Date.now());
    setTimeout(() => otpSendTimes.delete(rateKey), OTP_RESEND_DELAY_MS).unref();
    return res.status(200).json({ success: true, message: "Verification code sent", challengeToken });
  } catch (error) {
    console.error("Request registration OTP error:", error);
    return res.status(500).json({ success: false, message: "Unable to send verification code" });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = normalizedEmailOf(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const challengeToken = String(req.body.challengeToken || "");
    if (!/^\d{6}$/.test(otp) || !challengeToken) {
      return res.status(400).json({ success: false, message: "Enter the six-digit verification code" });
    }

    const key = tokenKey(challengeToken);
    const attempts = (otpAttempts.get(key) || 0) + 1;
    otpAttempts.set(key, attempts);
    if (attempts === 1) setTimeout(() => otpAttempts.delete(key), 10 * 60 * 1000).unref();
    if (attempts > MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new code" });
    }

    const challenge = jwt.verify(challengeToken, process.env.JWT_SECRET);
    if (challenge.purpose !== "registration-otp" || challenge.email !== email) {
      return res.status(400).json({ success: false, message: "Verification request does not match this email" });
    }
    const expected = Buffer.from(challenge.otpHash, "hex");
    const supplied = Buffer.from(otpHash(email, otp), "hex");
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      return res.status(400).json({ success: false, message: "Incorrect verification code" });
    }

    otpAttempts.delete(key);
    const verificationToken = jwt.sign(
      { purpose: "registration-verified", email },
      process.env.JWT_SECRET,
      { expiresIn: VERIFIED_EMAIL_TTL }
    );
    return res.status(200).json({ success: true, message: "Email verified", verificationToken });
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
    role: user.role,
    permissions: user.permissions,
    status: user.status,
  };
}

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const { name, email, password, agreeToTerms, verificationToken, acceptedPolicyIds } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the Terms of Service and Privacy Policy",
      });
    }
    const policyAcceptance = await validateAcceptedPolicies(acceptedPolicyIds);
    if (policyAcceptance.missing.length) {
      return res.status(400).json({ success: false, message: "Please review and accept all required policies" });
    }

    const strongPasswordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

   const validEmailRegex =/^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

    const normalizedEmail = email.trim().toLowerCase();

    if (!validEmailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    try {
      const verification = jwt.verify(verificationToken || "", process.env.JWT_SECRET);
      if (verification.purpose !== "registration-verified" || verification.email !== normalizedEmail) {
        return res.status(400).json({ success: false, message: "Please verify this email address before registering" });
      }
    } catch {
      return res.status(400).json({ success: false, message: "Email verification has expired. Please verify again" });
    }

    const validNameRegex = /^[a-zA-Z\s]+$/;
    if (!validNameRegex.test(name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Name can only contain letters and spaces",
      });
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }


    const passwordHash = await bcrypt.hash(strongPasswordRegex.test(password) ? password : "", 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      termsAccepted: agreeToTerms,
      acceptedPolicyIds: policyAcceptance.acceptedPolicyIds,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
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
        message: "Your account is not active",
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
    if (!user) {
      const emailUser = await User.findByEmail(email);
      if (emailUser) {
        user = await User.linkGoogleAccount(emailUser.id, googleSub);
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
      return res.status(403).json({ success: false, message: "Your account is not active" });
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
        role: user.role,
        permissions: user.permissions,
        status: user.status,
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
    const allUsers = await User.findAll();
    const assignments = await User.getEditorAssignments();
    const assignmentByAuthor = new Map(assignments.map((assignment) => [Number(assignment.author_id), assignment]));
    const visibleUsers = ["ADMIN", "INVESTOR"].includes(req.user.role)
      ? allUsers
      : allUsers.filter((user) => MEMBER_ASSIGNABLE_ROLES.includes(user.role));
    const users = visibleUsers.map((user) => {
      const assignment = assignmentByAuthor.get(Number(user.id));
      return {
        ...user,
        assigned_editor_id: assignment ? Number(assignment.editor_id) : null,
        assigned_editor_name: assignment?.editor_name || null,
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

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

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
    const { name, email, role, permissions } = req.body;

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
    if (req.user.role !== "ADMIN" && ["ADMIN", "SUBADMIN"].includes(existing.role)) {
      return res.status(403).json({ success: false, message: "Only Admin can modify Admin or Subadmin accounts" });
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
      permissions: effectivePermissions,
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
      return res.status(400).json({ success: false, message: "Author and editor IDs must be valid" });
    }

    const author = await User.findById(authorId);
    if (!author || author.role !== "AUTHOR") {
      return res.status(400).json({ success: false, message: "The selected team member must be an author" });
    }

    let editor = null;
    if (editorId !== null) {
      editor = await User.findById(editorId);
      if (!editor || editor.role !== "EDITOR" || editor.status !== "ACTIVE") {
        return res.status(400).json({ success: false, message: "Select an active editor" });
      }
    }

    await User.setAssignedEditor({ authorId, editorId, assignedBy: req.user.userId });
    return res.status(200).json({
      success: true,
      message: editor ? `${author.name} assigned to ${editor.name}` : `${author.name} is now unassigned`,
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

    await User.clearEditorAssignmentsForUser(id);
    await User.delete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted",
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
      `${process.env.CLIENT_ORIGIN}/reset-password?token=${encodeURIComponent(resetToken)}`;

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
