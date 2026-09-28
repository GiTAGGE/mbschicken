# MBS Chicken Centre — Hubballi

Mobile-first ordering website + lightweight operations CRM for **WhatsApp / call → 30% advance → delivery → balance** workflow.

## Stack

| Layer | Service |
|--------|---------|
| Website | Static `public/` on **Netlify** |
| API | **Netlify Functions** (`netlify/functions/`) |
| Database | **Supabase** (PostgreSQL) |

## Deploy (Netlify)

1. Connect this repo to Netlify.
2. Build settings (also in `netlify.toml`):
   - **Build command:** `python3 scripts/build-site.py`
   - **Publish directory:** `public`
3. Set environment variables (see [`.env.example`](.env.example)):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MBS_ADMIN_API_KEY` (staff dashboard)
   - Optional: `MBS_ADVANCE_PERCENT` (default `30`)
4. Deploy. Custom domain: `mbschicken.com` when ready.

## Supabase setup

1. Create a Supabase project.
2. Run SQL from [`supabase/migrations/001_mbs_initial.sql`](supabase/migrations/001_mbs_initial.sql) in the SQL editor.
3. Copy project URL + **service role** key into Netlify env vars (never expose service role on the public site).

## Local preview

```bash
python3 scripts/build-site.py
npx netlify-cli dev   # optional, requires Netlify CLI + env vars
```

Source homepage demo: `mbschicken-homepage-improved.html` (rebuilt into `public/index.html`).

## Staff dashboard

- URL: `/admin/`
- Unlock with `MBS_ADMIN_API_KEY`
- Mobile-friendly order status buttons (advance received → preparing → delivery → delivered)

## Customer flows

- **WhatsApp / Call** primary CTAs on every product
- **Delivery checker** + **quick enquiry** → Supabase `leads` / `delivery_checks`
- **30% advance policy** section (Canara merchant QR — send manually via WhatsApp for now)

## Phase 2 (not in this PR)

- Meta Lead Form webhook
- WhatsApp Business API + payment QR automation
- Dynamic UPI amount QR when Canara API is available
