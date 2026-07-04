function normalizeDestination(value, whatsapp = false) {
  const number = String(value || "").trim();
  if (!number) throw new Error("A recipient phone number is required");
  return whatsapp && !number.startsWith("whatsapp:") ? `whatsapp:${number}` : number;
}

async function sendTwilio({ to, message, channel }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const whatsapp = String(channel).toLowerCase() === "whatsapp";
  const from = whatsapp ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) throw new Error(`Twilio ${channel} credentials are incomplete`);

  const body = new URLSearchParams({
    To: normalizeDestination(to, whatsapp),
    From: normalizeDestination(from, whatsapp),
    Body: message,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Twilio returned HTTP ${response.status}`);
  return { provider: "twilio", id: result.sid, status: result.status };
}

async function sendWebhook(payload) {
  if (!process.env.NOTIFICATION_WEBHOOK_URL) throw new Error("NOTIFICATION_WEBHOOK_URL is not configured");
  const response = await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Notification webhook returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  return { provider: "webhook", status: "accepted", response: body.slice(0, 1000) };
}

async function deliver(payload) {
  const provider = String(process.env.NOTIFICATION_PROVIDER || "preview").toLowerCase();
  if (provider === "preview" || String(payload.channel).toLowerCase() === "preview") {
    return { provider: "preview", status: "preview" };
  }
  if (provider === "twilio") return sendTwilio(payload);
  if (provider === "webhook") return sendWebhook(payload);
  throw new Error(`Unsupported NOTIFICATION_PROVIDER: ${provider}`);
}

function providerStatus() {
  const provider = String(process.env.NOTIFICATION_PROVIDER || "preview").toLowerCase();
  const configured = provider === "preview" ||
    (provider === "webhook" && Boolean(process.env.NOTIFICATION_WEBHOOK_URL)) ||
    (provider === "twilio" && Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));
  return { provider, configured };
}

module.exports = { deliver, providerStatus, normalizeDestination };
