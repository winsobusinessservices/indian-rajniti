const crypto = require("crypto");

const API_BASE_URL = "https://api.razorpay.com/v1";

class RazorpayPayoutError extends Error {
  constructor(message, { status = 502, code = "RAZORPAY_PAYOUT_ERROR", creationUncertain = false } = {}) {
    super(message);
    this.name = "RazorpayPayoutError";
    this.status = status;
    this.code = code;
    this.creationUncertain = creationUncertain;
  }
}

function getConfiguration() {
  return {
    keyId: process.env.RAZORPAYX_KEY_ID?.trim(),
    keySecret: process.env.RAZORPAYX_KEY_SECRET?.trim(),
    accountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER?.trim(),
    webhookSecret: process.env.RAZORPAYX_WEBHOOK_SECRET?.trim(),
  };
}

function assertConfigured() {
  const config = getConfiguration();
  const missing = [];
  if (!config.keyId) missing.push("RAZORPAYX_KEY_ID");
  if (!config.keySecret) missing.push("RAZORPAYX_KEY_SECRET");
  if (!config.accountNumber) missing.push("RAZORPAYX_ACCOUNT_NUMBER");
  if (missing.length) {
    throw new RazorpayPayoutError(
      "Instant withdrawals are not configured yet. Ask an administrator to connect RazorpayX.",
      { status: 503, code: "RAZORPAY_NOT_CONFIGURED" }
    );
  }
  return config;
}

async function apiRequest(path, options = {}) {
  const config = assertConfigured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = body?.error?.description || body?.error?.reason || "RazorpayX rejected the payout request";
      throw new RazorpayPayoutError(providerMessage, {
        status: response.status >= 500 ? 502 : 400,
        code: "RAZORPAY_API_ERROR",
        creationUncertain: response.status >= 500,
      });
    }
    return body;
  } catch (error) {
    if (error instanceof RazorpayPayoutError) throw error;
    throw new RazorpayPayoutError("RazorpayX could not be reached. The withdrawal is pending review.", {
      code: "RAZORPAY_UNAVAILABLE",
      creationUncertain: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function createPayoutLink({ withdrawalId, amountInr, recipient }) {
  const config = assertConfigured();
  const amount = Math.round(Number(amountInr) * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) {
    throw new RazorpayPayoutError("The payout amount must be at least ₹1.", {
      status: 400,
      code: "INVALID_PAYOUT_AMOUNT",
    });
  }

  const payoutLink = await apiRequest("/payout-links", {
    method: "POST",
    body: JSON.stringify({
      account_number: config.accountNumber,
      contact: {
        name: recipient.name,
        email: recipient.email,
        type: "employee",
      },
      amount,
      currency: "INR",
      purpose: "payout",
      description: `Contributor wallet withdrawal #${withdrawalId}`,
      receipt: `wallet-${withdrawalId}`,
      send_email: true,
      send_sms: false,
      notes: {
        wallet_withdrawal_id: String(withdrawalId),
        contributor_user_id: String(recipient.id),
      },
    }),
  });

  if (!payoutLink.id || !payoutLink.short_url) {
    throw new RazorpayPayoutError("RazorpayX did not return a valid payout link.", {
      code: "INVALID_RAZORPAY_RESPONSE",
      creationUncertain: true,
    });
  }
  return payoutLink;
}

function fetchPayoutLink(providerPayoutLinkId) {
  return apiRequest(`/payout-links/${encodeURIComponent(providerPayoutLinkId)}`, { method: "GET" });
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = getConfiguration().webhookSecret;
  if (!secret || !Buffer.isBuffer(rawBody) || typeof signature !== "string") return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

function isConfigured() {
  try {
    assertConfigured();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  RazorpayPayoutError,
  assertConfigured,
  createPayoutLink,
  fetchPayoutLink,
  verifyWebhookSignature,
  isConfigured,
};
