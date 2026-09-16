const express = require("express");
const {
  listCategories, listVisibilitySettings, createCategory, updateCategoryVisibility, updateSectionVisibility, deleteCategory,
} = require("../controllers/categories/categories.controller");
const { authenticate, authorizePermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../config/permissions");

const router = express.Router();

router.get("/categories", listCategories);
router.get("/admin/ui-visibility", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), listVisibilitySettings);
router.post("/categories", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), createCategory);
router.patch("/categories/:id/visibility", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), updateCategoryVisibility);
router.patch("/admin/ui-sections/:key/visibility", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), updateSectionVisibility);
router.delete("/categories/:id", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), deleteCategory);

module.exports = router;
