const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const {
  sendPasswordResetEmail,
  sendRoleChangedEmail,
} = require("../../services/nodemailer.service");
const { userDocumentUrl } = require("../../middleware/upload.middleware");

const EMAIL_REGEX = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Must match the name/options auth.middleware.js reads and logout clears.
const AUTH_COOKIE_NAME = "token";
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_EXPIRES_IN

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const { name, email, password, agreeToTerms } = req.body;

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

    const user = await User.findByEmail(email);
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

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken(user);

    res.cookie(AUTH_COOKIE_NAME, token, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
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
    const users = await User.findAll();

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

const ADMIN_ASSIGNABLE_ROLES = ["AUTHOR", "EDITOR", "INVESTOR"];
const REQUIRED_DOCS_BY_ROLE = {
  AUTHOR: ["panDocument", "aadharDocument"],
  EDITOR: ["panDocument", "aadharDocument", "graduationCertificate"],
  INVESTOR: [],
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

    if (!ADMIN_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ADMIN_ASSIGNABLE_ROLES.join(", ")}`,
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

    const user = await User.update(existingUser.id, {
      role,
      panDocument: files.panDocument ? userDocumentUrl(files.panDocument) : undefined,
      aadharDocument: files.aadharDocument ? userDocumentUrl(files.aadharDocument) : undefined,
      graduationCertificate: files.graduationCertificate ? userDocumentUrl(files.graduationCertificate) : undefined,
    });

    if (role !== previousRole) {
      try {
        await sendRoleChangedEmail(user.email, user.name, previousRole, role);
      } catch (emailError) {
        console.error("Role changed email error:", emailError);
      }
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

    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = await User.updateRole(id, role);

    if (role !== existing.role) {
      try {
        await sendRoleChangedEmail(user.email, user.name, existing.role, role);
      } catch (emailError) {
        console.error("Role changed email error:", emailError);
      }
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
    const { name, email, role } = req.body;

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
      // An admin editing the table could otherwise demote/reassign their own
      // row and lock themselves out with no one left to undo it.
      if (Number(id) === req.user.userId && role !== existing.role) {
        return res.status(400).json({
          success: false,
          message: "You cannot change your own role",
        });
      }
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

    const user = await User.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      email: normalizedEmail,
      role,
    });

    if (role !== undefined && role !== existing.role) {
      try {
        await sendRoleChangedEmail(user.email, user.name, existing.role, role);
      } catch (emailError) {
        console.error("Role changed email error:", emailError);
      }
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

    // Same guard as the self role-change check above — an admin deleting
    // their own row could lock everyone out with no one left to undo it.
    if (Number(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

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
  register,
  login,
  getCurrentUser,
  listUsers,
  adminAssignRole,
  updateUserRole,
  updateUser,
  deleteUser,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
