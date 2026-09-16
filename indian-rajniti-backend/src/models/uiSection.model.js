const pool = require("../config/db");

const UiSection = {
  async findAll() {
    const [rows] = await pool.query(
      "SELECT section_key, label, is_visible, updated_at FROM ui_sections ORDER BY label ASC"
    );
    return rows;
  },

  async visibilityMap() {
    const rows = await UiSection.findAll();
    return Object.fromEntries(rows.map((row) => [row.section_key, Boolean(row.is_visible)]));
  },

  async setVisibility(sectionKey, isVisible, updatedBy) {
    const [result] = await pool.query(
      "UPDATE ui_sections SET is_visible = ?, updated_by = ? WHERE section_key = ?",
      [isVisible ? 1 : 0, updatedBy, sectionKey]
    );
    if (!result.affectedRows) return null;
    const [rows] = await pool.query(
      "SELECT section_key, label, is_visible, updated_at FROM ui_sections WHERE section_key = ?",
      [sectionKey]
    );
    return rows[0];
  },
};

module.exports = UiSection;
