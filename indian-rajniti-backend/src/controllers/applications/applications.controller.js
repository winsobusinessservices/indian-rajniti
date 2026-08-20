// Public "apply to join as Author/Editor/Investor" flow. Submitting is
// public (no auth) and only ever creates a PENDING row in role_applications
// — it does NOT create a login-able account. An admin reviews and approves
// or rejects; approval is what actually creates the `users` row, using the
// password the applicant chose at submission time.
const bcrypt = require("bcrypt");
const RoleApplication = require("../../models/roleApplication.model");
const User = require("../../models/user.model");
const { userDocumentUrl } = require("../../middleware/upload.middleware");

const APPLICATION_ROLES = ["AUTHOR", "EDITOR", "INVESTOR"];

// Same rule as auth.controller.js's admin-create flow: Author needs PAN +
// Aadhar, Editor additionally needs a graduation certificate, Investor
// needs neither. Resume is required for every role — this is an
// application, after all.
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

const submitApplication = async (req, res) => {
  try {
    const { name, email, phone, password, role, message } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and role are required",
      });
    }

    if (!APPLICATION_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${APPLICATION_ROLES.join(", ")}`,
      });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const validEmailRegex = /^[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]*[a-zA-Z0-9]@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!validEmailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingApplication = await RoleApplication.findPendingByEmail(normalizedEmail);
    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending application on file",
      });
    }

    const files = {
      resume: req.files?.resume?.[0],
      panDocument: req.files?.panDocument?.[0],
      aadharDocument: req.files?.aadharDocument?.[0],
      graduationCertificate: req.files?.graduationCertificate?.[0],
    };

    if (!files.resume) {
      return res.status(400).json({ success: false, message: "A resume is required" });
    }

    const missingDocs = REQUIRED_DOCS_BY_ROLE[role].filter((field) => !files[field]);
    if (missingDocs.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required document(s) for ${role}: ${missingDocs.map((f) => DOC_LABEL[f]).join(", ")}`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const application = await RoleApplication.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      role,
      passwordHash,
      resume: userDocumentUrl(files.resume),
      panDocument: files.panDocument ? userDocumentUrl(files.panDocument) : null,
      aadharDocument: files.aadharDocument ? userDocumentUrl(files.aadharDocument) : null,
      graduationCertificate: files.graduationCertificate ? userDocumentUrl(files.graduationCertificate) : null,
      message: message?.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted. We'll be in touch once it's reviewed.",
      application,
    });
  } catch (error) {
    console.error("Submit application error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// =========================
// LIST APPLICATIONS (ADMIN ONLY)
// =========================

const listApplications = async (req, res) => {
  try {
    const { status, role } = req.query;
    const applications = await RoleApplication.findAll({ status, role });
    return res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error("List applications error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// =========================
// REVIEW APPLICATION (ADMIN ONLY)
// =========================
// APPROVE creates the real `users` row (reusing the password the applicant
// already chose, so they can log in immediately) and marks the application
// APPROVED. REJECT just records the decision — no account is created.

const reviewApplication = async (req, res) => {
  try {
    const { action, notes } = req.body;
    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be APPROVE or REJECT" });
    }

    const application = await RoleApplication.findByIdWithPassword(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (application.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `This application was already ${application.status.toLowerCase()}` });
    }

    if (action === "APPROVE") {
      const existingUser = await User.findByEmail(application.email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: "An account with this email already exists" });
      }

      await User.create({
        name: application.name,
        email: application.email,
        passwordHash: application.password_hash,
        role: application.role,
        termsAccepted: true,
        panDocument: application.pan_document,
        aadharDocument: application.aadhar_document,
        graduationCertificate: application.graduation_certificate,
        createdBy: req.user.userId,
      });
    }

    const updated = await RoleApplication.review(application.id, {
      reviewedBy: req.user.userId,
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewNotes: notes,
    });

    return res.status(200).json({
      success: true,
      message: action === "APPROVE" ? "Application approved and account created" : "Application rejected",
      application: updated,
    });
  } catch (error) {
    console.error("Review application error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { submitApplication, listApplications, reviewApplication };
