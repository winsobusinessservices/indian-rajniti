const pool = require("../config/db");
const { normalizePermissions } = require("../config/permissions");

const ROLES = ["USER", "ADMIN", "SUBADMIN", "EDITOR", "AUTHOR", "INVESTOR"];

const PUBLIC_COLUMNS =
  "id, name, email, phone, role, permissions, status, site_id, (SELECT s.name FROM sites s WHERE s.id = users.site_id) AS site_name, (SELECT s.slug FROM sites s WHERE s.id = users.site_id) AS site_slug, (SELECT s.domain FROM sites s WHERE s.id = users.site_id) AS site_domain, (SELECT s.status FROM sites s WHERE s.id = users.site_id) AS site_status, created_at, terms_accepted, terms_accepted_at, accepted_policy_ids, pan_document, aadhar_document, graduation_certificate, created_by, deleted_at, deleted_by, delete_reason";

function parseUser(row) {
  if (!row) return null;
  let acceptedPolicyIds = row.accepted_policy_ids;
  if (typeof acceptedPolicyIds === "string") {
    try { acceptedPolicyIds = JSON.parse(acceptedPolicyIds); } catch { acceptedPolicyIds = []; }
  }
  return {
    ...row,
    permissions: normalizePermissions(row.permissions, row.role),
    accepted_policy_ids: Array.isArray(acceptedPolicyIds) ? acceptedPolicyIds : [],
  };
}

