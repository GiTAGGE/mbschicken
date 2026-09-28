const { json, options } = require("./_lib/cors");
const { evaluateDelivery } = require("./_lib/delivery");
const { supabaseRequest } = require("./_lib/supabase");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const result = evaluateDelivery(payload.area, payload.pin);

  try {
    await supabaseRequest("delivery_checks", {
      method: "POST",
      body: {
        area: (payload.area || "").trim() || null,
        pin: (payload.pin || "").replace(/\D/g, "") || null,
        deliverable: result.deliverable,
        source: payload.source || "website",
      },
    });
  } catch (err) {
    if (!String(err.message).includes("not configured")) {
      console.error("delivery_checks log failed", err.message);
    }
  }

  return json(200, result);
};
