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
  async findAll({ includeHidden = false } = {}) {
    const [rows] = await pool.query(
      `SELECT id, name, slug, is_visible, content, created_by, created_at FROM ${TABLE}
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

  async findReservedRoutes() {
    const [[parties], [politicians], [states]] = await Promise.all([
      pool.query("SELECT slug, name, abbreviation FROM parties"),
      pool.query("SELECT slug, name FROM politicians"),
      pool.query("SELECT slug, name FROM states"),
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

  async create({ name, content = null, isVisible = true, createdBy }) {
    const slug = await uniqueSlug(name, async (candidate) => {
      const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE slug = ?`, [candidate]);
      return Boolean(rows[0]);
    });
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (name, slug, content, is_visible, created_by) VALUES (?, ?, ?, ?, ?)`,
      [name, slug, content, isVisible ? 1 : 0, createdBy ?? null]
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

  async updateContent(id, content) {
    const [result] = await pool.query(`UPDATE ${TABLE} SET content = ? WHERE id = ?`, [content, id]);
    return result.affectedRows > 0 ? Category.findById(id) : null;
  },
};

module.exports = Category;
