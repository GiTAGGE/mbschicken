const { json, options } = require("./_lib/cors");
const { supabaseRequest } = require("./_lib/supabase");

const VERIFY = process.env.WHATSAPP_VERIFY_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    if (params["hub.mode"] === "subscribe" && params["hub.verify_token"] === VERIFY) {
      return { statusCode: 200, body: params["hub.challenge"] || "" };
    }
    return json(403, { error: "Verification failed" });
  }

  if (event.httpMethod === "OPTIONS") return options();
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  try {
    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body || msg.type;
          await supabaseRequest("activity_log", {
            method: "POST",
            body: {
              entity_type: "whatsapp",
              action: "inbound_message",
              meta: { from, text, id: msg.id },
            },
          });
          // Phase B: match phone to lead/order and update status
        }
      }
    }
  } catch (err) {
    console.error("whatsapp-webhook", err.message);
  }

  return json(200, { ok: true });
};
