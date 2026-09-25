const Category = require("../../models/category.model");
const DeletionAudit = require("../../models/deletionAudit.model");
const UiSection = require("../../models/uiSection.model");
const { slugify } = require("../../utils/slugify");
const { sanitizeRichText } = require("../../utils/richText");
const Party = require("../../models/party.model");
const Politician = require("../../models/politician.model");
const State = require("../../models/state.model");
const SiteReferenceVisibility = require("../../models/siteReferenceVisibility.model");

function withRouteOwners(categories, reservedRoutes) {
  return categories.map((category) => ({ ...category, route_owner: reservedRoutes.get(category.slug) || null }));
}

function reservedRouteMessage(routeOwner) {
  return routeOwner.section
    ? `This route belongs to the ${routeOwner.type} “${routeOwner.name}”. Edit it under Site Data > ${routeOwner.section}.`
    : `The route “${routeOwner.name}” is already used by an existing website page. Choose another category name.`;
}

function normalizeCanonicalSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\/+/, "")
    .replace(/^category\//, "")
    .replace(/\/+$/, "");
}

async function validateCanonicalSlug(value, ownSlug, siteId) {
  const canonicalSlug = normalizeCanonicalSlug(value);
  if (!canonicalSlug) return { canonicalSlug: null };
  if (canonicalSlug.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(canonicalSlug)) {
    return { error: "Use a valid target slug, for example inc or congress-politics" };
  }
  if (canonicalSlug === ownSlug) return { error: "A category cannot show content from itself" };

  const targetCategory = await Category.findBySlug(canonicalSlug, siteId);
  const targetRoute = (await Category.findReservedRoutes(siteId)).get(canonicalSlug);
  if (!targetCategory && !targetRoute) {
    return { error: `No public category, party, leader, or state uses /${canonicalSlug}` };
  }
  if (targetCategory?.canonical_slug === ownSlug) {
    return { error: "This target would create a circular URL alias" };
  }
  return { canonicalSlug };
}

