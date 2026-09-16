const Wallet = require("../../models/wallet.model");
const User = require("../../models/user.model");
const { syncApprovedContentRewards, syncEditorReviewRewards } = require("../../services/walletRewards.service");
const RazorpayPayout = require("../../services/razorpayPayout.service");
const { getWithdrawalWindow } = require("../../utils/withdrawalWindow");

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function withWithdrawalEligibility(wallet, settings) {
  const window = getWithdrawalWindow();
  const alreadyRequested = wallet.withdrawals.some(
    (withdrawal) => dateOnly(withdrawal.withdrawalMonth) === window.withdrawalMonth
  );
  const enabled = wallet.withdrawalAccess.enabled;
  const minimumRemainingInr = wallet.pointRate.role === "EDITOR"
    ? settings.editorMinimumRemainingInr
    : settings.authorMinimumRemainingInr;
  const withdrawableValueInr = Math.max(0, Number((wallet.summary.availableValueInr - minimumRemainingInr).toFixed(2)));
  const maximumWithdrawablePoints = Math.max(0, Math.floor(withdrawableValueInr / wallet.pointRate.rupeesPerPoint));
  const meetsMinimumBalance = wallet.summary.availableValueInr >= settings.minimumWithdrawalInr;

  let blockedReason = null;
  if (!enabled) blockedReason = "Withdrawal access is blocked by an administrator.";
  else if (alreadyRequested) blockedReason = "You already submitted this month's withdrawal request.";
  else if (!meetsMinimumBalance) blockedReason = `Wallet balance must be at least ₹${settings.minimumWithdrawalInr.toLocaleString("en-IN")} to withdraw.`;
  else if (maximumWithdrawablePoints < 1) blockedReason = `You must keep at least ₹${minimumRemainingInr.toLocaleString("en-IN")} in your wallet.`;

  return {
    ...wallet,
    withdrawalEligibility: {
      enabled,
      minimumRemainingInr,
      minimumWithdrawalInr: settings.minimumWithdrawalInr,
      withdrawableValueInr,
      maximumWithdrawablePoints,
      nextWithdrawalDate: window.nextWithdrawalDate,
      alreadyRequested,
      canWithdraw: !blockedReason,
      blockedReason,
    },
  };
}

async function reconcileRazorpayWithdrawals(userId) {
  if (!RazorpayPayout.isConfigured()) return;
  const activeWithdrawals = await Wallet.getActiveProviderWithdrawalsForUser(userId);
  for (const withdrawal of activeWithdrawals) {
    try {
      const payoutLink = await RazorpayPayout.fetchPayoutLink(withdrawal.providerPayoutLinkId);
      await Wallet.applyProviderStatus({
        withdrawalId: withdrawal.id,
        providerPayoutLinkId: payoutLink.id,
        providerPayoutId: payoutLink.payout_id || null,
        providerStatus: payoutLink.status,
        failureReason: payoutLink.failure_reason || null,
      });
    } catch (error) {
      console.error(`RazorpayX reconciliation failed for withdrawal ${withdrawal.id}:`, error.message);
    }
  }
}

const getWallet = async (req, res) => {
  try {
    await syncApprovedContentRewards(req.user.userId);
    if (req.user.role === "EDITOR") await syncEditorReviewRewards(req.user.userId);
    await reconcileRazorpayWithdrawals(req.user.userId);
    const settings = await Wallet.getWithdrawalSettings();
    const wallet = withWithdrawalEligibility(await Wallet.getForUser(req.user.userId), settings);
    wallet.rewardPoints = await Wallet.getRewardPoints(req.user.role);
    if (req.user.role === "EDITOR") {
      wallet.editorReviewRewardPoints = await Wallet.getEditorReviewRewardPoints();
    }
    return res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error("Get wallet error:", error);
    return res.status(500).json({ success: false, message: "Unable to load wallet" });
  }
};

