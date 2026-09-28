const { json, options } = require("./_lib/cors");

function authorize(event) {
  const secret = process.env.MBS_ADMIN_API_KEY;
  const key = event.headers["x-mbs-admin-key"] || event.headers["X-MBS-Admin-Key"];
  return secret && key === secret;
}

function normalizePhone(phone) {
  const p = (phone || "").replace(/\D/g, "");
  if (p.length === 10) return "91" + p;
  return p;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!authorize(event)) return json(401, { error: "Unauthorized" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const to = normalizePhone(body.to);
  const text = (body.text || "").trim();
  if (!to || !text) return json(400, { error: "to and text required" });

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const waUrl = "https://wa.me/" + to + "?text=" + encodeURIComponent(text);

  if (!token || !phoneId) {
    return json(200, {
      mode: "manual",
      message: "WhatsApp API not configured. Open wa.me link.",
      wa_url: waUrl,
    });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json(502, {
      mode: "api_error",
      error: data.error?.message || "WhatsApp API failed",
      wa_url: waUrl,
    });
  }

  return json(200, { mode: "api", wa_url: waUrl, result: data });
};
