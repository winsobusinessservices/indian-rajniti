const Site = require("../models/site.model");

async function resolveSite(req, res, next) {
  try {
    const site = await Site.findBySlug(process.env.DEFAULT_SITE_SLUG || "indian-rajneeti");
    if (!site) return res.status(503).json({ success: false, message: "No active website is configured" });
    req.site = site;
    next();
  } catch (error) {
    console.error("Resolve site error:", error);
    return res.status(500).json({ success: false, message: "Website could not be resolved" });
  }
}

module.exports = { resolveSite };