const requestWithdrawal = async (req, res) => {
  let withdrawal = null;
  try {
    RazorpayPayout.assertConfigured();
    await syncApprovedContentRewards(req.user.userId);
    if (req.user.role === "EDITOR") await syncEditorReviewRewards(req.user.userId);
    const points = Number(req.body?.points);
    const contributor = await User.findById(req.user.userId);
    if (!contributor?.email) {
      return res.status(400).json({ success: false, message: "A verified email address is required for instant withdrawal" });
    }
    withdrawal = await Wallet.requestWithdrawal({ userId: req.user.userId, points });
    const payoutLink = await RazorpayPayout.createPayoutLink({
      withdrawalId: withdrawal.id,
      amountInr: withdrawal.amountInr,
      recipient: { id: contributor.id, name: contributor.name, email: contributor.email },
    });
    withdrawal = await Wallet.attachPayoutLink({
      withdrawalId: withdrawal.id,
      providerPayoutLinkId: payoutLink.id,
      providerPayoutId: payoutLink.payout_id || null,
      payoutLinkUrl: payoutLink.short_url,
      providerStatus: payoutLink.status,
    });
    const settings = await Wallet.getWithdrawalSettings();
    const wallet = withWithdrawalEligibility(await Wallet.getForUser(req.user.userId), settings);
    return res.status(201).json({
      success: true,
      message: "Withdrawal link created. Complete your bank or UPI details on RazorpayX.",
      payoutUrl: withdrawal.payoutLinkUrl,
      withdrawal,
      wallet,
    });
  } catch (error) {
    if (withdrawal?.id && error instanceof RazorpayPayout.RazorpayPayoutError) {
      if (error.creationUncertain) {
        await Wallet.markPayoutCreationUncertain(withdrawal.id, error.message).catch(console.error);
      } else {
        await Wallet.applyProviderStatus({
          withdrawalId: withdrawal.id,
          providerStatus: "failed",
          failureReason: error.message,
        }).catch(console.error);
      }
    }
    const statusByCode = {
      WITHDRAWAL_ACCESS_BLOCKED: 403,
      INVALID_WITHDRAWAL_POINTS: 400,
      INSUFFICIENT_WALLET_BALANCE: 400,
      MONTHLY_WITHDRAWAL_EXISTS: 409,
      RAZORPAY_NOT_CONFIGURED: 503,
      INVALID_PAYOUT_AMOUNT: 400,
      RAZORPAY_API_ERROR: error.status || 502,
      RAZORPAY_UNAVAILABLE: 502,
      INVALID_RAZORPAY_RESPONSE: 502,
    };
    if (statusByCode[error.code]) {
      return res.status(statusByCode[error.code]).json({
        success: false,
        message: error.message,
        nextWithdrawalDate: error.nextWithdrawalDate,
      });
    }
    console.error("Request withdrawal error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit withdrawal request" });
  }
};

