const pool = require("../config/db");
const { normalizePermissions } = require("../config/permissions");

const ROLES = ["USER", "ADMIN", "EDITOR", "AUTHOR", "INVESTOR"];

const PUBLIC_COLUMNS =
  "id, name, email, role, permissions, status, created_at, terms_accepted, terms_accepted_at, pan_document, aadhar_document, graduation_certificate, created_by";

function parseUser(row) {
  if (!row) return null;
  return { ...row, permissions: normalizePermissions(row.permissions, row.role) };
}

const User = {
  ROLES,

  async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return parseUser(rows[0]);
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`,
      [id]
    );
    return parseUser(rows[0]);
  },

  async findByIdWithPassword(id) {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    return parseUser(rows[0]);
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
    return rows.map(parseUser);
  },

  async updateRole(id, role) {
    await pool.query("UPDATE users SET role = ?, permissions = NULL WHERE id = ?", [role, id]);
    return User.findById(id);
  },

  // Combined name/email/role/document editor backing the Team Members table
  // and the admin role-assignment flow — only touches whichever fields are
  // actually passed in.
  async update(id, { name, email, role, permissions, panDocument, aadharDocument, graduationCertificate } = {}) {
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
    if (permissions !== undefined) {
      sets.push("permissions = ?");
      params.push(JSON.stringify(normalizePermissions(permissions, role)));
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
    permissions = null,
  }) {
    const [result] = await pool.query(
      `INSERT INTO users
        (name, email, password_hash, role, permissions, status, terms_accepted, terms_accepted_at, pan_document, aadhar_document, graduation_certificate, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        passwordHash,
        role,
        permissions === null ? null : JSON.stringify(normalizePermissions(permissions, role)),
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
