// Reads `wplh_postmeta` — the legacy WordPress meta table (standard wp_postmeta
// shape: meta_id, post_id, meta_key, meta_value) paired with `wplh_posts`.
const pool = require("../../config/db");

const TABLE = "wplh_postmeta";

const WpPostMeta = {
  async findByPostId(postId) {
    const [rows] = await pool.query(
      `SELECT meta_key, meta_value FROM ${TABLE} WHERE post_id = ?`,
      [postId]
    );
    return rows;
  },

  async findValue(postId, metaKey) {
    const [rows] = await pool.query(
      `SELECT meta_value FROM ${TABLE} WHERE post_id = ? AND meta_key = ? LIMIT 1`,
      [postId, metaKey]
    );
    return rows[0]?.meta_value ?? null;
  },

  // Bulk lookup: { [postId]: metaValue } for a single meta_key across many posts at once.
  async findValuesForPosts(postIds, metaKey) {
    if (!postIds.length) return {};
    const [rows] = await pool.query(
      `SELECT post_id, meta_value FROM ${TABLE} WHERE meta_key = ? AND post_id IN (?)`,
      [metaKey, postIds]
    );
    return rows.reduce((map, row) => {
      map[row.post_id] = row.meta_value;
      return map;
    }, {});
  },
};

module.exports = WpPostMeta;