const generatePayoutLink = async (req, res) => {
  let claimed = false;
  let withdrawal = null;
  try {
    RazorpayPayout.assertConfigured();
    withdrawal = await Wallet.getWithdrawalById(req.params.withdrawalId);
    if (!withdrawal || withdrawal.userId !== Number(req.user.userId)) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found" });
    }
    if (withdrawal.payoutLinkUrl) {
      const settings = await Wallet.getWithdrawalSettings();
      const wallet = withWithdrawalEligibility(await Wallet.getForUser(req.user.userId), settings);
      return res.status(200).json({
        success: true,
        message: "Your secure payout link is ready.",
        payoutUrl: withdrawal.payoutLinkUrl,
        withdrawal,
        wallet,
      });
    }
    if (withdrawal.status !== "PENDING") {
      return res.status(409).json({ success: false, message: "A payout link can only be generated for a pending withdrawal" });
    }
    if (withdrawal.providerStatus === "creation_uncertain") {
      return res.status(409).json({
        success: false,
        message: "RazorpayX may already have created this link. Please contact an administrator to avoid a duplicate payout.",
      });
    }

    const contributor = await User.findById(req.user.userId);
    if (!contributor?.email) {
      return res.status(400).json({ success: false, message: "A verified email address is required for instant withdrawal" });
    }
    claimed = await Wallet.claimPayoutLinkCreation({
      withdrawalId: withdrawal.id,
      userId: req.user.userId,
    });
    if (!claimed) {
      return res.status(409).json({ success: false, message: "This payout link is already being generated. Refresh the wallet shortly." });
    }

    const payoutLink = await RazorpayPayout.createPayoutLink({
      withdrawalId: withdrawal.id,
      amountInr: withdrawal.amountInr,
      recipient: { id: contributor.id, name: contributor.name, email: contributor.email },
    });
    withdrawal = await Wallet.attachPayoutLink({
      withdrawalId: withdrawal.id,
      providerPayoutLinkId: payoutLink.id,
      providerPayoutId: payoutLink.payout_id || null,
      payoutLinkUrl: payoutLink.short_url,
      providerStatus: payoutLink.status,
    });
    const settings = await Wallet.getWithdrawalSettings();
    const wallet = withWithdrawalEligibility(await Wallet.getForUser(req.user.userId), settings);
    return res.status(201).json({
      success: true,
      message: "Secure payout link created. Continue on RazorpayX to receive your money.",
      payoutUrl: withdrawal.payoutLinkUrl,
      withdrawal,
      wallet,
    });
  } catch (error) {
    if (claimed && withdrawal?.id) {
      if (error.creationUncertain) {
        await Wallet.markPayoutCreationUncertain(withdrawal.id, error.message).catch(console.error);
      } else {
        await Wallet.markPayoutLinkCreationFailed(withdrawal.id, error.message).catch(console.error);
      }
    }
    if (error instanceof RazorpayPayout.RazorpayPayoutError) {
      return res.status(error.status || 502).json({ success: false, message: error.message });
    }
    console.error("Generate payout link error:", error);
    return res.status(500).json({ success: false, message: "Unable to generate payout link" });
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.get("X-Razorpay-Signature");
    if (!RazorpayPayout.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = String(req.body?.event || "");
    const payoutLink = req.body?.payload?.payout_link?.entity || null;
    const payout = req.body?.payload?.payout?.entity || null;
    const entity = payoutLink || payout;
    if (!entity) return res.status(200).json({ success: true, ignored: true });

    const notes = entity.notes || {};
    const eventStatus = event.split(".").pop();
    const providerStatus = entity.status || eventStatus;
    const localId = Number(notes.wallet_withdrawal_id || notes.withdrawal_id) || null;
    const providerPayoutLinkId = payoutLink?.id || entity.payout_link_id || notes.payout_link_id || null;
    const providerPayoutId = payout?.id || payoutLink?.payout_id || null;
    const failureReason = entity.failure_reason
      || entity.status_details?.description
      || entity.status_details?.reason
      || null;

    await Wallet.applyProviderStatus({
      withdrawalId: localId,
      providerPayoutLinkId,
      providerPayoutId,
      providerStatus,
      failureReason,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("RazorpayX webhook error:", error);
    return res.status(500).json({ success: false, message: "Unable to process webhook" });
  }
};

const listWalletsForAdmin = async (req, res) => {
  try {
    return res.status(200).json({ success: true, wallets: await Wallet.listForAdmin() });
  } catch (error) {
    console.error("List wallets for admin error:", error);
    return res.status(500).json({ success: false, message: "Unable to load contributor wallets" });
  }
};

const updateWithdrawalAccess = async (req, res) => {
  try {
    if (typeof req.body?.enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "enabled must be true or false" });
    }
    const access = await Wallet.setWithdrawalAccess({
      userId: req.params.userId,
      enabled: req.body.enabled,
      updatedBy: req.user.userId,
    });
    if (!access) {
      return res.status(404).json({ success: false, message: "Author or editor not found" });
    }
    return res.status(200).json({
      success: true,
      message: `Withdrawal access ${access.enabled ? "enabled" : "blocked"}`,
      access,
    });
  } catch (error) {
    console.error("Update withdrawal access error:", error);
    return res.status(500).json({ success: false, message: "Unable to update withdrawal access" });
  }
};

const getWithdrawalSettings = async (req, res) => {
  try {
    return res.status(200).json({ success: true, ...(await Wallet.getWithdrawalSettings()) });
  } catch (error) {
    console.error("Get withdrawal settings error:", error);
    return res.status(500).json({ success: false, message: "Unable to load withdrawal settings" });
  }
};

