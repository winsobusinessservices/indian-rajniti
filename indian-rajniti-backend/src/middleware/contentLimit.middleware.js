const pool = require("../config/db");

const TABLE_BY_TYPE = {
  ARTICLE: "articles",
  BLOG: "blogs",
  VIDEO: "videos",
};

const DAILY_LIMITS = {
  AUTHOR: {
    ARTICLE: 5,
    BLOG: 5,
    VIDEO: 2,
  },
  EDITOR: {
    ARTICLE: 10,
    BLOG: 10,
    VIDEO: 5,
  },
};

const TYPE_LABEL = {
  ARTICLE: "articles",
  BLOG: "blogs",
  VIDEO: "videos",
};

async function enforceDailyContentLimit(req, res, next) {
  const type = req.contentType;
  const limit = DAILY_LIMITS[req.user.role]?.[type];

  // Only authors and editors have daily posting limits. Admins and any role
  // added later retain their existing permission-driven behaviour.
  if (!limit) return next();

  try {
    const table = TABLE_BY_TYPE[type];
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ${table}
       WHERE author_id = ?
         AND created_at >= CURRENT_DATE
         AND created_at < CURRENT_DATE + INTERVAL 1 DAY`,
      [req.user.userId]
    );

    const used = Number(rows[0]?.total || 0);
    if (used >= limit) {
      return res.status(429).json({
        success: false,
        message: `Daily limit reached. ${req.user.role === "AUTHOR" ? "Authors" : "Editors"} can create up to ${limit} ${TYPE_LABEL[type]} per day.`,
        dailyLimit: {
          type,
          limit,
          used,
          remaining: 0,
        },
      });
    }

    return next();
  } catch (error) {
    console.error(`Daily ${type} limit check error:`, error);
    return res.status(500).json({ success: false, message: "Unable to check the daily posting limit" });
  }
}

module.exports = { DAILY_LIMITS, enforceDailyContentLimit };
