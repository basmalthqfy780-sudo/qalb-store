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

-- ============================================================
-- v1.7.0 · نموذج الربح: الحسابات وسوق المصممين
-- ------------------------------------------------------------
-- القواعد نفسها التي يحكم بها server/market.js ملفاته:
--   • الخطة لا تُرقّى من المتصفح: `plan` يكتبها موظف، و`plan_pending` طلب.
--   • الحالة تُشتق من قرار الفحص: لا مسار يكتب 'published' يدويًا.
--   • سعر البيع يُختم من الإدراج، وتقسيمه يُحسب عند التسجيل لا عند السحب.
-- ============================================================

create table if not exists public.accounts (
  id            text primary key,                 -- QA-XXXXXX
  email         citext not null unique,
  plan          text not null default 'free' check (plan in ('free','solo','pro')),
  plan_pending  text          check (plan_pending in ('solo','pro')),  -- طلبٌ، لا تفعيل
  plan_pending_at timestamptz,
  since         date not null default current_date,
  consent_v     text not null,                    -- نسخة نصّ الإقرار بالفحص الآلي
  consent_at    timestamptz not null,
  niche         text          check (niche in ('designer','photographer','developer','student','writer','engineer')),
  answers       jsonb not null default '{}'::jsonb,  -- منقّاة بنفس دالة المتصفح
  key           text not null,                    -- مفتاح صاحب الحساب، لا يُستعاد
  created_at    timestamptz not null default now()
);
create index if not exists accounts_plan_idx on public.accounts (plan);

-- قالبٌ أنشأه صاحب الحساب: عدّاد البوابة المجانية (واحد في free)
create table if not exists public.account_templates (
  account_id  text not null references public.accounts(id) on delete cascade,
  slug        text not null,
  template    text not null,
  created_at  timestamptz not null default now(),
  primary key (account_id, slug)
);

create table if not exists public.listings (
  id          text primary key,                   -- QM-XXXXXX
  account_id  text not null references public.accounts(id) on delete cascade,
  title       text not null check (char_length(title) between 6 and 70),
  descr       text not null check (char_length(descr) between 40 and 600),
  category    text not null default 'portfolio' check (category in ('portfolio','cv','bundle','kit')),
  price       numeric(10,2) not null check (price between 29 and 2000),
  tags        text[] not null default '{}',
  files       jsonb not null,                     -- الاسم والمحتوى: ما يفحصه الخط
  images      jsonb not null default '[]'::jsonb, -- البصمات، لا الصور نفسها
  rights_ok   boolean not null default false,     -- إقرار حقوق الأصول
  state       text not null default 'draft'
              check (state in ('draft','published','quarantined','rejected','frozen','delisted')),
  score       int  check (score between 0 and 100),
  verdict     text check (verdict in ('accept','quarantine','reject')),
  report      jsonb not null,                     -- تقرير الطبقات كاملًا
  appeal      jsonb,
  sales_count int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists listings_state_idx on public.listings (state, created_at desc);

-- بلاغ: حقوق الملكية تُجمّد الإدراج عند الثالثة (REPORT_FREEZE)
create table if not exists public.listing_reports (
  id          bigserial primary key,
  listing_id  text not null references public.listings(id) on delete cascade,
  kind        text not null check (kind in ('rights','malware','spam','other')),
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists listing_reports_idx on public.listing_reports (listing_id, kind);

-- بيعٌ مسجَّل: السعر مختم من الإدراج، والتقسيم محسوب لحظة التسجيل
create table if not exists public.listing_sales (
  id           text primary key,                  -- MS-XXXXXX
  listing_id   text not null references public.listings(id) on delete cascade,
  seller       citext not null,
  buyer        citext not null,
  price        numeric(10,2) not null,
  commission   numeric(10,2) not null,            -- 25% لحظة البيع
  seller_net   numeric(10,2) not null,
  release_on   date not null,                     -- sold_at + مدة التأمين (14 يومًا)
  charged      boolean not null default false,    -- لا بوابة دفع: سُجّل ولم يُقبض
  sold_at      date not null default current_date,
  created_at   timestamptz not null default now(),
  check (commission + seller_net = price)         -- لا هللة ضائعة بين الطرفين
);
create index if not exists listing_sales_seller_idx on public.listing_sales (lower(seller), release_on);

-- ما تحرّر وما انتظر، والحد الأدنى 100 ريال — نفس حساب payoutState في المتصفح
create or replace function public.payout_summary(p_seller text, p_on date default current_date)
returns table (released numeric, held numeric, eligible boolean)
language sql stable
as $$
  select
    coalesce(sum(seller_net) filter (where release_on <= p_on), 0)  as released,
    coalesce(sum(seller_net) filter (where release_on >  p_on), 0)  as held,
    coalesce(sum(seller_net) filter (where release_on <= p_on), 0) >= 100 as eligible
  from public.listing_sales
  where lower(seller) = lower(p_seller);
$$;

alter table public.accounts          enable row level security;
alter table public.account_templates enable row level security;
alter table public.listings          enable row level security;
alter table public.listing_reports   enable row level security;
alter table public.listing_sales     enable row level security;

-- العامة ترى المنشور وحده، وبلا بريد البائع ولا تفاصيل المخالفة
drop policy if exists "published listings are public" on public.listings;
create policy "published listings are public" on public.listings
  for select using (state = 'published');
