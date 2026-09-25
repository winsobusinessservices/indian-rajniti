const DEFAULT_API_URL = "https://api.amazesms.com/api/sms";
const DEFAULT_TEMPLATE =
  "Your Indian Rajneeti OTP is {#numeric#}. A product of Winso Business Services Private Limited . Do not share it with anyone.";

class AmazeSmsError extends Error {
  constructor(message, { code = "AMAZESMS_ERROR", status = 502 } = {}) {
    super(message);
    this.name = "AmazeSmsError";
    this.code = code;
    this.status = status;
  }
}

function normalizeApiUrl(value) {
  const raw = String(value || DEFAULT_API_URL).trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

  // The dashboard address was initially supplied as the API address. Point it
  // at AmazeSMS's confirmed sending endpoint instead of the login page.
  if (url.hostname === "amazesms.com" && ["", "/"].includes(url.pathname)) {
    return new URL(DEFAULT_API_URL);
  }
  return url;
}

function getConfiguration() {
  return {
    apiUrl: process.env.AMAZESMS_API_URL,
    apiKey: process.env.AMAZESMS_API_KEY?.trim(),
    senderId: process.env.AMAZESMS_SENDER_ID?.trim(),
    templateId: process.env.AMAZESMS_TEMPLATE_ID?.trim(),
    entityId: process.env.AMAZESMS_ENTITY_ID?.trim(),
    templateText: process.env.AMAZESMS_TEMPLATE_TEXT?.trim() || DEFAULT_TEMPLATE,
  };
}

function assertConfigured() {
  const config = getConfiguration();
  const missing = [];
  if (!config.apiKey) missing.push("AMAZESMS_API_KEY");
  if (!config.senderId) missing.push("AMAZESMS_SENDER_ID");
  if (!config.templateId) missing.push("AMAZESMS_TEMPLATE_ID");
  if (!config.entityId) missing.push("AMAZESMS_ENTITY_ID");
  if (missing.length) {
    throw new AmazeSmsError(`Missing SMS configuration: ${missing.join(", ")}`, {
      code: "AMAZESMS_NOT_CONFIGURED",
      status: 503,
    });
  }

  try {
    config.apiUrl = normalizeApiUrl(config.apiUrl);
  } catch {
    throw new AmazeSmsError("AMAZESMS_API_URL is invalid", {
      code: "AMAZESMS_NOT_CONFIGURED",
      status: 503,
    });
  }
  return config;
}

function providerRejected(response, payload) {
  if (!response.ok) return true;
  const status = Number(payload?.status);
  if ([114, 600, 700].includes(status)) return true;
  const description = String(payload?.description || payload?.message || "");
  return /\b(no valid|invalid|not supported|empty body|fail(?:ed|ure)?|error|rejected|denied|blocked|insufficient)\b/i.test(description);
}

async function sendRegistrationOtpSms(phone, otp) {
  if (!/^\+91[6-9]\d{9}$/.test(String(phone || ""))) {
    throw new AmazeSmsError("A valid Indian mobile number is required", {
      code: "INVALID_SMS_RECIPIENT",
      status: 400,
    });
  }
  if (!/^\d{6}$/.test(String(otp || ""))) {
    throw new AmazeSmsError("A six-digit OTP is required", {
      code: "INVALID_SMS_OTP",
      status: 500,
    });
  }

  const config = assertConfigured();
  const requestUrl = new URL(config.apiUrl);
  requestUrl.searchParams.set("key", config.apiKey);
  requestUrl.searchParams.set("from", config.senderId);
  requestUrl.searchParams.set("to", phone.replace(/^\+/, ""));
  requestUrl.searchParams.set("body", config.templateText.replace(/\{#numeric#\}/g, otp));
  requestUrl.searchParams.set("templateid", config.templateId);
  requestUrl.searchParams.set("entityid", config.entityId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = { description: rawBody };
    }

    if (providerRejected(response, payload)) {
      const providerMessage = String(payload?.description || payload?.message || "AmazeSMS rejected the OTP request");
      throw new AmazeSmsError(providerMessage, { code: "AMAZESMS_API_ERROR" });
    }
    return payload;
  } catch (error) {
    if (error instanceof AmazeSmsError) throw error;
    throw new AmazeSmsError(
      error?.name === "AbortError" ? "AmazeSMS request timed out" : "AmazeSMS could not be reached",
      { code: "AMAZESMS_UNAVAILABLE" }
    );
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  AmazeSmsError,
  sendRegistrationOtpSms,
};
