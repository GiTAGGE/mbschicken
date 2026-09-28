(function () {
  const KEY_STORAGE = "mbs_admin_api_key";
  const ADVANCE_PCT = 30;
  const MBS_PHONE = "919901467970";

  const authPanel = document.getElementById("authPanel");
  const app = document.getElementById("app");
  const adminKeyInput = document.getElementById("adminKey");
  const authForm = document.getElementById("authForm");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const authError = document.getElementById("authError");
  const refreshBtn = document.getElementById("refreshBtn");
  const newOrderBtn = document.getElementById("newOrderBtn");
  const statsEl = document.getElementById("stats");
  const ordersList = document.getElementById("ordersList");
  const leadsList = document.getElementById("leadsList");
  const ordersEmpty = document.getElementById("ordersEmpty");
  const leadsEmpty = document.getElementById("leadsEmpty");
  const ordersFilterLabel = document.getElementById("ordersFilterLabel");
  const lastSync = document.getElementById("lastSync");
  const orderTpl = document.getElementById("orderCardTpl");
  const orderModal = document.getElementById("orderModal");
  const orderForm = document.getElementById("orderForm");
  const orderCancelBtn = document.getElementById("orderCancelBtn");
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderLeadId = document.getElementById("orderLeadId");
  const advancePreview = document.getElementById("advancePreview");
  const mainTabs = document.getElementById("mainTabs");

  let state = {
    counts: {},
    leads: [],
    orders: [],
    orderFilter: null,
    tab: "overview",
  };

  function getKey() {
    return sessionStorage.getItem(KEY_STORAGE) || "";
  }

  function setKey(v) {
    sessionStorage.setItem(KEY_STORAGE, v);
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 2800);
  }

  async function api(path, options) {
    const res = await fetch("/.netlify/functions/admin-api?path=" + encodeURIComponent(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-MBS-Admin-Key": getKey(),
        ...(options && options.headers),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function sendWhatsApp(phone, text) {
    const res = await fetch("/.netlify/functions/whatsapp-send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MBS-Admin-Key": getKey(),
      },
      body: JSON.stringify({ to: phone, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.wa_url) window.open(data.wa_url, "_blank", "noopener");
    if (data.mode === "api") toast("Sent via WhatsApp API");
    else if (data.mode === "manual") toast("Opened WhatsApp — send the message");
    else if (data.error) toast(data.error);
  }

  function normalizePhone(phone) {
    const p = (phone || "").replace(/\D/g, "");
    return p.startsWith("91") ? p : "91" + p;
  }

  function waLink(phone, text) {
    return "https://wa.me/" + normalizePhone(phone) + "?text=" + encodeURIComponent(text || "Hi from MBS Chicken Centre");
  }

  function telLink(phone) {
    return "tel:+" + normalizePhone(phone);
  }

  function msgAdvance(order) {
    return (
      "🐔 MBS Chicken Centre\n\n" +
      "Order: " +
      (order.order_code || "") +
      "\nTotal: ₹" +
      order.total_amount +
      "\nAdvance (30%): ₹" +
      order.advance_required +
      "\nBalance on delivery: ₹" +
      (order.total_amount - order.advance_required) +
      "\n\nPlease pay ₹" +
      order.advance_required +
      " via UPI (Canara Bank merchant QR we will share here).\nAfter payment, reply PAID with screenshot.\n\nThank you!"
    );
  }

  function msgConfirmed(order) {
    return (
      "✅ Order " +
      (order.order_code || "") +
      " confirmed!\nWe are preparing your fresh chicken. We will message when it is out for delivery."
    );
  }

  function msgOutForDelivery(order) {
    return (
      "🚚 Your MBS order " +
      (order.order_code || "") +
      " is on the way.\nBalance payable on delivery: ₹" +
      (order.balance_due || order.total_amount - order.advance_paid) +
      "\n\nThank you!"
    );
  }

  function msgBalance(order) {
    return (
      "🐔 Order " +
      (order.order_code || "") +
      " delivered.\nBalance: ₹" +
      (order.balance_due || 0) +
      "\nPlease pay via UPI. Reply PAID after payment.\n\n— MBS Chicken Centre"
    );
  }

  const STAT_FILTERS = [
    { key: "new_leads", label: "New leads", filter: null, tab: "leads" },
    { key: "orders_today", label: "Orders today", filter: "TODAY", tab: "orders" },
    { key: "advance_pending", label: "Advance pending", filter: "ADVANCE_PENDING", tab: "orders" },
    { key: "preparing", label: "Preparing", filter: "PREPARING", tab: "orders" },
    { key: "out_for_delivery", label: "Out for delivery", filter: "OUT_FOR_DELIVERY", tab: "orders" },
    { key: "delivered", label: "Delivered", filter: "DELIVERED", tab: "orders" },
    { key: "balance_pending", label: "Balance pending", filter: "BALANCE_PENDING", tab: "orders" },
  ];

  function renderStats() {
    const c = state.counts;
    statsEl.innerHTML = STAT_FILTERS
      .map(function (s) {
        const active = state.orderFilter === s.filter && s.filter ? " active" : "";
        return (
          '<button type="button" class="stat' +
          active +
          '" data-filter="' +
          (s.filter || "") +
          '" data-tab="' +
          s.tab +
          '"><b>' +
          (c[s.key] ?? 0) +
          "</b><span>" +
          s.label +
          "</span></button>"
        );
      })
      .join("");

    statsEl.querySelectorAll(".stat").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const f = btn.getAttribute("data-filter");
        const tab = btn.getAttribute("data-tab");
        state.orderFilter = f || null;
        setTab(tab);
        renderOrders();
        updateFilterLabel();
      });
    });
  }

  function updateFilterLabel() {
    if (!ordersFilterLabel) return;
    const labels = {
      TODAY: "Created today",
      ADVANCE_PENDING: "Waiting for 30% advance",
      PREPARING: "In kitchen",
      OUT_FOR_DELIVERY: "On the road",
      DELIVERED: "Delivered",
      BALANCE_PENDING: "Balance to collect",
    };
    ordersFilterLabel.textContent = state.orderFilter ? labels[state.orderFilter] || state.orderFilter : "All orders";
  }

  function filteredOrders() {
    let list = state.orders || [];
    const f = state.orderFilter;
    if (!f) return list;
    const today = new Date().toISOString().slice(0, 10);
    if (f === "TODAY") return list.filter((o) => (o.created_at || "").startsWith(today));
    if (f === "BALANCE_PENDING")
      return list.filter((o) => o.status === "DELIVERED" && (o.balance_due || 0) > 0 && o.payment_status !== "PAID");
    return list.filter((o) => o.status === f);
  }

  function addBtn(container, label, className, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = label;
    b.addEventListener("click", onClick);
    container.appendChild(b);
  }

  function addLink(container, label, className, href) {
    const a = document.createElement("a");
    a.className = className + " btn-link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    container.appendChild(a);
  }

  function renderOrders() {
    const orders = filteredOrders();
    ordersList.innerHTML = "";
    ordersEmpty.hidden = orders.length > 0;

    orders.forEach(function (o) {
      const node = orderTpl.content.cloneNode(true);
      node.querySelector(".code").textContent = o.order_code || o.id;
      node.querySelector(".status-pill").textContent = o.status.replace(/_/g, " ");
      node.querySelector(".customer").textContent = (o.customer_name || "") + " · " + (o.customer_phone || "");
      node.querySelector(".meta").textContent = (o.area || "Area TBD") + " · Total ₹" + (o.total_amount || 0);
      const notesEl = node.querySelector(".notes");
      notesEl.textContent = o.notes ? "Items: " + o.notes : "";
      notesEl.hidden = !o.notes;
      node.querySelector(".amounts").innerHTML =
        "<div>Advance<br><strong>₹" +
        (o.advance_required || 0) +
        "</strong></div><div>Paid<br><strong>₹" +
        (o.advance_paid || 0) +
        "</strong></div><div>Balance<br><strong>₹" +
        (o.balance_due || 0) +
        "</strong></div>";

      const pipeline = node.querySelector(".pipeline");
      const comms = node.querySelector(".comms");

      if (o.status === "ADVANCE_PENDING") {
        addBtn(pipeline, "Send advance WhatsApp", "btn-wa", function () {
          sendWhatsApp(o.customer_phone, msgAdvance(o));
        });
        addBtn(pipeline, "Customer said PAID", "btn-muted", function () {
          patchOrder(o.id, { status: "PAYMENT_REVIEW" });
        });
        addBtn(pipeline, "✓ Advance received", "btn-advance", function () {
          patchOrder(o.id, { status: "CONFIRMED", advance_paid: o.advance_required });
        });
      }
      if (o.status === "PAYMENT_REVIEW") {
        addBtn(pipeline, "✓ Verify & confirm", "btn-confirm", function () {
          patchOrder(o.id, { status: "CONFIRMED", advance_paid: o.advance_required });
        });
        addBtn(pipeline, "Back to advance pending", "btn-muted", function () {
          patchOrder(o.id, { status: "ADVANCE_PENDING" });
        });
      }
      if (o.status === "CONFIRMED") {
        addBtn(pipeline, "Send confirmed WhatsApp", "btn-wa", function () {
          sendWhatsApp(o.customer_phone, msgConfirmed(o));
        });
        addBtn(pipeline, "→ Preparing", "btn-next", function () {
          patchOrder(o.id, { status: "PREPARING" });
        });
      }
      if (o.status === "PREPARING") {
        addBtn(pipeline, "→ Ready", "btn-muted", function () {
          patchOrder(o.id, { status: "READY" });
        });
        addBtn(pipeline, "→ Out for delivery", "btn-next", function () {
          patchOrder(o.id, { status: "OUT_FOR_DELIVERY" });
        });
      }
      if (o.status === "READY") {
        addBtn(pipeline, "→ Out for delivery", "btn-next", function () {
          patchOrder(o.id, { status: "OUT_FOR_DELIVERY" });
        });
      }
      if (o.status === "OUT_FOR_DELIVERY") {
        addBtn(pipeline, "Send on-the-way WhatsApp", "btn-wa", function () {
          sendWhatsApp(o.customer_phone, msgOutForDelivery(o));
        });
        addBtn(pipeline, "→ Delivered", "btn-confirm", function () {
          patchOrder(o.id, { status: "DELIVERED" });
        });
      }
      if (o.status === "DELIVERED") {
        addBtn(pipeline, "Send balance WhatsApp", "btn-wa", function () {
          sendWhatsApp(o.customer_phone, msgBalance(o));
        });
        addBtn(pipeline, "✓ Payment complete", "btn-confirm", function () {
          patchOrder(o.id, {
            status: "PAYMENT_COMPLETE",
            balance_paid: o.balance_due,
          });
        });
      }

      addLink(comms, "💬 WhatsApp", "btn-wa", waLink(o.customer_phone, "Hi, MBS order " + (o.order_code || "")));
      addLink(comms, "📞 Call", "btn-call", telLink(o.customer_phone));

      ordersList.appendChild(node);
    });
  }

  function renderLeads() {
    const leads = state.leads || [];
    leadsEmpty.hidden = leads.length > 0;
    leadsList.innerHTML = leads
      .map(function (l) {
        const msg = l.message ? '<p class="notes">' + escapeHtml(l.message) + "</p>" : "";
        return (
          '<article class="lead-card" data-lead-id="' +
          l.id +
          '"><div class="order-head"><strong>' +
          escapeHtml(l.lead_code || "Lead") +
          '</strong><span class="status-pill">' +
          escapeHtml(l.status) +
          "</span></div><p class=\"customer\">" +
          escapeHtml(l.name) +
          " · " +
          escapeHtml(l.phone) +
          '</p><p class="meta">' +
          escapeHtml(l.area || "") +
          " · " +
          escapeHtml(l.source || "") +
          "</p>" +
          msg +
          '<div class="actions lead-actions">' +
          '<a class="btn-wa btn-link" target="_blank" rel="noopener" href="' +
          waLink(l.phone, "Hi " + l.name + ", thanks for contacting MBS Chicken Centre.") +
          '">WhatsApp</a>' +
          '<a class="btn-call btn-link" href="' +
          telLink(l.phone) +
          '">Call</a>' +
          '<button type="button" class="btn-muted" data-action="contacted">Contacted</button>' +
          '<button type="button" class="btn-next" data-action="convert">Create order</button>' +
          '<button type="button" class="btn-muted" data-action="lost">Lost</button>' +
          "</div></article>"
        );
      })
      .join("");

    leadsList.querySelectorAll(".lead-card").forEach(function (card) {
      const id = card.getAttribute("data-lead-id");
      const lead = leads.find((x) => x.id === id);
      if (!lead) return;
      card.querySelector('[data-action="contacted"]').addEventListener("click", function () {
        patchLead(id, "CONTACTED");
      });
      card.querySelector('[data-action="lost"]').addEventListener("click", function () {
        patchLead(id, "LOST");
      });
      card.querySelector('[data-action="convert"]').addEventListener("click", function () {
        openOrderModal(lead);
      });
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setTab(tab) {
    state.tab = tab;
    mainTabs.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === tab);
    });
    const ordersPanel = document.getElementById("ordersPanel");
    const leadsPanel = document.getElementById("leadsPanel");
    const showOrders = tab === "overview" || tab === "orders";
    const showLeads = tab === "overview" || tab === "leads";
    ordersPanel.hidden = !showOrders;
    leadsPanel.hidden = !showLeads;
    statsEl.hidden = tab !== "overview";
  }

  function openOrderModal(lead) {
    orderModalTitle.textContent = lead ? "Create order from lead" : "New order";
    orderForm.reset();
    orderLeadId.value = lead ? lead.id : "";
    if (lead) {
      orderForm.customer_name.value = lead.name || "";
      orderForm.customer_phone.value = lead.phone || "";
      orderForm.area.value = lead.area || "";
      orderForm.notes.value = lead.message || "";
    }
    orderModal.showModal();
  }

  function updateAdvancePreview() {
    const total = Number(orderForm.total_amount.value) || 0;
    const adv = Math.round((total * ADVANCE_PCT) / 100);
    advancePreview.textContent = "Advance " + ADVANCE_PCT + "%: ₹" + adv + " · Balance: ₹" + (total - adv);
  }

  async function patchOrder(id, body) {
    await api("orders/" + id, { method: "PATCH", body: JSON.stringify(body) });
    toast("Order updated");
    await load();
  }

  async function patchLead(id, status) {
    await api("leads/" + id, { method: "PATCH", body: JSON.stringify({ status }) });
    toast("Lead updated");
    await load();
  }

  async function load() {
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      const data = await api("dashboard");
      state.counts = data.counts || {};
      state.leads = data.leads || [];
      state.orders = data.orders || [];
      renderStats();
      renderOrders();
      renderLeads();
      if (lastSync) lastSync.textContent = "Updated " + new Date().toLocaleTimeString();
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function showAuthError(message) {
    if (!authError) return;
    authError.hidden = !message;
    authError.textContent = message || "";
  }

  function unlock() {
    const key = adminKeyInput.value.trim();
    if (!key) {
      showAuthError("Please enter your admin API key.");
      return;
    }
    showAuthError("");
    if (saveKeyBtn) saveKeyBtn.disabled = true;
    setKey(key);
    authPanel.hidden = true;
    app.hidden = false;
    setTab("overview");
    load().catch(function (e) {
      sessionStorage.removeItem(KEY_STORAGE);
      authPanel.hidden = false;
      app.hidden = true;
      showAuthError(e.message || "Could not unlock.");
    }).finally(function () {
      if (saveKeyBtn) saveKeyBtn.disabled = false;
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", function (e) {
      e.preventDefault();
      unlock();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      load().catch(function (e) {
        toast(e.message);
      });
    });
  }

  if (newOrderBtn) {
    newOrderBtn.addEventListener("click", function () {
      openOrderModal(null);
    });
  }

  if (orderCancelBtn) {
    orderCancelBtn.addEventListener("click", function () {
      orderModal.close();
    });
  }

  if (orderForm) {
    orderForm.total_amount.addEventListener("input", updateAdvancePreview);
    orderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(orderForm);
      const payload = {
        customer_name: fd.get("customer_name"),
        customer_phone: fd.get("customer_phone"),
        area: fd.get("area"),
        total_amount: fd.get("total_amount"),
        notes: fd.get("notes"),
        lead_id: fd.get("lead_id") || undefined,
        source: fd.get("lead_id") ? "lead" : "admin",
      };
      api("orders", { method: "POST", body: JSON.stringify(payload) })
        .then(function () {
          orderModal.close();
          toast("Order created");
          state.orderFilter = "ADVANCE_PENDING";
          setTab("orders");
          return load();
        })
        .catch(function (err) {
          toast(err.message);
        });
    });
  }

  if (mainTabs) {
    mainTabs.addEventListener("click", function (e) {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      setTab(tab.getAttribute("data-tab"));
    });
  }

  const existing = getKey();
  if (existing) {
    adminKeyInput.value = existing;
    unlock();
  }
})();
