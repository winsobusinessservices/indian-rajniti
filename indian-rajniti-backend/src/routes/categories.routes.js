const express = require("express");
const { listCategories, createCategory, deleteCategory } = require("../controllers/categories/categories.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/categories", listCategories);
router.post("/categories", authenticate, authorize("ADMIN"), createCategory);
router.delete("/categories/:id", authenticate, authorize("ADMIN"), deleteCategory);

module.exports = router;
