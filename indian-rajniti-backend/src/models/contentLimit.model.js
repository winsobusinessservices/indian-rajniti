const pool = require("../config/db");

const DEFAULT_LIMITS = Object.freeze({
  AUTHOR: Object.freeze({ ARTICLE: 5, BLOG: 5, VIDEO: 2 }),
  EDITOR: Object.freeze({ ARTICLE: 10, BLOG: 10, VIDEO: 5 }),
});

const ROLES = ["AUTHOR", "EDITOR"];
const CONTENT_TYPES = ["ARTICLE", "BLOG", "VIDEO"];

function defaultsCopy() {
  return Object.fromEntries(
    ROLES.map((role) => [role, { ...DEFAULT_LIMITS[role] }])
  );
}

const ContentLimit = {
  async getAll() {
    const limits = defaultsCopy();
    const [rows] = await pool.query(
      "SELECT role, content_type, daily_limit FROM content_daily_limits"
    );
    for (const row of rows) {
      if (limits[row.role] && CONTENT_TYPES.includes(row.content_type)) {
        limits[row.role][row.content_type] = Number(row.daily_limit);
      }
    }
    return limits;
  },

  async get(role, contentType) {
    const [rows] = await pool.query(
      `SELECT daily_limit FROM content_daily_limits
       WHERE role = ? AND content_type = ?`,
      [role, contentType]
    );
    return rows.length ? Number(rows[0].daily_limit) : DEFAULT_LIMITS[role]?.[contentType];
  },

  async setAll(limits, updatedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const role of ROLES) {
        for (const contentType of CONTENT_TYPES) {
          await connection.query(
            `INSERT INTO content_daily_limits (role, content_type, daily_limit, updated_by)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE daily_limit = VALUES(daily_limit), updated_by = VALUES(updated_by)`,
            [role, contentType, limits[role][contentType], updatedBy]
          );
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return ContentLimit.getAll();
  },
};

module.exports = { ContentLimit, DEFAULT_LIMITS, ROLES, CONTENT_TYPES };

