const pool = require("../config/db");

const ROLES = ["USER", "ADMIN", "EDITOR", "AUTHOR", "INVESTOR"];

const PUBLIC_COLUMNS =
  "id, name, email, role, status, created_at, terms_accepted, terms_accepted_at, pan_document, aadhar_document, graduation_certificate, created_by";

const User = {
  ROLES,

  async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByIdWithPassword(id) {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async updatePassword(id, passwordHash) {
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      id,
    ]);
  },

  async findAll() {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`
    );
    return rows;
  },

  async updateRole(id, role) {
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    return User.findById(id);
  },

  // Combined name/email/role/document editor backing the Team Members table
  // and the admin role-assignment flow — only touches whichever fields are
  // actually passed in.
  async update(id, { name, email, role, panDocument, aadharDocument, graduationCertificate } = {}) {
    const sets = [];
    const params = [];
    if (name !== undefined) {
      sets.push("name = ?");
      params.push(name);
    }
    if (email !== undefined) {
      sets.push("email = ?");
      params.push(email);
    }
    if (role !== undefined) {
      sets.push("role = ?");
      params.push(role);
    }
    if (panDocument !== undefined) {
      sets.push("pan_document = ?");
      params.push(panDocument);
    }
    if (aadharDocument !== undefined) {
      sets.push("aadhar_document = ?");
      params.push(aadharDocument);
    }
    if (graduationCertificate !== undefined) {
      sets.push("graduation_certificate = ?");
      params.push(graduationCertificate);
    }
    if (sets.length) {
      params.push(id);
      await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    }
    return User.findById(id);
  },

  async delete(id) {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
  },

  async create({
    name,
    email,
    passwordHash,
    role = "USER",
    termsAccepted = false,
    panDocument = null,
    aadharDocument = null,
    graduationCertificate = null,
    createdBy = null,
  }) {
    const [result] = await pool.query(
      `INSERT INTO users
        (name, email, password_hash, role, status, terms_accepted, terms_accepted_at, pan_document, aadhar_document, graduation_certificate, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        passwordHash,
        role,
        "ACTIVE",
        termsAccepted,
        termsAccepted ? new Date() : null,
        panDocument,
        aadharDocument,
        graduationCertificate,
        createdBy,
      ]
    );
    return User.findById(result.insertId);
  },
};

module.exports = User;
