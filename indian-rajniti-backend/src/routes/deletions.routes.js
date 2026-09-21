const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const {
  listDeletions,
  restoreDeletion,
  permanentlyDelete,
} = require("../controllers/admin/deletions.controller");

const router = express.Router();

router.get("/admin/deletions", authenticate, authorize("ADMIN"), listDeletions);
router.patch("/admin/deletions/:id/restore", authenticate, authorize("ADMIN"), restoreDeletion);
router.delete("/admin/deletions/:id/permanent", authenticate, authorize("ADMIN"), permanentlyDelete);

module.exports = router;
