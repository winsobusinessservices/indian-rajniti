const express = require("express");
const { listCategories, createCategory, deleteCategory } = require("../controllers/categories/categories.controller");
const { authenticate, authorizePermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../config/permissions");

const router = express.Router();

router.get("/categories", listCategories);
router.post("/categories", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), createCategory);
router.delete("/categories/:id", authenticate, authorizePermission(PERMISSIONS.MANAGE_CATEGORIES), deleteCategory);

module.exports = router;