const listCategories = async (req, res) => {
  try {
    const requestedSiteId = Number(req.query.siteId);
    const siteId = Number.isInteger(requestedSiteId) && requestedSiteId > 0 ? requestedSiteId : req.site.id;
    const [categories, reservedRoutes] = await Promise.all([Category.findAll({ siteId }), Category.findReservedRoutes(siteId)]);
    return res.status(200).json({ success: true, categories: withRouteOwners(categories, reservedRoutes) });
  } catch (error) {
    console.error("List categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listVisibilitySettings = async (req, res) => {
  try {
    const [categories, sections, reservedRoutes] = await Promise.all([
      Category.findAll({ includeHidden: true, siteId: req.user.role === "ADMIN" ? Number(req.query.siteId || req.get("x-management-site-id") || req.user.siteId) : req.user.siteId }),
      UiSection.findAll(req.user.role === "ADMIN" ? Number(req.query.siteId || req.get("x-management-site-id") || req.user.siteId) : req.user.siteId),
      Category.findReservedRoutes(req.user.role === "ADMIN" ? Number(req.query.siteId || req.get("x-management-site-id") || req.user.siteId) : req.user.siteId),
    ]);
    return res.status(200).json({ success: true, categories: withRouteOwners(categories, reservedRoutes), sections });
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
    const siteId = req.user.role === "ADMIN" ? Number(req.body.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    const category = await Category.setVisibility(req.params.id, req.body.isVisible, siteId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: `Category ${req.body.isVisible ? "shown" : "hidden"}`, category });
  } catch (error) {
    console.error("Update category visibility error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCategoryContent = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || !category.is_visible || Number(category.site_id) !== Number(req.site.id)) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    const routeOwner = (await Category.findReservedRoutes(req.site.id)).get(category.slug) || null;
    return res.status(200).json({
      success: true,
      category: { ...category, route_owner: routeOwner },
    });
  } catch (error) {
    console.error("Get category content error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCategoryContent = async (req, res) => {
  try {
    const rawContent = String(req.body.content || "").trim();
    if (rawContent.length > 50000) {
      return res.status(400).json({ success: false, message: "Category content cannot exceed 50,000 characters" });
    }
    const content = sanitizeRichText(rawContent);
    const siteId = req.user.role === "ADMIN" ? Number(req.body.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    const existing = await Category.findById(req.params.id, siteId);
    if (!existing) return res.status(404).json({ success: false, message: "Category not found" });
    const routeOwner = (await Category.findReservedRoutes(siteId)).get(existing.slug);
    if (routeOwner) {
      return res.status(409).json({
        success: false,
        message: reservedRouteMessage(routeOwner),
      });
    }
    const canonical = await validateCanonicalSlug(req.body.canonicalSlug, existing.slug, siteId);
    if (canonical.error) return res.status(400).json({ success: false, message: canonical.error });
    const category = await Category.updatePageSettings(
      req.params.id,
      { content: content || null, canonicalSlug: canonical.canonicalSlug },
      siteId
    );
    return res.status(200).json({ success: true, message: "Category page updated", category });
  } catch (error) {
    console.error("Update category content error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateSectionVisibility = async (req, res) => {
  try {
    if (typeof req.body.isVisible !== "boolean") {
      return res.status(400).json({ success: false, message: "isVisible must be true or false" });
    }
    const siteId = req.user.role === "ADMIN" ? Number(req.body.siteId || req.get("x-management-site-id") || req.user.siteId) : req.user.siteId;
    const section = await UiSection.setVisibility(req.params.key, req.body.isVisible, req.user.userId, siteId);
    if (!section) return res.status(404).json({ success: false, message: "UI section not found" });
    return res.status(200).json({ success: true, message: `Section ${req.body.isVisible ? "shown" : "hidden"}`, section });
  } catch (error) {
    console.error("Update section visibility error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listReferenceVisibility = async (req, res) => {
  try {
    const siteId = req.user.role === "ADMIN" ? Number(req.query.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    const [parties, politicians, states, hiddenParties, hiddenPoliticians, hiddenStates] = await Promise.all([
      Party.findAll({ siteId }), Politician.findAll({ siteId }), State.findAll({ siteId }),
      SiteReferenceVisibility.hiddenIds(siteId, "PARTY"),
      SiteReferenceVisibility.hiddenIds(siteId, "POLITICIAN"),
      SiteReferenceVisibility.hiddenIds(siteId, "STATE"),
    ]);
    const mark = (items, hidden) => items.map((item) => ({ ...item, is_visible: !hidden.has(Number(item.id)) }));
    return res.json({ success: true, references: {
      parties: mark(parties, hiddenParties),
      politicians: mark(politicians, hiddenPoliticians),
      states: mark(states, hiddenStates),
    } });
  } catch (error) {
    console.error("List reference visibility error:", error);
    return res.status(500).json({ success: false, message: "Unable to load website selections" });
  }
};

const updateReferenceVisibility = async (req, res) => {
  try {
    if (typeof req.body.isVisible !== "boolean") return res.status(400).json({ success: false, message: "isVisible must be true or false" });
    const type = SiteReferenceVisibility.normalizeType(req.params.type);
    if (!type) return res.status(400).json({ success: false, message: "Unknown selection type" });
    const siteId = req.user.role === "ADMIN" ? Number(req.body.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    await SiteReferenceVisibility.set(siteId, type, Number(req.params.id), req.body.isVisible, req.user.userId);
    return res.json({ success: true, message: `${type.toLowerCase()} ${req.body.isVisible ? "shown" : "hidden"} on this website` });
  } catch (error) {
    console.error("Update reference visibility error:", error);
    return res.status(500).json({ success: false, message: "Unable to update website selection" });
  }
};

const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const rawContent = String(req.body.content || "").trim();
    const isVisible = req.body.isVisible !== false;
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });
    if (name.length > 120) return res.status(400).json({ success: false, message: "Category name is too long" });
    if (rawContent.length > 50000) return res.status(400).json({ success: false, message: "Category content cannot exceed 50,000 characters" });
    const content = sanitizeRichText(rawContent);
    const siteId = req.user.role === "ADMIN" ? Number(req.body.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    if (await Category.findByName(name, siteId)) {
      return res.status(409).json({ success: false, message: "That category already exists" });
    }
    const reservedRoute = (await Category.findReservedRoutes(siteId)).get(slugify(name));
    if (reservedRoute) {
      return res.status(409).json({
        success: false,
        message: reservedRouteMessage(reservedRoute),
      });
    }
    const ownSlug = slugify(name);
    const canonical = await validateCanonicalSlug(req.body.canonicalSlug, ownSlug, siteId);
    if (canonical.error) return res.status(400).json({ success: false, message: canonical.error });
    const category = await Category.create({ name, content: content || null, canonicalSlug: canonical.canonicalSlug, isVisible, createdBy: req.user.userId, siteId });
    return res.status(201).json({ success: true, message: "Category created", category });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "That category already exists" });
    console.error("Create category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const siteId = req.user.role === "ADMIN" ? Number(req.body?.siteId || req.get("x-management-site-id") || req.user.siteId) : Number(req.user.siteId);
    if (!(await Category.findById(req.params.id, siteId))) return res.status(404).json({ success: false, message: "Category not found" });
    const removed = await DeletionAudit.softDelete({ entityType: "CATEGORY", entityId: req.params.id, deletedBy: req.user.userId, reason: req.body?.reason });
    if (!removed) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: "Category moved to deleted items" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  listCategories,
  listVisibilitySettings,
  createCategory,
  getCategoryContent,
  updateCategoryContent,
  updateCategoryVisibility,
  updateSectionVisibility,
  listReferenceVisibility,
  updateReferenceVisibility,
  deleteCategory,
};
