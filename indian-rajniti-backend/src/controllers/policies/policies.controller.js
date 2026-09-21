const Policy = require("../../models/policy.model");
const DeletionAudit = require("../../models/deletionAudit.model");

const VALID_STATUS = new Set(["DRAFT", "PUBLISHED"]);

function policyPayload(body) {
  return {
    title: String(body.title || "").trim(),
    policyType: String(body.policyType || "").trim(),
    summary: String(body.summary || "").trim(),
    content: String(body.content || "").trim(),
    status: String(body.status || "DRAFT").toUpperCase(),
    showOnRegistration: body.showOnRegistration === true,
  };
}

function validationMessage(payload) {
  if (!payload.title || !payload.policyType || !payload.summary || !payload.content) {
    return "Title, policy area, summary, and content are required";
  }
  if (payload.title.length > 200) return "Title must be 200 characters or fewer";
  if (payload.policyType.length > 100) return "Policy area must be 100 characters or fewer";
  if (payload.summary.length > 600) return "Summary must be 600 characters or fewer";
  if (!VALID_STATUS.has(payload.status)) return "Status must be DRAFT or PUBLISHED";
  return null;
}

const listPublishedPolicies = async (req, res) => {
  try {
    const policies = await Policy.findAll({ publishedOnly: true });
    return res.status(200).json({ success: true, policies });
  } catch (error) {
    console.error("List published policies error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getPublishedPolicy = async (req, res) => {
  try {
    const policy = await Policy.findBySlug(req.params.slug, { publishedOnly: true });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    return res.status(200).json({ success: true, policy });
  } catch (error) {
    console.error("Get published policy error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listRegistrationPolicies = async (req, res) => {
  try {
    const policies = await Policy.findRegistrationPolicies();
    return res.status(200).json({ success: true, policies });
  } catch (error) {
    console.error("List registration policies error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listPoliciesForAdmin = async (req, res) => {
  try {
    const policies = await Policy.findAll();
    return res.status(200).json({ success: true, policies });
  } catch (error) {
    console.error("List policies for admin error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createPolicy = async (req, res) => {
  try {
    const payload = policyPayload(req.body);
    const message = validationMessage(payload);
    if (message) return res.status(400).json({ success: false, message });
    const policy = await Policy.create({ ...payload, createdBy: req.user.userId });
    return res.status(201).json({ success: true, message: "Policy created", policy });
  } catch (error) {
    console.error("Create policy error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updatePolicy = async (req, res) => {
  try {
    const payload = policyPayload(req.body);
    const message = validationMessage(payload);
    if (message) return res.status(400).json({ success: false, message });
    const policy = await Policy.update(req.params.id, payload);
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    return res.status(200).json({ success: true, message: "Policy updated", policy });
  } catch (error) {
    console.error("Update policy error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deletePolicy = async (req, res) => {
  try {
    const removed = await DeletionAudit.softDelete({ entityType: "POLICY", entityId: req.params.id, deletedBy: req.user.userId, reason: req.body?.reason });
    if (!removed) return res.status(404).json({ success: false, message: "Policy not found" });
    return res.status(200).json({ success: true, message: "Policy moved to deleted items" });
  } catch (error) {
    console.error("Delete policy error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  listPublishedPolicies,
  getPublishedPolicy,
  listRegistrationPolicies,
  listPoliciesForAdmin,
  createPolicy,
  updatePolicy,
  deletePolicy,
};
