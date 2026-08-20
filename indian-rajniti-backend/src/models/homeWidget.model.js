// Key/value store for every homepage "widget" that isn't a slug-bearing post
// — hero slides, election results, poll of the day, follow-us links, etc.
// Each row is one JSON blob keyed by widget_key, so adding a new widget never
// requires a schema migration.
const pool = require("../config/db");

const TABLE = "home_widgets";

const HomeWidget = {
  // `data` is a genuine JSON-typed column, so mysql2 already decodes it to
  // the right JS value (string/array/object) — no manual JSON.parse needed,
  // and calling it anyway breaks on widgets whose payload is itself a bare
  // string (e.g. breaking_news), since that comes back already unwrapped.
  async getAll() {
    const [rows] = await pool.query(`SELECT widget_key, data FROM ${TABLE}`);
    const widgets = {};
    rows.forEach((row) => {
      widgets[row.widget_key] = row.data;
    });
    return widgets;
  },

  async upsert(widgetKey, data) {
    await pool.query(
      `INSERT INTO ${TABLE} (widget_key, data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [widgetKey, JSON.stringify(data)]
    );
  },
};

module.exports = HomeWidget;
