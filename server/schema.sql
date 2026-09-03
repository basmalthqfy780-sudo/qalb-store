-- Qalb · الطلبات والتراخيص (Postgres / Supabase)
-- idempotent: يعاد تشغيله بأمان.

create table if not exists public.orders (
  id            text primary key,                 -- QALB-XXXXX-XXXX
  email         citext not null,
  name          text   not null,
  phone         text,
  country       text,
  currency      text   not null default 'SAR',
  subtotal      numeric(10,2) not null check (subtotal >= 0),
  discount      numeric(10,2) not null default 0,
  vat_rate      numeric(4,3)  not null default 0.15,
  vat           numeric(10,2) not null default 0,
  total         numeric(10,2) not null check (total >= 0),
  coupon        text,
  method        text not null,
  method_label  text,
  invoice       boolean not null default false,
  vat_no        text,
  status        text not null default 'paid' check (status in ('pending','paid','refunded','failed')),
  created_at    timestamptz not null default now()
);
create index if not exists orders_email_idx on public.orders (lower(email), created_at desc);

create table if not exists public.order_items (
  order_id  text not null references public.orders(id) on delete cascade,
  template  text not null,          -- tpl.id
  slug      text not null,
  qty       int    not null check (qty between 1 and 9),
  unit      numeric(10,2) not null, -- سعر الوحدة شامل الضريبة لحظة الشراء
  primary key (order_id, template)
);

-- مفتاح ترخيص شخصي: مقعد واحد، بلا انتهاء، قابل للإلغاء
create table if not exists public.licences (
  key        text primary key,       -- XXXX-XXXX-XXXX-XXXX
  order_id   text not null references public.orders(id) on delete cascade,
  email      citext not null,
  seats      int not null default 1,
  domains    text not null default '*',
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists licences_email_idx on public.licences (lower(email));

-- منع تكرار الطلب عند إعادة الإرسال بنفس المفتاح (Idempotency-Key)
create table if not exists public.idempotency (
  key        text primary key,
  order_id   text not null,
  created_at timestamptz not null default now()
);

-- دالة تتحقق من صلاحية مفتاح (تُستعمل من /licences/:key ومن أي SaaS لاحقًا)
create or replace function public.licence_is_valid(p_key text)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.licences l
    join public.orders o on o.id = l.order_id
    where l.key = p_key and not l.revoked and o.status = 'paid'
  );
$$;

-- Supabase RLS: اللوحة العامة للاطلاع فقط، والكتابة عبر service role
alter table public.orders    enable row level security;
alter table public.order_items enable row level security;
alter table public.licences  enable row level security;

drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
