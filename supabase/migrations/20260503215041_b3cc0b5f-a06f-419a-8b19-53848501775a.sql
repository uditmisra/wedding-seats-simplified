
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null default 'Untitled Wedding',
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null,
  party text,
  rsvp text not null default 'pending',
  meal text,
  side text,
  is_kid boolean not null default false,
  accessibility text,
  notes text,
  created_at timestamptz not null default now()
);
create index guests_plan_idx on public.guests(plan_id);

create table public.tables_def (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null,
  capacity int not null default 8,
  shape text not null default 'round',
  x float not null default 0,
  y float not null default 0,
  rotation float not null default 0,
  created_at timestamptz not null default now()
);
create index tables_plan_idx on public.tables_def(plan_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  table_id uuid not null references public.tables_def(id) on delete cascade,
  seat_index int,
  pinned boolean not null default false
);
create index assignments_plan_idx on public.assignments(plan_id);
create index assignments_table_idx on public.assignments(table_id);

create table public.constraints_def (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  guest_a uuid not null references public.guests(id) on delete cascade,
  guest_b uuid not null references public.guests(id) on delete cascade,
  kind text not null
);
create index constraints_plan_idx on public.constraints_def(plan_id);

alter table public.plans enable row level security;
alter table public.guests enable row level security;
alter table public.tables_def enable row level security;
alter table public.assignments enable row level security;
alter table public.constraints_def enable row level security;

-- Open access (single shared plan model — anyone with the code/URL can edit)
create policy "public read plans" on public.plans for select using (true);
create policy "public insert plans" on public.plans for insert with check (true);
create policy "public update plans" on public.plans for update using (true);
create policy "public delete plans" on public.plans for delete using (true);

create policy "public all guests" on public.guests for all using (true) with check (true);
create policy "public all tables" on public.tables_def for all using (true) with check (true);
create policy "public all assignments" on public.assignments for all using (true) with check (true);
create policy "public all constraints" on public.constraints_def for all using (true) with check (true);
