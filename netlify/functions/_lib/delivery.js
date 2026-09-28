const AREAS = [
  "vidya nagar",
  "vidyanagar",
  "gokul road",
  "deshpande nagar",
  "keshwapur",
  "old hubballi",
  "unkal",
  "navanagar",
  "hosur",
  "tarihal",
  "hubballi",
  "hubli",
];

const PINS = ["580020", "580021", "580023", "580024", "580025", "580026", "580028", "580029", "580030", "580031", "580032"];

function normalize(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function evaluateDelivery(area, pin) {
  const a = normalize(area);
  const p = (pin || "").replace(/\D/g, "");
  const areaHit = AREAS.some((z) => a.includes(z) || z.includes(a));
  const pinHit = p && PINS.includes(p);
  if (areaHit || pinHit) {
    return {
      deliverable: true,
      ok: true,
      message: "Good news — we likely deliver to your area. WhatsApp us to confirm slot & 30% advance.",
    };
  }
  if (!a && !p) {
    return { deliverable: false, ok: false, message: "Please enter your area or PIN code." };
  }
  return {
    deliverable: false,
    ok: false,
    message: "This location may be outside our current delivery zone. Please call or WhatsApp — we will try to help.",
  };
}

module.exports = { evaluateDelivery };
