const pool = require("../config/db");

const Site = {
  async findById(id) {
    const [rows] = await pool.query("SELECT * FROM sites WHERE id = ?", [id]);
    return rows[0] || null;
  },
  async findBySlug(slug) {
    const [rows] = await pool.query("SELECT * FROM sites WHERE slug = ? AND status = 'ACTIVE'", [slug]);
    return rows[0] || null;
  },
  async updateSettings(id, data) {
    await pool.query(
      `UPDATE sites
       SET name = ?, subtitle = ?, description = ?, logo_url = ?, icon_url = ?,
           primary_color = ?, secondary_color = ?, social_links = ?, services_enabled = ?
       WHERE id = ?`,
      [
        data.name,
        data.subtitle || null,
        data.description || null,
        data.logoUrl || null,
        data.iconUrl || null,
        data.primaryColor,
        data.secondaryColor,
        JSON.stringify(data.socialLinks || []),
        data.servicesEnabled ? 1 : 0,
        id,
      ]
    );
    return Site.findById(id);
  },
};

module.exports = Site;
