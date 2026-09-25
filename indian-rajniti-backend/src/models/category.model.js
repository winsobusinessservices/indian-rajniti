const pool = require("../config/db");
const { slugify, uniqueSlug } = require("../utils/slugify");

const TABLE = "categories";
const RESERVED_ROOT_SLUGS = [
  "about", "ad-choices", "advertise-with-us", "advertize-with-us", "api", "author", "blogs", "careers",
  "category", "cm", "connect-as-a-sponsor", "contact", "cookie-policy", "editorial-team", "elections",
  "ethics-code", "forgot-password", "former-prime-ministers", "investors", "key-political-figures", "login",
  "loksabha", "more", "news", "parties", "policies", "political-calendar", "press-conferences",
  "privacy-policy", "rajyasabha", "rallies", "register", "reset-password", "search", "speeches", "state",
  "terms-of-service", "top-news", "trending", "videos",
];

const Category = {
  async findAll({ includeHidden = false, siteId = 1 } = {}) {
    const [rows] = await pool.query(
      `SELECT id, name, slug, is_visible, content, canonical_slug, created_by, created_at FROM ${TABLE}
       WHERE deleted_at IS NULL AND site_id = ? ${includeHidden ? "" : "AND is_visible = 1"} ORDER BY name ASC`, [siteId]
    );
    return rows;
  },

  async findHiddenNames(siteId = 1) {
    const [rows] = await pool.query(`SELECT name FROM ${TABLE} WHERE is_visible = 0 AND site_id = ? AND deleted_at IS NULL`, [siteId]);
    return rows.map((row) => row.name);
  },

  async findById(id, siteId = null) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? AND deleted_at IS NULL${siteId ? " AND site_id = ?" : ""}`, siteId ? [id, siteId] : [id]);
    return rows[0];
  },

  async findByName(name, siteId = 1) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(name) = LOWER(?) AND site_id = ? AND deleted_at IS NULL`, [name, siteId]);
    return rows[0];
  },

  async findBySlug(slug, siteId = 1) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE slug = ? AND site_id = ? AND deleted_at IS NULL`, [slug, siteId]);
    return rows[0];
  },

  async findReservedRoutes(siteId = 1) {
    const [[parties], [politicians], [states]] = await Promise.all([
      pool.query("SELECT slug, name, abbreviation FROM parties WHERE site_id = ? AND deleted_at IS NULL", [siteId]),
      pool.query("SELECT slug, name FROM politicians WHERE site_id = ? AND deleted_at IS NULL", [siteId]),
      pool.query("SELECT slug, name FROM states WHERE site_id = ? AND deleted_at IS NULL", [siteId]),
    ]);
    const routes = new Map(RESERVED_ROOT_SLUGS.map((slug) => [slug, {
      type: "existing website page", name: `/${slug}`, section: null,
    }]));
    const add = (values, owner) => values.filter(Boolean).forEach((value) => routes.set(slugify(value), owner));
    parties.forEach((item) => add([item.slug, item.name, item.abbreviation], {
      type: "political party", name: item.name, section: "Parties",
    }));
    politicians.forEach((item) => add([item.slug, item.name], {
      type: "political leader", name: item.name, section: "Politicians",
    }));
    states.forEach((item) => add([item.slug, item.name], {
      type: "state or union territory", name: item.name, section: "States & Assemblies",
    }));
    return routes;
  },

  async create({ name, content = null, canonicalSlug = null, isVisible = true, createdBy, siteId = 1 }) {
    const slug = await uniqueSlug(name, async (candidate) => {
      const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE slug = ? AND site_id = ?`, [candidate, siteId]);
      return Boolean(rows[0]);
    });
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (name, slug, content, canonical_slug, is_visible, created_by, site_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, content, canonicalSlug, isVisible ? 1 : 0, createdBy ?? null, siteId]
    );
    return Category.findById(result.insertId, siteId);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async setVisibility(id, isVisible, siteId) {
    const [result] = await pool.query(`UPDATE ${TABLE} SET is_visible = ? WHERE id = ? AND site_id = ?`, [isVisible ? 1 : 0, id, siteId]);
    return result.affectedRows > 0 ? Category.findById(id, siteId) : null;
  },

  async updatePageSettings(id, { content, canonicalSlug }, siteId) {
    const [result] = await pool.query(`UPDATE ${TABLE} SET content = ?, canonical_slug = ? WHERE id = ? AND site_id = ?`, [content, canonicalSlug, id, siteId]);
    return result.affectedRows > 0 ? Category.findById(id, siteId) : null;
  },
};

module.exports = Category;
