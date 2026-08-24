const Category = require("../../models/category.model");

const listCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("List categories error:", error);
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

module.exports = { listCategories, createCategory, deleteCategory };
