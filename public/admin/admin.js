(function () {
  const KEY_STORAGE = "mbs_admin_api_key";
  const authPanel = document.getElementById("authPanel");
  const app = document.getElementById("app");
  const adminKeyInput = document.getElementById("adminKey");
  const authForm = document.getElementById("authForm");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const authError = document.getElementById("authError");
  const refreshBtn = document.getElementById("refreshBtn");
  const statsEl = document.getElementById("stats");
  const ordersList = document.getElementById("ordersList");
  const leadsList = document.getElementById("leadsList");
  const orderTpl = document.getElementById("orderCardTpl");

  function getKey() {
    return sessionStorage.getItem(KEY_STORAGE) || "";
  }

  function setKey(v) {
    sessionStorage.setItem(KEY_STORAGE, v);
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

  function renderStats(counts) {
    const items = [
      ["New leads", counts.new_leads],
      ["Orders today", counts.orders_today],
      ["Advance pending", counts.advance_pending],
      ["Preparing", counts.preparing],
      ["Out for delivery", counts.out_for_delivery],
      ["Delivered", counts.delivered],
      ["Balance pending", counts.balance_pending],
    ];
    statsEl.innerHTML = items
      .map(
        ([label, val]) =>
          '<div class="stat"><b>' + (val ?? 0) + "</b><span>" + label + "</span></div>",
      )
      .join("");
  }

  function waLink(phone, text) {
    const p = (phone || "").replace(/\D/g, "");
    const num = p.startsWith("91") ? p : "91" + p;
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text || "Hi MBS");
  }

  function renderOrders(orders) {
    ordersList.innerHTML = "";
    (orders || []).forEach(function (o) {
      const node = orderTpl.content.cloneNode(true);
      node.querySelector(".code").textContent = o.order_code || o.id;
      node.querySelector(".status-pill").textContent = o.status;
      node.querySelector(".customer").textContent = (o.customer_name || "") + " · " + (o.customer_phone || "");
      node.querySelector(".meta").textContent = (o.area || "Area TBD") + " · ₹" + (o.total_amount || 0);
      node.querySelector(".amounts").innerHTML =
        "<div>Advance <strong>₹" +
        (o.advance_required || 0) +
        "</strong></div><div>Balance <strong>₹" +
        (o.balance_due || 0) +
        "</strong></div>";
      const actions = node.querySelector(".actions");
      const wa = document.createElement("a");
      wa.className = "btn-wa";
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.href = waLink(o.customer_phone, "Hi, regarding your MBS order " + (o.order_code || ""));
      wa.textContent = "WhatsApp";
      actions.appendChild(wa);

      if (o.status === "ADVANCE_PENDING") {
        const btn = document.createElement("button");
        btn.className = "btn-advance";
        btn.textContent = "Mark advance received";
        btn.onclick = function () {
          patchOrder(o.id, { status: "CONFIRMED", advance_paid: o.advance_required });
        };
        actions.appendChild(btn);
      }
      if (o.status === "CONFIRMED") {
        const btn = document.createElement("button");
        btn.className = "btn-next";
        btn.textContent = "Preparing";
        btn.onclick = function () {
          patchOrder(o.id, { status: "PREPARING" });
        };
        actions.appendChild(btn);
      }
      if (o.status === "PREPARING") {
        const btn = document.createElement("button");
        btn.className = "btn-next";
        btn.textContent = "Out for delivery";
        btn.onclick = function () {
          patchOrder(o.id, { status: "OUT_FOR_DELIVERY" });
        };
        actions.appendChild(btn);
      }
      if (o.status === "OUT_FOR_DELIVERY") {
        const btn = document.createElement("button");
        btn.className = "btn-confirm";
        btn.textContent = "Delivered";
        btn.onclick = function () {
          patchOrder(o.id, { status: "DELIVERED" });
        };
        actions.appendChild(btn);
      }
      ordersList.appendChild(node);
    });
  }

  function renderLeads(leads) {
    leadsList.innerHTML = (leads || [])
      .map(function (l) {
        return (
          '<article class="lead-card"><strong>' +
          (l.lead_code || "Lead") +
          "</strong> · " +
          l.status +
          '<p class="customer">' +
          l.name +
          " · " +
          l.phone +
          '</p><p class="meta">' +
          (l.area || "") +
          " · " +
          (l.source || "") +
          "</p></article>"
        );
      })
      .join("");
  }

  async function patchOrder(id, body) {
    await api("orders/" + id, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  }

  async function load() {
    const data = await api("dashboard");
    renderStats(data.counts || {});
    renderOrders(data.orders || []);
    renderLeads(data.leads || []);
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
    load()
      .catch(function (e) {
        sessionStorage.removeItem(KEY_STORAGE);
        authPanel.hidden = false;
        app.hidden = true;
        showAuthError(e.message || "Could not unlock. Check your key and try again.");
      })
      .finally(function () {
        if (saveKeyBtn) saveKeyBtn.disabled = false;
      });
  }

  if (authForm) {
    authForm.addEventListener("submit", function (e) {
      e.preventDefault();
      unlock();
    });
  } else if (saveKeyBtn) {
    saveKeyBtn.addEventListener("click", unlock);
  }
  refreshBtn.addEventListener("click", function () {
    load().catch(function (e) {
      alert(e.message);
    });
  });

  const existing = getKey();
  if (existing) {
    adminKeyInput.value = existing;
    unlock();
  }
})();