const User = {
  ROLES,

  async findByEmail(email) {
    const [rows] = await pool.query("SELECT users.*, s.name AS site_name, s.slug AS site_slug, s.domain AS site_domain, s.status AS site_status FROM users LEFT JOIN sites s ON s.id = users.site_id WHERE users.email = ?", [email]);
    return parseUser(rows[0]);
  },

  async findByGoogleSub(googleSub) {
    const [rows] = await pool.query("SELECT users.*, s.name AS site_name, s.slug AS site_slug, s.domain AS site_domain, s.status AS site_status FROM users LEFT JOIN sites s ON s.id = users.site_id WHERE users.google_sub = ?", [googleSub]);
    return parseUser(rows[0]);
  },

  async linkGoogleAccount(id, googleSub) {
    await pool.query("UPDATE users SET google_sub = ? WHERE id = ?", [googleSub, id]);
    return User.findById(id);
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return parseUser(rows[0]);
  },

  async findByIdWithPassword(id) {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL", [id]);
    return parseUser(rows[0]);
  },

  async updatePassword(id, passwordHash) {
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      id,
    ]);
  },

  async findByPhone(phone) {
    const [rows] = await pool.query("SELECT users.*, s.name AS site_name, s.slug AS site_slug, s.domain AS site_domain, s.status AS site_status FROM users LEFT JOIN sites s ON s.id = users.site_id WHERE users.phone = ?", [phone]);
    return parseUser(rows[0]);
  },

  async reactivateDeletedRegistration(id, {
    name,
    phone = null,
    passwordHash,
    googleSub = null,
    acceptedPolicyIds = [],
    siteId = 1,
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `UPDATE users SET
          name = ?, phone = ?, password_hash = ?, google_sub = ?, role = 'USER', permissions = NULL,
          status = 'ACTIVE', terms_accepted = 1, terms_accepted_at = NOW(),
          accepted_policy_ids = ?, pan_document = NULL, aadhar_document = NULL,
          graduation_certificate = NULL, created_by = NULL, site_id = ?,
          deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
         WHERE id = ? AND deleted_at IS NOT NULL`,
        [name, phone, passwordHash, googleSub, JSON.stringify(acceptedPolicyIds), siteId, id]
      );
      if (!result.affectedRows) {
        await connection.rollback();
        return null;
      }
      await connection.query(
        `UPDATE deletion_audit SET restored_at = NOW(), restored_by = NULL
         WHERE entity_type = 'USER' AND entity_id = ?
           AND restored_at IS NULL AND permanently_deleted_at IS NULL`,
        [String(id)]
      );
      await connection.commit();
      return User.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async findAll({ siteId, includeDeleted = false } = {}) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE ${includeDeleted ? "1 = 1" : "deleted_at IS NULL"}${siteId ? " AND site_id = ?" : ""} ORDER BY created_at DESC`,
      siteId ? [siteId] : []
    );
    return rows.map(parseUser);
  },

  async getEditorAssignments() {
    const [rows] = await pool.query(
      `SELECT assignment.author_id, assignment.editor_id, editor.name AS editor_name
       FROM editor_author_assignments assignment
       INNER JOIN users editor ON editor.id = assignment.editor_id AND editor.deleted_at IS NULL`
    );
    return rows;
  },

  async getAssignedAuthorIds(editorId) {
    const [rows] = await pool.query(
      "SELECT author_id FROM editor_author_assignments WHERE editor_id = ?",
      [editorId]
    );
    return rows.map((row) => Number(row.author_id));
  },

  async isAuthorAssignedToEditor(authorId, editorId) {
    const [rows] = await pool.query(
      "SELECT 1 FROM editor_author_assignments WHERE author_id = ? AND editor_id = ? LIMIT 1",
      [authorId, editorId]
    );
    return rows.length > 0;
  },

  async setAssignedEditor({ authorId, editorId, assignedBy }) {
    if (editorId === null) {
      await pool.query("DELETE FROM editor_author_assignments WHERE author_id = ?", [authorId]);
      return null;
    }
    await pool.query(
      `INSERT INTO editor_author_assignments (author_id, editor_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE editor_id = VALUES(editor_id), assigned_by = VALUES(assigned_by)`,
      [authorId, editorId, assignedBy]
    );
    return { authorId: Number(authorId), editorId: Number(editorId) };
  },

  async clearEditorAssignmentsForUser(userId) {
    await pool.query(
      "DELETE FROM editor_author_assignments WHERE author_id = ? OR editor_id = ?",
      [userId, userId]
    );
  },

  async updateRole(id, role) {
    await pool.query("UPDATE users SET role = ?, permissions = NULL WHERE id = ?", [role, id]);
    return User.findById(id);
  },

  // Combined name/email/role/document editor backing the Team Members table
  // and the admin role-assignment flow — only touches whichever fields are
  // actually passed in.
  async update(id, { name, email, role, status, permissions, siteId, panDocument, aadharDocument, graduationCertificate } = {}) {
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
    if (status !== undefined) {
      sets.push("status = ?");
      params.push(status);
    }
    if (permissions !== undefined) {
      sets.push("permissions = ?");
      params.push(JSON.stringify(normalizePermissions(permissions, role)));
    }
    if (siteId !== undefined) {
      sets.push("site_id = ?");
      params.push(siteId);
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
    phone = null,
    passwordHash,
    googleSub = null,
    role = "USER",
    termsAccepted = false,
    acceptedPolicyIds = [],
    panDocument = null,
    aadharDocument = null,
    graduationCertificate = null,
    createdBy = null,
    permissions = null,
    siteId = 1,
  }) {
    const [result] = await pool.query(
      `INSERT INTO users
        (name, email, phone, password_hash, google_sub, role, permissions, status, terms_accepted, terms_accepted_at, accepted_policy_ids, pan_document, aadhar_document, graduation_certificate, created_by, site_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone,
        passwordHash,
        googleSub,
        role,
        permissions === null ? null : JSON.stringify(normalizePermissions(permissions, role)),
        "ACTIVE",
        termsAccepted,
        termsAccepted ? new Date() : null,
        JSON.stringify(acceptedPolicyIds),
        panDocument,
        aadharDocument,
        graduationCertificate,
        createdBy,
        siteId,
      ]
    );
    return User.findById(result.insertId);
  },
};

module.exports = User;
