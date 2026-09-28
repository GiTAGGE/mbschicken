#!/usr/bin/env python3
"""Assemble public/index.html from the improved homepage demo + MBS enhancements."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "mbschicken-homepage-improved.html"
PUBLIC = ROOT / "public"

ENHANCEMENT_CSS = PUBLIC / "css" / "enhancements.css"
ENHANCEMENT_CSS.parent.mkdir(parents=True, exist_ok=True)

if not ENHANCEMENT_CSS.exists():
    ENHANCEMENT_CSS.write_text("", encoding="utf-8")

text = SOURCE.read_text(encoding="utf-8")
style_match = re.search(r"<style>(.*?)</style>", text, re.DOTALL)
body_match = re.search(r"<body>(.*)</body>", text, re.DOTALL)
if not style_match or not body_match:
    raise SystemExit("Could not parse source HTML")

base_css = style_match.group(1)
enhance_css = ENHANCEMENT_CSS.read_text(encoding="utf-8")
(PUBLIC / "css" / "mbs.css").write_text(base_css + "\n" + enhance_css, encoding="utf-8")

body = body_match.group(1)

body = re.sub(
    r"<header><div class=\"wrap nav\">",
    '<header><div class="wrap nav"><button type="button" class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">☰</button>',
    body,
    count=1,
)

# Product WhatsApp order buttons
products = [
    ("Whole Chicken", "whole"),
    ("Curry Cut", "curry"),
    ("Skinless", "skinless"),
    ("Boneless Breast", "boneless"),
    ("Drumstick", "drumstick"),
    ("Liver & Gizzard", "liver"),
]
for name, slug in products:
    body = body.replace(
        f"<h3>{name}</h3>",
        f'<h3>{name}</h3><p class="product-note">Price confirmed on WhatsApp</p>',
        1,
    )

policy_block = """
<section class="section policy" id="delivery-policy">
<div class="wrap policygrid">
<div>
<div class="eyebrow">DELIVERY POLICY</div>
<h2>30% advance for home delivery</h2>
<p class="copy">Delivery orders need a <strong>30% advance</strong> via UPI (Canara Bank merchant QR). After we verify payment: <strong>Order confirmed → Chicken prepared → Delivered → Balance collected</strong>.</p>
<ul class="policylist">
<li>Advance secures your slot and fresh preparation</li>
<li>Balance payable on delivery (UPI or cash)</li>
<li>Pickup / walk-in orders: call or WhatsApp us</li>
</ul>
</div>
<div class="policycard">
<div class="policyrow"><span>Order total</span><strong id="policyDemoTotal">₹800</strong></div>
<div class="policyrow accent"><span>Advance (30%)</span><strong id="policyDemoAdvance">₹240</strong></div>
<div class="policyrow"><span>Balance on delivery</span><strong id="policyDemoBalance">₹560</strong></div>
<p class="policynote">Example calculation — your final amount is confirmed on WhatsApp.</p>
</div>
</div>
</section>
"""

delivery_block = """
<section class="section delivery-check" id="delivery">
<div class="wrap deliverywrap">
<div>
<div class="eyebrow">SERVICE AREA</div>
<h2>Check delivery availability</h2>
<p class="copy">We deliver fresh chicken across Hubballi. Enter your area or PIN to see if you are in our current delivery zone (approx. 2–3 km from MBS).</p>
<form class="checkform" id="deliveryForm">
<label for="areaInput">Area / locality</label>
<input id="areaInput" name="area" placeholder="e.g. Vidya Nagar" autocomplete="address-level2" required>
<label for="pinInput">PIN code (optional)</label>
<input id="pinInput" name="pin" placeholder="e.g. 580021" inputmode="numeric" maxlength="6">
<button type="submit" class="btn green">Check availability</button>
</form>
<p class="checkresult" id="deliveryResult" hidden></p>
</div>
<div class="enquiry-card" id="enquiry">
<div class="eyebrow">QUICK ENQUIRY</div>
<h3>Send order details</h3>
<p class="copy">Prefer WhatsApp? Use the green buttons. Or leave a message — we will call you back.</p>
<form id="leadForm">
<input name="name" placeholder="Your name" required>
<input name="phone" placeholder="Mobile number" inputmode="tel" required>
<input name="area" placeholder="Delivery area">
<textarea name="message" placeholder="What would you like to order?" rows="3"></textarea>
<button type="submit" class="btn red">Submit enquiry</button>
<p class="form-status" id="leadStatus" hidden></p>
</form>
</div>
</div>
</section>
"""

if 'id="delivery-policy"' not in body:
    body = body.replace('<section class="section contact" id="contact">', policy_block + delivery_block + '<section class="section contact" id="contact">', 1)

# Nav links
body = body.replace(
    '<nav><a href="#farm">Our Farm</a>',
    '<nav id="mainNav"><a href="#farm">Our Farm</a>',
    1,
)
body = body.replace(
    '<a href="#why">Why MBS</a><a href="#contact">Contact</a>',
    '<a href="#why">Why MBS</a><a href="#delivery-policy">Delivery</a><a href="#contact">Contact</a>',
    1,
)

head = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="MBS Chicken Centre Hubballi — farm fresh chicken, hygienic cuts, home delivery. Order on WhatsApp or call.">
<meta name="theme-color" content="#004b32">
<title>MBS Chicken Centre | Hubballi</title>
<link rel="stylesheet" href="/css/mbs.css">
</head>
"""

overlay = '<div class="nav-overlay" id="navOverlay" hidden></div>'

html = head + "<body>\n" + overlay + body + '\n<script src="/js/mbs-config.js"></script>\n<script src="/js/mbs.js"></script>\n</body>\n</html>\n'
PUBLIC.mkdir(parents=True, exist_ok=True)
(PUBLIC / "index.html").write_text(html, encoding="utf-8")
print("Wrote", PUBLIC / "index.html", "size", (PUBLIC / "index.html").stat().st_size)
