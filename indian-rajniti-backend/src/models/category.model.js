const pool = require("../config/db");
const { uniqueSlug } = require("../utils/slugify");

const TABLE = "categories";

const Category = {
  async findAll({ includeHidden = false } = {}) {
    const [rows] = await pool.query(
      `SELECT id, name, slug, is_visible, created_by, created_at FROM ${TABLE}
       ${includeHidden ? "" : "WHERE is_visible = 1"} ORDER BY name ASC`
    );
    return rows;
  },

  async findHiddenNames() {
    const [rows] = await pool.query(`SELECT name FROM ${TABLE} WHERE is_visible = 0`);
    return rows.map((row) => row.name);
  },

  async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
    return rows[0];
  },

  async findByName(name) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(name) = LOWER(?)`, [name]);
    return rows[0];
  },

  async create({ name, createdBy }) {
    const slug = await uniqueSlug(name, async (candidate) => {
      const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE slug = ?`, [candidate]);
      return Boolean(rows[0]);
    });
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (name, slug, created_by) VALUES (?, ?, ?)`,
      [name, slug, createdBy ?? null]
    );
    return Category.findById(result.insertId);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async setVisibility(id, isVisible) {
    const [result] = await pool.query(`UPDATE ${TABLE} SET is_visible = ? WHERE id = ?`, [isVisible ? 1 : 0, id]);
    return result.affectedRows > 0 ? Category.findById(id) : null;
  },
};

module.exports = Category;
