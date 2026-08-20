// Reads `wplh_posts` — the legacy WordPress posts table this app was migrated
// from (standard wp_posts shape, just with the "wplh_" table prefix instead
// of "wp_"). Featured images live in `wplh_postmeta` under the WordPress
// convention: a `_thumbnail_id` meta value points at an attachment row (a
// `wplh_posts` row with post_type = "attachment"), whose `guid` column holds
// the actual public image URL.
const pool = require("../../config/db");
const WpPostMeta = require("./wpPostMeta.model");

const TABLE = "wplh_posts";
const THUMBNAIL_META_KEY = "_thumbnail_id";

async function resolveFeaturedImageUrl(attachmentId) {
  if (!attachmentId) return null;
  const [rows] = await pool.query(`SELECT guid FROM ${TABLE} WHERE ID = ?`, [attachmentId]);
  return rows[0]?.guid ?? null;
}

// Attaches a `featured_image` URL (or null) to each post in one batched pair
// of queries, instead of a per-post round trip.
async function attachFeaturedImages(posts) {
  if (!posts.length) return posts;

  const postIds = posts.map((post) => post.ID);
  const thumbnailIdByPostId = await WpPostMeta.findValuesForPosts(postIds, THUMBNAIL_META_KEY);

  const attachmentIds = [...new Set(Object.values(thumbnailIdByPostId).filter(Boolean))];
  let guidByAttachmentId = {};

  if (attachmentIds.length) {
    const [attachments] = await pool.query(
      `SELECT ID, guid FROM ${TABLE} WHERE ID IN (?)`,
      [attachmentIds]
    );
    guidByAttachmentId = attachments.reduce((map, row) => {
      map[row.ID] = row.guid;
      return map;
    }, {});
  }

  return posts.map((post) => ({
    ...post,
    featured_image: guidByAttachmentId[thumbnailIdByPostId[post.ID]] ?? null,
  }));
}

const WpPost = {
  async findAll({ page = 1, limit = 10, status = "publish", type = "post" } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM ${TABLE} WHERE post_status = ? AND post_type = ? ORDER BY post_date DESC LIMIT ? OFFSET ?`,
      [status, type, Number(limit), Number(offset)]
    );
    return attachFeaturedImages(rows);
  },

  async count({ status = "publish", type = "post" } = {}) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${TABLE} WHERE post_status = ? AND post_type = ?`,
      [status, type]
    );
    return rows[0].total;
  },

  async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE ID = ?`, [id]);
    if (!rows[0]) return null;

    const thumbnailId = await WpPostMeta.findValue(id, THUMBNAIL_META_KEY);
    const featuredImage = await resolveFeaturedImageUrl(thumbnailId);
    return { ...rows[0], featured_image: featuredImage };
  },

  async findBySlug(slug) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE post_name = ?`, [slug]);
    if (!rows[0]) return null;

    const thumbnailId = await WpPostMeta.findValue(rows[0].ID, THUMBNAIL_META_KEY);
    const featuredImage = await resolveFeaturedImageUrl(thumbnailId);
    return { ...rows[0], featured_image: featuredImage };
  },
};

module.exports = WpPost;
