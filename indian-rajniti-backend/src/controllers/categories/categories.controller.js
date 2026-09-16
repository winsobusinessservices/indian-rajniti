const Category = require("../../models/category.model");
const UiSection = require("../../models/uiSection.model");

const listCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("List categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listVisibilitySettings = async (req, res) => {
  try {
    const [categories, sections] = await Promise.all([
      Category.findAll({ includeHidden: true }),
      UiSection.findAll(),
    ]);
    return res.status(200).json({ success: true, categories, sections });
  } catch (error) {
    console.error("List visibility settings error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCategoryVisibility = async (req, res) => {
  try {
    if (typeof req.body.isVisible !== "boolean") {
      return res.status(400).json({ success: false, message: "isVisible must be true or false" });
    }
    const category = await Category.setVisibility(req.params.id, req.body.isVisible);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: `Category ${req.body.isVisible ? "shown" : "hidden"}`, category });
  } catch (error) {
    console.error("Update category visibility error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateSectionVisibility = async (req, res) => {
  try {
    if (typeof req.body.isVisible !== "boolean") {
      return res.status(400).json({ success: false, message: "isVisible must be true or false" });
    }
    const section = await UiSection.setVisibility(req.params.key, req.body.isVisible, req.user.userId);
    if (!section) return res.status(404).json({ success: false, message: "UI section not found" });
    return res.status(200).json({ success: true, message: `Section ${req.body.isVisible ? "shown" : "hidden"}`, section });
  } catch (error) {
    console.error("Update section visibility error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    if (name.length > 120) return res.status(400).json({ success: false, message: "Category name is too long" });
    if (await Category.findByName(name)) {
      return res.status(409).json({ success: false, message: "That category already exists" });
    }
    const category = await Category.create({ name, createdBy: req.user.userId });
    return res.status(201).json({ success: true, message: "Category created", category });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "That category already exists" });
    console.error("Create category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const removed = await Category.remove(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  listCategories,
  listVisibilitySettings,
  createCategory,
  updateCategoryVisibility,
  updateSectionVisibility,
  deleteCategory,
};
