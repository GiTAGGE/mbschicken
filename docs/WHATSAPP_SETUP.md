# MBS WhatsApp Business API — what you need to do

Today the admin uses **WhatsApp click-to-chat** (`wa.me`) with pre-filled messages. That works without Meta approval. **Automatic** send/receive needs the **WhatsApp Business Platform** (Cloud API).

## Phase A — Now (no API)

- Staff taps **WhatsApp** in admin → opens chat with the customer on **99014 67970**.
- Templates: advance request, order confirmed, out for delivery, balance due.
- You send **Canara merchant QR** as an image manually in WhatsApp.

Nothing else required from Meta.

---

## Phase B — Automatic WhatsApp (Meta Cloud API)

### 1. Meta Business

1. Create or use [Meta Business Suite](https://business.facebook.com/).
2. Verify the business (documents may be required).

### 2. WhatsApp product

1. [Meta Developers](https://developers.facebook.com/) → **Create app** → type **Business**.
2. Add product **WhatsApp** → **API Setup**.
3. Add a phone number (can migrate from WhatsApp Business app in some cases, or use a new number — confirm with Meta for India).

### 3. Credentials (for Netlify env vars)

| Netlify variable | Where to find it |
|------------------|------------------|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp → API Setup → temporary token (later: System User permanent token) |
| `WHATSAPP_PHONE_NUMBER_ID` | API Setup → Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | You choose a random string for webhook verification |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp → API Setup (optional, for templates) |

### 4. Webhook (incoming messages → CRM)

1. Netlify URL: `https://mbschicken.com/.netlify/functions/whatsapp-webhook`
2. In Meta → WhatsApp → **Configuration** → Webhook:
   - Callback URL: (above)
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe: `messages`, `message_status` (optional)
3. Redeploy Netlify after env vars are set.

### 5. Message templates

Outside the **24-hour customer service window**, outbound messages must use **approved templates** (e.g. `order_confirmed`, `advance_payment`, `out_for_delivery`). Create them in **WhatsApp Manager → Message templates** (English + optional Kannada).

### 6. India / compliance

- Use a number and business name consistent with **MBS Chicken Centre**.
- Keep opt-in: customers message you first or submit the website enquiry form.

### 7. After credentials are in Netlify

Admin **Send via API** buttons will call `whatsapp-send` instead of only opening `wa.me`. Incoming replies can be logged to `activity_log` (webhook handler).

---

## Checklist (your side)

- [ ] Meta Business verified  
- [ ] WhatsApp Cloud API app created  
- [ ] Phone number connected to API  
- [ ] Permanent access token (not 24h test token)  
- [ ] Webhook verified on `whatsapp-webhook`  
- [ ] Templates submitted and **approved**  
- [ ] Env vars added in Netlify + redeploy  
- [ ] Test message to your own phone from admin  

---

## Canara UPI + WhatsApp

API can send **text** and **image** (hosted QR URL in Supabase Storage or Netlify asset). Upload merchant QR once to **Supabase Storage** (public bucket) and set `MBS_MERCHANT_QR_URL` in Netlify for automated advance messages.
