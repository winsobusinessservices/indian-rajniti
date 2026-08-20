// Public, unauthenticated reference data — real political figures and
// parties, not author-submitted content, so there's no approval workflow
// here (unlike articles/blogs/videos). Backs the frontend's
// politician.api.js, which used to return hardcoded dummy data.
const Politician = require("../../models/politician.model");
const Party = require("../../models/party.model");

const getPoliticians = async (req, res) => {
  try {
    const [keyFigures, formerPMs, chiefMinisters] = await Promise.all([
      Politician.findAll({ category: "KEY_FIGURE" }),
      Politician.findAll({ category: "FORMER_PM" }),
      Politician.findAll({ category: "CHIEF_MINISTER" }),
    ]);
    return res.status(200).json({ success: true, keyFigures, formerPMs, chiefMinisters });
  } catch (error) {
    console.error("Get politicians error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getPoliticianBySlug = async (req, res) => {
  try {
    const politician = await Politician.findBySlug(req.params.slug);
    if (!politician) {
      return res.status(404).json({ success: false, message: "Politician not found" });
    }
    return res.status(200).json({ success: true, politician });
  } catch (error) {
    console.error("Get politician by slug error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getParties = async (req, res) => {
  try {
    const parties = await Party.findAll();
    return res.status(200).json({ success: true, parties });
  } catch (error) {
    console.error("Get parties error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getPartyBySlug = async (req, res) => {
  try {
    const party = await Party.findBySlug(req.params.slug);
    if (!party) {
      return res.status(404).json({ success: false, message: "Party not found" });
    }
    return res.status(200).json({ success: true, party });
  } catch (error) {
    console.error("Get party by slug error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getPoliticians, getPoliticianBySlug, getParties, getPartyBySlug };
