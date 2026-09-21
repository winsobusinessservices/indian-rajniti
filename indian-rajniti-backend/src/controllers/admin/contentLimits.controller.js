const { ContentLimit, ROLES, CONTENT_TYPES } = require("../../models/contentLimit.model");

const getContentLimits = async (req, res) => {
  try {
    const limits = await ContentLimit.getAll();
    return res.status(200).json({ success: true, limits });
  } catch (error) {
    console.error("Get content limits error:", error);
    return res.status(500).json({ success: false, message: "Posting limits could not be loaded" });
  }
};

const updateContentLimits = async (req, res) => {
  try {
    const requested = req.body?.limits;
    const limits = {};
    for (const role of ROLES) {
      limits[role] = {};
      for (const contentType of CONTENT_TYPES) {
        const value = Number(requested?.[role]?.[contentType]);
        if (!Number.isInteger(value) || value < 1 || value > 1000) {
          return res.status(400).json({
            success: false,
            message: `${role} ${contentType.toLowerCase()} limit must be a whole number between 1 and 1000`,
          });
        }
        limits[role][contentType] = value;
      }
    }

    const updated = await ContentLimit.setAll(limits, req.user.userId);
    return res.status(200).json({ success: true, message: "Daily posting limits updated", limits: updated });
  } catch (error) {
    console.error("Update content limits error:", error);
    return res.status(500).json({ success: false, message: "Posting limits could not be updated" });
  }
};

module.exports = { getContentLimits, updateContentLimits };

