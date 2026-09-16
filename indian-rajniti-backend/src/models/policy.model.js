const pool = require("../config/db");
const { uniqueSlug } = require("../utils/slugify");

const TABLE = "policies";
const SELECT = `
  SELECT p.id, p.slug, p.title, p.policy_type, p.summary, p.content, p.status, p.show_on_registration,
         p.created_by, p.published_at, p.created_at, p.updated_at,
         u.name AS created_by_name
  FROM ${TABLE} p
  JOIN users u ON u.id = p.created_by`;

const Policy = {
  async findAll({ publishedOnly = false } = {}) {
    const where = publishedOnly ? "WHERE p.status = 'PUBLISHED' AND p.published_at <= NOW()" : "";
    const [rows] = await pool.query(
      `${SELECT} ${where}
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC`
    );
    return rows;
  },

  async findRegistrationPolicies() {
    const [rows] = await pool.query(
      `${SELECT}
       WHERE p.status = 'PUBLISHED' AND p.show_on_registration = 1 AND p.published_at <= NOW()
       ORDER BY p.published_at ASC, p.id ASC`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(`${SELECT} WHERE p.id = ?`, [id]);
    return rows[0];
  },

  async findBySlug(slug, { publishedOnly = false } = {}) {
    const statusClause = publishedOnly ? "AND p.status = 'PUBLISHED' AND p.published_at <= NOW()" : "";
    const [rows] = await pool.query(`${SELECT} WHERE p.slug = ? ${statusClause}`, [slug]);
    return rows[0];
  },

  async create({ title, policyType, summary, content, status, showOnRegistration, createdBy }) {
    const slug = await uniqueSlug(title, async (candidate) => Boolean(await Policy.findBySlug(candidate)));
    const publishedAt = status === "PUBLISHED" ? new Date() : null;
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (slug, title, policy_type, summary, content, status, show_on_registration, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, policyType, summary, content, status, showOnRegistration ? 1 : 0, createdBy, publishedAt]
    );
    return Policy.findById(result.insertId);
  },

  async update(id, { title, policyType, summary, content, status, showOnRegistration }) {
    const current = await Policy.findById(id);
    if (!current) return null;
    let slug = current.slug;
    if (title !== current.title) {
      slug = await uniqueSlug(title, async (candidate) => {
        const match = await Policy.findBySlug(candidate);
        return Boolean(match && Number(match.id) !== Number(id));
      });
    }
    const publishedAt = status === "PUBLISHED" ? (current.published_at || new Date()) : null;
    await pool.query(
      `UPDATE ${TABLE}
       SET slug = ?, title = ?, policy_type = ?, summary = ?, content = ?, status = ?, show_on_registration = ?, published_at = ?
       WHERE id = ?`,
      [slug, title, policyType, summary, content, status, showOnRegistration ? 1 : 0, publishedAt, id]
    );
    return Policy.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Policy;
