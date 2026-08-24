const pool = require("../config/db");

const TABLE = "states";
const COLUMNS = "id, slug, name, capital, kind, formed, history, achievements, sort_order";

const State = {
  async findAll() {
    const [rows] = await pool.query(`SELECT ${COLUMNS} FROM ${TABLE} ORDER BY sort_order ASC, id ASC`);
    return rows;
  },

  async findBySlug(slug) {
    const [rows] = await pool.query(`SELECT ${COLUMNS} FROM ${TABLE} WHERE slug = ?`, [slug]);
    return rows[0];
  },

  async upsert({ slug, name, capital, kind, formed, history, achievements, sortOrder }) {
    await pool.query(
      `INSERT INTO ${TABLE} (slug, name, capital, kind, formed, history, achievements, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), capital = VALUES(capital), kind = VALUES(kind),
         formed = VALUES(formed), history = VALUES(history), achievements = VALUES(achievements), sort_order = VALUES(sort_order)`,
      [slug, name, capital, kind, formed ?? null, history ?? null, achievements ?? null, sortOrder ?? 0]
    );
  },
};

module.exports = State;
