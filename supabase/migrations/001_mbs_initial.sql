-- MBS Chicken Centre — Phase 1 operational schema
-- Run in Supabase SQL editor or via CLI

create extension if not exists "pgcrypto";

-- Lead sources reference
create table if not exists public.lead_sources (
  id text primary key,
  label text not null
);

insert into public.lead_sources (id, label) values
  ('website', 'Website'),
  ('whatsapp', 'WhatsApp'),
  ('phone', 'Phone'),
  ('meta', 'Meta Lead Form'),
  ('google', 'Google'),
  ('walk_in', 'Walk-in'),
  ('other', 'Other')
on conflict (id) do nothing;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text unique,
  name text not null,
  phone text not null,
  whatsapp text,
  area text,
  message text,
  source text default 'website',
  campaign text,
  ad_set text,
  ad_name text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'NEW' check (status in (
    'NEW', 'CONTACTED', 'INTERESTED', 'ORDER_CREATED', 'LOST', 'CANCELLED'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_lead_code()
returns trigger language plpgsql as $$
begin
  if new.lead_code is null then
    new.lead_code := 'MBS-L-' || to_char(nextval('lead_code_seq'), 'FM000000');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create sequence if not exists lead_code_seq start 183;

drop trigger if exists trg_lead_code on public.leads;
create trigger trg_lead_code before insert on public.leads
for each row execute function public.set_lead_code();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  whatsapp text,
  area text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  unit text default 'kg',
  price_inr numeric(10,2),
  active boolean default true,
  sort_order int default 0
);

insert into public.products (slug, name, sort_order) values
  ('whole', 'Whole Chicken', 1),
  ('curry', 'Curry Cut', 2),
  ('skinless', 'Skinless', 3),
  ('boneless', 'Boneless Breast', 4),
  ('drumstick', 'Drumstick', 5),
  ('liver', 'Liver & Gizzard', 6)
on conflict (slug) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  customer_id uuid references public.customers(id),
  customer_name text not null,
  customer_phone text not null,
  area text,
  notes text,
  status text not null default 'ADVANCE_PENDING' check (status in (
    'NEW_LEAD', 'CONTACTED', 'INTERESTED', 'ORDER_CREATED',
    'ADVANCE_PENDING', 'PAYMENT_REVIEW', 'CONFIRMED', 'PREPARING',
    'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAYMENT_COMPLETE', 'CANCELLED'
  )),
  total_amount numeric(10,2) not null default 0,
  advance_required numeric(10,2) not null default 0,
  advance_paid numeric(10,2) not null default 0,
  balance_due numeric(10,2) not null default 0,
  balance_paid numeric(10,2) not null default 0,
  payment_status text default 'UNPAID' check (payment_status in ('UNPAID', 'PARTIAL', 'PAID')),
  source text default 'website',
  lead_id uuid references public.leads(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists order_code_seq start 1042;

create or replace function public.set_order_code()
returns trigger language plpgsql as $$
begin
  if new.order_code is null then
    new.order_code := 'MBS-' || to_char(nextval('order_code_seq'), 'FM0000');
  end if;
  new.balance_due := coalesce(new.total_amount, 0) - coalesce(new.advance_paid, 0);
  if new.advance_paid >= new.advance_required and new.advance_required > 0 then
    new.payment_status := case when new.balance_paid >= new.balance_due and new.balance_due <= 0 then 'PAID' else 'PARTIAL' end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_order_code on public.orders;
create trigger trg_order_code before insert or update on public.orders
for each row execute function public.set_order_code();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_name text not null,
  quantity numeric(10,2) not null default 1,
  unit text default 'kg',
  line_total numeric(10,2) not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_type text not null check (payment_type in ('ADVANCE', 'BALANCE', 'FULL')),
  method text default 'UPI' check (method in ('UPI', 'CASH', 'ONLINE', 'OTHER')),
  verified boolean default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_checks (
  id uuid primary key default gen_random_uuid(),
  area text,
  pin text,
  deliverable boolean,
  source text default 'website',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.delivery_checks enable row level security;

-- Service role (Netlify functions) bypasses RLS; anon has no direct access by default.
