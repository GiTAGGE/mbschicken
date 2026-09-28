const { json, options } = require("./_lib/cors");
const { supabaseRequest } = require("./_lib/supabase");

function authorize(event) {
  const secret = process.env.MBS_ADMIN_API_KEY;
  if (!secret) return false;
  const key = event.headers["x-mbs-admin-key"] || event.headers["X-MBS-Admin-Key"];
  return key === secret;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return options();
  if (!authorize(event)) return json(401, { error: "Unauthorized" });

  const qsPath = event.queryStringParameters?.path;
  const path =
    qsPath ||
    event.path.replace(/.*admin-api\/?/, "").replace(/^\?.*$/, "") ||
    "";

  try {
    if (event.httpMethod === "GET" && (path === "" || path === "dashboard")) {
      const [leads, orders] = await Promise.all([
        supabaseRequest(
          "leads?select=id,lead_code,name,phone,area,source,status,message,created_at&order=created_at.desc&limit=100",
        ),
        supabaseRequest(
          "orders?select=id,order_code,customer_name,customer_phone,area,status,total_amount,advance_required,advance_paid,balance_due,balance_paid,payment_status,notes,lead_id,created_at&order=created_at.desc&limit=100",
        ),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = (orders || []).filter((o) => (o.created_at || "").startsWith(today));
      const counts = {
        new_leads: (leads || []).filter((l) => l.status === "NEW").length,
        orders_today: todayOrders.length,
        advance_pending: (orders || []).filter((o) => o.status === "ADVANCE_PENDING").length,
        preparing: (orders || []).filter((o) => o.status === "PREPARING").length,
        out_for_delivery: (orders || []).filter((o) => o.status === "OUT_FOR_DELIVERY").length,
        delivered: (orders || []).filter((o) => o.status === "DELIVERED").length,
        balance_pending: (orders || []).filter((o) => o.status === "DELIVERED" && (o.balance_due || 0) > 0).length,
      };

      return json(200, { counts, leads, orders });
    }

    if (event.httpMethod === "PATCH" && path.startsWith("orders/")) {
      const id = path.split("/")[1];
      const body = JSON.parse(event.body || "{}");
      const allowed = [
        "NEW_LEAD",
        "CONTACTED",
        "INTERESTED",
        "ORDER_CREATED",
        "ADVANCE_PENDING",
        "PAYMENT_REVIEW",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "PAYMENT_COMPLETE",
        "CANCELLED",
      ];
      if (!allowed.includes(body.status)) return json(400, { error: "Invalid status" });
      const patch = { status: body.status };
      if (body.advance_paid != null) patch.advance_paid = body.advance_paid;
      if (body.balance_paid != null) patch.balance_paid = body.balance_paid;
      if (body.status === "PAYMENT_COMPLETE") {
        patch.payment_status = "PAID";
        if (body.balance_paid == null) patch.balance_paid = patch.balance_due;
      }
      if (body.status === "CONFIRMED" && body.advance_paid != null) {
        patch.payment_status = "PARTIAL";
      }
      const rows = await supabaseRequest(`orders?id=eq.${id}`, {
        method: "PATCH",
        body: patch,
        prefer: "return=representation",
      });
      return json(200, { order: Array.isArray(rows) ? rows[0] : rows });
    }

    if (event.httpMethod === "POST" && path === "orders") {
      const body = JSON.parse(event.body || "{}");
      const total = Number(body.total_amount) || 0;
      const advancePct = Number(process.env.MBS_ADVANCE_PERCENT || 30);
      const advanceRequired = Math.round((total * advancePct) / 100);
      const order = {
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        area: body.area || null,
        notes: body.notes || null,
        status: body.status || "ADVANCE_PENDING",
        total_amount: total,
        advance_required: advanceRequired,
        advance_paid: 0,
        balance_due: total - advanceRequired,
        source: body.source || "admin",
        lead_id: body.lead_id || null,
      };
      const rows = await supabaseRequest("orders", {
        method: "POST",
        body: order,
        prefer: "return=representation",
      });
      const created = Array.isArray(rows) ? rows[0] : rows;
      if (body.lead_id) {
        await supabaseRequest(`leads?id=eq.${body.lead_id}`, {
          method: "PATCH",
          body: { status: "ORDER_CREATED" },
        });
      }
      return json(200, { order: created });
    }

    if (event.httpMethod === "PATCH" && path.startsWith("leads/")) {
      const id = path.split("/")[1];
      const body = JSON.parse(event.body || "{}");
      const allowed = ["NEW", "CONTACTED", "INTERESTED", "ORDER_CREATED", "LOST", "CANCELLED"];
      if (!allowed.includes(body.status)) return json(400, { error: "Invalid lead status" });
      const rows = await supabaseRequest(`leads?id=eq.${id}`, {
        method: "PATCH",
        body: { status: body.status },
        prefer: "return=representation",
      });
      return json(200, { lead: Array.isArray(rows) ? rows[0] : rows });
    }

    return json(404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "Server error" });
  }
};
