const router = require("express").Router();
const { authenticate, authorizePermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../config/permissions");
const { listSites, currentSite, siteFeatures, updateSiteSettings } = require("../controllers/admin/sites.controller");
const { uploadFields } = require("../middleware/upload.middleware");

const prepareSiteUpload = (req, res, next) => { req.contentType = "sites"; next(); };
const siteImageUpload = uploadFields([
  { name: "logoFile", maxCount: 1 },
  { name: "iconFile", maxCount: 1 },
]);

router.get("/sites/current", currentSite);
router.get("/admin/sites", authenticate, authorizePermission(PERMISSIONS.MANAGE_SERVICES, PERMISSIONS.TEAM_MEMBERS, PERMISSIONS.MANAGE_SITE_DATA, PERMISSIONS.MANAGE_SITE_MANAGEMENT), listSites);
router.get("/admin/site-features", authenticate, siteFeatures);
router.patch("/admin/site-settings", authenticate, authorizePermission(PERMISSIONS.MANAGE_SITE_MANAGEMENT), prepareSiteUpload, ...siteImageUpload, updateSiteSettings);
module.exports = router;
