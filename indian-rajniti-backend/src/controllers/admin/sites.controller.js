const Site = require("../../models/site.model");
const UiSection = require("../../models/uiSection.model");
const { fileUrl } = require("../../middleware/upload.middleware");

const parsedArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const cleanSocialLinks = (value) => parsedArray(value)
  .map((item) => ({ label: String(item?.label || "").trim(), url: String(item?.url || "").trim() }))
  .filter((item) => item.label && /^https?:\/\//i.test(item.url))
  .slice(0, 12);

const booleanValue = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (["true", "1", "on"].includes(String(value).toLowerCase())) return true;
  if (["false", "0", "off"].includes(String(value).toLowerCase())) return false;
  return fallback;
};

const uploadedImage = (req, field) => req.files?.[field]?.[0]
  ? fileUrl("sites", req.files[field][0])
  : null;

async function listSites(req, res) {
  try {
    const site = await Site.findBySlug(process.env.DEFAULT_SITE_SLUG || "indian-rajneeti");
    return res.json({ success: true, sites: site ? [site] : [] });
  } catch (error) {
    console.error("List sites error:", error);
    return res.status(500).json({ success: false, message: "Unable to load websites" });
  }
}

async function currentSite(req, res) {
  return res.json({ success: true, site: req.site });
}

async function siteFeatures(req, res) {
  try {
    const site = await Site.findBySlug(process.env.DEFAULT_SITE_SLUG || "indian-rajneeti");
    if (!site) return res.status(404).json({ success: false, message: "Website not found" });
    const visibility = await UiSection.visibilityMap(site.id);
    const features = Object.fromEntries(Object.entries(visibility).filter(([key]) => key.startsWith("feature_")));
    return res.json({ success: true, site, features });
  } catch (error) {
    console.error("Load site features error:", error);
    return res.status(500).json({ success: false, message: "Unable to load website features" });
  }
}

async function updateSiteSettings(req, res) {
  try {
    const site = await Site.findBySlug(process.env.DEFAULT_SITE_SLUG || "indian-rajneeti");
    if (!site) return res.status(404).json({ success: false, message: "Indian Rajneeti website settings were not found" });

    const name = String(req.body.name || "").trim();
    const primaryColor = String(req.body.primaryColor || site.primary_color || "#002068").trim();
    const secondaryColor = String(req.body.secondaryColor || site.secondary_color || "#8f4e00").trim();
    if (!name) return res.status(400).json({ success: false, message: "Website name is required" });
    if (!/^#[0-9a-f]{6}$/i.test(primaryColor) || !/^#[0-9a-f]{6}$/i.test(secondaryColor)) {
      return res.status(400).json({ success: false, message: "Theme colours must use a six-digit hex value" });
    }

    const updated = await Site.updateSettings(site.id, {
      name,
      subtitle: String(req.body.subtitle || "").trim(),
      description: String(req.body.description || "").trim(),
      logoUrl: uploadedImage(req, "logoFile") || site.logo_url,
      iconUrl: uploadedImage(req, "iconFile") || site.icon_url,
      primaryColor,
      secondaryColor,
      socialLinks: req.body.socialLinks === undefined ? parsedArray(site.social_links) : cleanSocialLinks(req.body.socialLinks),
      servicesEnabled: booleanValue(req.body.servicesEnabled, Boolean(site.services_enabled)),
    });
    return res.json({ success: true, message: "Website settings saved", site: updated });
  } catch (error) {
    console.error("Update website settings error:", error);
    return res.status(500).json({ success: false, message: "Unable to save website settings" });
  }
}

module.exports = { listSites, currentSite, siteFeatures, updateSiteSettings };
