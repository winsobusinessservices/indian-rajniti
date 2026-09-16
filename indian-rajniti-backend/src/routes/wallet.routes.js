const express = require("express");
const {
  getWallet,
  requestWithdrawal,
  generatePayoutLink,
  razorpayWebhook,
  listWalletsForAdmin,
  updateWithdrawalAccess,
  getPointRates,
  updatePointRates,
  getWithdrawalSettings,
  updateWithdrawalSettings,
} = require("../controllers/wallet/wallet.controller");
const { authenticate, authorize, authorizePermission } = require("../middleware/auth.middleware");
const { PERMISSIONS } = require("../config/permissions");

const router = express.Router();

/**
 * @openapi
 * /api/wallet:
 *   get:
 *     summary: Get the current contributor's wallet summary and point history
 *     tags: [Wallet]
 *     responses:
 *       200: { description: Wallet summary and up to 100 recent transactions }
 *       401: { description: Authentication required }
 *       403: { description: Author or editor role required }
 */
router.get("/wallet", authenticate, authorize("AUTHOR", "EDITOR"), getWallet);
router.post("/wallet/razorpay/webhook", razorpayWebhook);
router.post("/wallet/withdrawals", authenticate, authorize("AUTHOR", "EDITOR"), requestWithdrawal);
router.post("/wallet/withdrawals/:withdrawalId/payout-link", authenticate, authorize("AUTHOR", "EDITOR"), generatePayoutLink);
router.get("/admin/wallets", authenticate, authorizePermission(PERMISSIONS.MANAGE_WALLETS), listWalletsForAdmin);
router.get("/admin/wallets/withdrawal-settings", authenticate, authorize("ADMIN"), getWithdrawalSettings);
router.put("/admin/wallets/withdrawal-settings", authenticate, authorize("ADMIN"), updateWithdrawalSettings);
router.patch("/admin/wallets/:userId/withdrawal-access", authenticate, authorizePermission(PERMISSIONS.MANAGE_WALLETS), updateWithdrawalAccess);
router.get("/admin/wallets/point-rates", authenticate, authorizePermission(PERMISSIONS.MANAGE_POINT_RATES), getPointRates);
router.put("/admin/wallets/point-rates", authenticate, authorizePermission(PERMISSIONS.MANAGE_POINT_RATES), updatePointRates);

module.exports = router;
