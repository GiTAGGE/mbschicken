(function () {
  const cfg = window.MBS_CONFIG || {};
  const waBase = "https://wa.me/" + (cfg.whatsapp || "919901467970");

  function formatWhatsAppOrder(productName) {
    const lines = [
      "Hi MBS, I want to order:",
      "",
      productName ? "• " + productName + " — (qty: ___)" : "• (your items)",
      "",
      "Delivery location: ______",
      "Preferred delivery time: ______",
      "",
      "Please confirm price & availability.",
    ];
    return encodeURIComponent(lines.join("\n"));
  }

  function waUrl(message) {
    return waBase + "?text=" + (message || formatWhatsAppOrder());
  }

  document.querySelectorAll(".product").forEach(function (card) {
    const title = card.querySelector("h3");
    const name = title ? title.textContent.trim() : "Fresh Chicken";
    const body = card.querySelector(".productbody");
    const oldBtn = body && body.querySelector('a.btn[href="#contact"]');
    if (!body || !oldBtn) return;
    const wrap = document.createElement("div");
    wrap.className = "product-actions";
    wrap.innerHTML =
      '<a class="btn btn-wa" href="' +
      waUrl(formatWhatsAppOrder(name)) +
      '" target="_blank" rel="noopener">WhatsApp Order</a>' +
      '<a class="btn btn-call" href="tel:' +
      (cfg.phoneTel || "+919901467970") +
      '">Call to Order</a>';
    oldBtn.replaceWith(wrap);
  });

  const heroActions = document.querySelector(".hero .actions");
  if (heroActions) {
    const orderBtn = heroActions.querySelector('a.btn.red, a[href="#products"]');
    if (orderBtn && !heroActions.querySelector(".btn-wa-primary")) {
      const wa = document.createElement("a");
      wa.className = "btn btn-wa-primary";
      wa.href = waUrl(formatWhatsAppOrder());
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.textContent = "◉ WhatsApp Order";
      heroActions.insertBefore(wa, orderBtn.nextSibling);
    }
  }

  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");
  const overlay = document.getElementById("navOverlay");
  const header = document.querySelector("header");

  function closeMenu() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (overlay) overlay.hidden = true;
  }

  function openMenu() {
    if (!header) return;
    header.classList.add("nav-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    if (overlay) overlay.hidden = false;
  }

  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", function () {
      if (header.classList.contains("nav-open")) closeMenu();
      else openMenu();
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }
  if (overlay) overlay.addEventListener("click", closeMenu);

  if (document.querySelector(".mobilebar")) {
    document.body.classList.add("has-mobilebar");
  }

  const deliveryForm = document.getElementById("deliveryForm");
  const deliveryResult = document.getElementById("deliveryResult");

  function normalize(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function checkDelivery(area, pin) {
    const a = normalize(area);
    const p = (pin || "").replace(/\D/g, "");
    const areaHit = (cfg.deliveryAreas || []).some(function (z) {
      return a.includes(z) || z.includes(a);
    });
    const pinHit = p && (cfg.deliveryPins || []).indexOf(p) !== -1;
    if (areaHit || pinHit) {
      return { ok: true, message: "Good news — we likely deliver to your area. WhatsApp us to confirm slot & 30% advance." };
    }
    if (!a && !p) {
      return { ok: false, message: "Please enter your area or PIN code." };
    }
    return {
      ok: false,
      message:
        "This location may be outside our current delivery zone. Please call or WhatsApp — we will try to help.",
    };
  }

  if (deliveryForm && deliveryResult) {
    deliveryForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const fd = new FormData(deliveryForm);
      const area = fd.get("area");
      const pin = fd.get("pin");
      deliveryResult.hidden = false;
      deliveryResult.className = "checkresult";
      deliveryResult.textContent = "Checking…";

      try {
        const res = await fetch("/.netlify/functions/delivery-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, pin, source: "website" }),
        });
        const data = await res.json().catch(function () {
          return checkDelivery(area, pin);
        });
        const ok = data.deliverable !== false && data.ok !== false;
        deliveryResult.classList.add(ok ? "ok" : "warn");
        deliveryResult.textContent = data.message || (ok ? checkDelivery(area, pin).message : checkDelivery(area, pin).message);
      } catch (err) {
        const local = checkDelivery(area, pin);
        deliveryResult.classList.add(local.ok ? "ok" : "warn");
        deliveryResult.textContent = local.message;
      }
    });
  }

  const leadForm = document.getElementById("leadForm");
  const leadStatus = document.getElementById("leadStatus");

  function captureUtm() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      landing_page: window.location.pathname + window.location.search,
    };
  }

  if (leadForm && leadStatus) {
    leadForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      leadStatus.hidden = false;
      leadStatus.className = "form-status";
      leadStatus.textContent = "Sending…";
      const fd = new FormData(leadForm);
      const payload = {
        name: fd.get("name"),
        phone: fd.get("phone"),
        area: fd.get("area"),
        message: fd.get("message"),
        source: "website",
        ...captureUtm(),
      };
      try {
        const res = await fetch("/.netlify/functions/leads-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        leadStatus.classList.add("ok");
        leadStatus.textContent = data.message || "Thank you! We will contact you shortly on WhatsApp or phone.";
        leadForm.reset();
      } catch (err) {
        leadStatus.classList.add("err");
        leadStatus.textContent =
          "Could not submit online. Please WhatsApp us directly — we are ready to take your order.";
      }
    });
  }
})();
