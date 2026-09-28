const { json, options } = require("./_lib/cors");
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

  const name = (payload.name || "").trim();
  const phone = (payload.phone || "").replace(/\s/g, "");
  if (!name || phone.length < 8) {
    return json(400, { error: "Name and valid phone are required" });
  }

  const lead = {
    name,
    phone,
    whatsapp: phone,
    area: (payload.area || "").trim() || null,
    message: (payload.message || "").trim() || null,
    source: payload.source || "website",
    campaign: payload.utm_campaign || payload.campaign || null,
    ad_set: payload.utm_content || null,
    ad_name: payload.utm_term || null,
    landing_page: payload.landing_page || null,
    utm_source: payload.utm_source || null,
    utm_medium: payload.utm_medium || null,
    utm_campaign: payload.utm_campaign || null,
    status: "NEW",
  };

  try {
    const rows = await supabaseRequest("leads", {
      method: "POST",
      body: lead,
      prefer: "return=representation",
    });
    const created = Array.isArray(rows) ? rows[0] : rows;
    return json(200, {
      message: "Thank you! We will contact you shortly on WhatsApp or phone.",
      lead_id: created?.lead_code || created?.id,
    });
  } catch (err) {
    if (err.message.includes("not configured")) {
      return json(503, { error: "Lead capture is being set up. Please WhatsApp us directly." });
    }
    console.error(err);
    return json(500, { error: "Could not save enquiry" });
  }
};
