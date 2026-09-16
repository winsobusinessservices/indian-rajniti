const express = require("express");
const {
  listPublishedPolicies,
  getPublishedPolicy,
  listRegistrationPolicies,
  listPoliciesForAdmin,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/policies/policies.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/policies", listPublishedPolicies);
router.get("/policies/registration", listRegistrationPolicies);
router.get("/policies/manage", authenticate, authorize("ADMIN"), listPoliciesForAdmin);
router.post("/policies", authenticate, authorize("ADMIN"), createPolicy);
router.patch("/policies/:id", authenticate, authorize("ADMIN"), updatePolicy);
router.delete("/policies/:id", authenticate, authorize("ADMIN"), deletePolicy);
router.get("/policies/:slug", getPublishedPolicy);

module.exports = router;
