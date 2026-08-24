const pool = require("../config/db");
const { uniqueSlug } = require("../utils/slugify");

const TABLE = "categories";

const Category = {
  async findAll() {
    const [rows] = await pool.query(
      `SELECT id, name, slug, created_by, created_at FROM ${TABLE} ORDER BY name ASC`
    );
    return rows;
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
};

module.exports = Category;
