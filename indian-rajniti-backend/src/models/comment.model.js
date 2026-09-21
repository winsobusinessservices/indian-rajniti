const pool = require("../config/db");

function mapComment(row) {
  if (!row) return row;
  return {
    id: row.id,
    authorId: row.author_id,
    author: row.author,
    postType: row.post_type,
    postId: row.post_id,
    postSlug: row.post_slug,
    postTitle: row.post_title,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hiddenAt: row.hidden_at,
  };
}

const SELECT_COMMENT = `
  SELECT c.*, u.name AS author
  FROM comments c
  JOIN users u ON u.id = c.author_id
`;

const Comment = {
  async create({ authorId, postType, postId, postSlug, postTitle, content }) {
    const [result] = await pool.query(
      `INSERT INTO comments
        (author_id, post_type, post_id, post_slug, post_title, content, status)
       VALUES (?, ?, ?, ?, ?, ?, 'VISIBLE')`,
      [authorId, postType, String(postId), postSlug, postTitle, content]
    );
    return Comment.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(`${SELECT_COMMENT} WHERE c.id = ? AND c.deleted_at IS NULL`, [id]);
    return mapComment(rows[0]);
  },

  async findForPost(postSlug, viewer = null) {
    const conditions = ["c.post_slug = ?", "c.deleted_at IS NULL"];
    const params = [postSlug];
    if (viewer?.role !== "ADMIN") {
      if (viewer?.userId) {
        conditions.push("(c.status = 'VISIBLE' OR c.author_id = ?)");
        params.push(viewer.userId);
      } else {
        conditions.push("c.status = 'VISIBLE'");
      }
    }
    const [rows] = await pool.query(
      `${SELECT_COMMENT} WHERE ${conditions.join(" AND ")} ORDER BY c.created_at DESC, c.id DESC`,
      params
    );
    return rows.map(mapComment);
  },

  async findAll() {
    const [rows] = await pool.query(`${SELECT_COMMENT} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC, c.id DESC`);
    return rows.map(mapComment);
  },

  async setHidden(id, hidden, adminId) {
    await pool.query(
      `UPDATE comments
       SET status = ?, hidden_by = ?, hidden_at = ?
       WHERE id = ?`,
      [hidden ? "HIDDEN" : "VISIBLE", hidden ? adminId : null, hidden ? new Date() : null, id]
    );
    return Comment.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query("DELETE FROM comments WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  async removeForPost(postType, postId) {
    await pool.query("DELETE FROM comments WHERE post_type = ? AND post_id = ?", [postType, String(postId)]);
  },
};

module.exports = Comment;