const updateWithdrawalSettings = async (req, res) => {
  try {
    const authorMinimumRemainingInr = Number(req.body?.authorMinimumRemainingInr);
    const editorMinimumRemainingInr = Number(req.body?.editorMinimumRemainingInr);
    const minimumWithdrawalInr = Number(req.body?.minimumWithdrawalInr);
    const validAmount = (value) => Number.isFinite(value) && value >= 0 && value <= 100000000
      && Math.round(value * 100) === value * 100;
    if (![minimumWithdrawalInr, authorMinimumRemainingInr, editorMinimumRemainingInr].every(validAmount)) {
      return res.status(400).json({
        success: false,
        message: "All withdrawal balances must be valid INR amounts with no more than 2 decimal places",
      });
    }
    const settings = await Wallet.setWithdrawalSettings({
      authorMinimumRemainingInr,
      editorMinimumRemainingInr,
      minimumWithdrawalInr,
      updatedBy: req.user.userId,
    });
    return res.status(200).json({
      success: true,
      message: "Minimum remaining wallet balances updated",
      ...settings,
    });
  } catch (error) {
    console.error("Update withdrawal settings error:", error);
    return res.status(500).json({ success: false, message: "Unable to update withdrawal settings" });
  }
};

const getPointRates = async (req, res) => {
  try {
    const [rates, rewardPoints, editorReviewRewardPoints] = await Promise.all([
      Wallet.getPointRates(),
      Wallet.getRewardPoints(),
      Wallet.getEditorReviewRewardPoints(),
    ]);
    return res.status(200).json({ success: true, rates, rewardPoints, editorReviewRewardPoints });
  } catch (error) {
    console.error("Get point rates error:", error);
    return res.status(500).json({ success: false, message: "Unable to load point rates" });
  }
};

function validPointRate(value) {
  return Number.isFinite(value) && value > 0 && value <= 100000 && Math.round(value * 10000) === value * 10000;
}

function validRewardPoints(value) {
  return Number.isInteger(value) && value > 0 && value <= 1000000;
}

const updatePointRates = async (req, res) => {
  try {
    const authorRate = Number(req.body?.authorRate);
    const editorRate = Number(req.body?.editorRate);
    const requestedRewardPoints = {
      AUTHOR: {
        ARTICLE: Number(req.body?.authorArticlePoints),
        BLOG: Number(req.body?.authorBlogPoints),
        VIDEO: Number(req.body?.authorVideoPoints),
      },
      EDITOR: {
        ARTICLE: Number(req.body?.editorArticlePoints),
        BLOG: Number(req.body?.editorBlogPoints),
        VIDEO: Number(req.body?.editorVideoPoints),
      },
    };
    const requestedEditorReviewRewardPoints = {
      ARTICLE: Number(req.body?.editorReviewArticlePoints),
      BLOG: Number(req.body?.editorReviewBlogPoints),
      VIDEO: Number(req.body?.editorReviewVideoPoints),
    };
    if (!validPointRate(authorRate) || !validPointRate(editorRate)) {
      return res.status(400).json({
        success: false,
        message: "Author and Editor rates must be positive numbers with no more than 4 decimal places",
      });
    }
    if (!Object.values(requestedRewardPoints).flatMap(Object.values).every(validRewardPoints)) {
      return res.status(400).json({
        success: false,
        message: "All Author and Editor content rewards must be positive whole numbers",
      });
    }
    if (!Object.values(requestedEditorReviewRewardPoints).every(validRewardPoints)) {
      return res.status(400).json({
        success: false,
        message: "All Editor approval rewards must be positive whole numbers",
      });
    }
    const [rates, rewardPoints, editorReviewRewardPoints] = await Promise.all([
      Wallet.setPointRates({ authorRate, editorRate, updatedBy: req.user.userId }),
      Wallet.setRewardPoints({ rewardPoints: requestedRewardPoints, updatedBy: req.user.userId }),
      Wallet.setEditorReviewRewardPoints({ rewardPoints: requestedEditorReviewRewardPoints, updatedBy: req.user.userId }),
    ]);
    return res.status(200).json({
      success: true,
      message: "Point values, content rewards, and Editor approval rewards updated",
      rates,
      rewardPoints,
      editorReviewRewardPoints,
    });
  } catch (error) {
    console.error("Update point rates error:", error);
    return res.status(500).json({ success: false, message: "Unable to update point rates" });
  }
};

module.exports = {
  getWallet,
  requestWithdrawal,
  generatePayoutLink,
  razorpayWebhook,
  listWalletsForAdmin,
  updateWithdrawalAccess,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  getPointRates,
  updatePointRates,
};
