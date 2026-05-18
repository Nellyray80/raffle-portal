-- ============================================================
--  TrustWallet Raffle Portal — Supabase Database Schema
--  Paste this entire file into your Supabase SQL Editor and Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── BENEFICIARIES ───────────────────────────────────────────
create table public.beneficiaries (
  id                uuid        default uuid_generate_v4() primary key,
  username          text        unique not null,
  password          text        not null,
  first_name        text        not null,
  last_name         text        not null,
  dob               date        not null,
  address           text        not null,
  phone             text        not null,
  email             text        not null,
  id_type           text        not null,
  id_number         text        not null,
  state             text        not null,
  raffle_code       text        not null,
  account_id        text        unique not null,
  account_balance   numeric     not null default 142000,
  account_status    text        not null default 'pending'
                    check (account_status in ('pending','active','suspended')),
  guarantor_status  text        not null default 'not-invited'
                    check (guarantor_status in ('not-invited','invited','signed-up')),
  admin_notes       text,
  created_at        timestamptz default now()
);

-- ─── GUARANTORS ──────────────────────────────────────────────
create table public.guarantors (
  id              uuid        default uuid_generate_v4() primary key,
  username        text        unique not null,
  password        text        not null,
  first_name      text        not null,
  last_name       text        not null,
  dob             date        not null,
  address         text        not null,
  phone           text        not null,
  email           text        not null,
  id_type         text        not null,
  id_number       text        not null,
  state           text        not null,
  emp_status      text        not null,
  occupation      text        not null,
  employer        text        not null,
  beneficiary_id  uuid        references public.beneficiaries(id),
  created_at      timestamptz default now()
);

-- ─── GUARANTOR INVITES ───────────────────────────────────────
create table public.guarantor_invites (
  id               uuid        default uuid_generate_v4() primary key,
  beneficiary_id   uuid        references public.beneficiaries(id),
  guarantor_name   text        not null,
  guarantor_email  text        not null,
  guarantor_phone  text        not null,
  status           text        not null default 'pending'
                   check (status in ('pending','accepted')),
  created_at       timestamptz default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table public.notifications (
  id              uuid        default uuid_generate_v4() primary key,
  recipient_id    uuid        not null,
  recipient_type  text        not null check (recipient_type in ('beneficiary','guarantor')),
  title           text        not null,
  message         text        not null,
  type            text        not null default 'info'
                  check (type in ('info','success','warning','error')),
  is_read         boolean     not null default false,
  created_at      timestamptz default now()
);

-- ─── POPUP MESSAGES ──────────────────────────────────────────
create table public.popup_messages (
  id              uuid        default uuid_generate_v4() primary key,
  recipient_id    uuid,       -- NULL = show to all matching recipient_type
  recipient_type  text        check (recipient_type in ('beneficiary','guarantor','all')),
  title           text        not null,
  body            text        not null,
  type            text        not null default 'info'
                  check (type in ('info','success','warning','error')),
  is_active       boolean     not null default true,
  show_once       boolean     not null default true,
  created_at      timestamptz default now()
);

-- ─── POPUP SEEN LOG ──────────────────────────────────────────
create table public.popup_seen (
  id        uuid        default uuid_generate_v4() primary key,
  popup_id  uuid        references public.popup_messages(id) on delete cascade,
  user_id   uuid        not null,
  seen_at   timestamptz default now(),
  unique(popup_id, user_id)
);

-- ─── LINKED BANK ACCOUNTS ────────────────────────────────────
create table public.linked_accounts (
  id              uuid        default uuid_generate_v4() primary key,
  beneficiary_id  uuid        references public.beneficiaries(id),
  bank_name       text        not null,
  account_number  text        not null,
  routing_number  text        not null,
  account_type    text        not null,
  status          text        not null default 'pending'
                  check (status in ('pending','verified','rejected')),
  created_at      timestamptz default now()
);

-- ─── TRANSACTIONS ────────────────────────────────────────────
create table public.transactions (
  id                   uuid        default uuid_generate_v4() primary key,
  requester_id         uuid        not null,
  requester_type       text        not null check (requester_type in ('beneficiary','guarantor')),
  on_behalf_of         uuid        references public.beneficiaries(id),
  amount               numeric     not null,
  bank_name            text        not null,
  account_number       text        not null,
  routing_number       text        not null,
  account_holder_name  text        not null,
  status               text        not null default 'pending'
                       check (status in ('pending','approved','rejected')),
  admin_note           text,
  created_at           timestamptz default now()
);

-- ─── DISABLE ROW LEVEL SECURITY (using anon key for all ops) ─
alter table public.beneficiaries     disable row level security;
alter table public.guarantors        disable row level security;
alter table public.guarantor_invites disable row level security;
alter table public.notifications     disable row level security;
alter table public.popup_messages    disable row level security;
alter table public.popup_seen        disable row level security;
alter table public.linked_accounts   disable row level security;
alter table public.transactions      disable row level security;
