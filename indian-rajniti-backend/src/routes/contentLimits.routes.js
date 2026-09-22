const express = require("express");
const { getContentLimits, getMyContentLimitStatus, updateContentLimits } = require("../controllers/admin/contentLimits.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/content-limits/me", authenticate, getMyContentLimitStatus);
router.get("/admin/content-limits", authenticate, authorize("ADMIN"), getContentLimits);
router.put("/admin/content-limits", authenticate, authorize("ADMIN"), updateContentLimits);

module.exports = router;
