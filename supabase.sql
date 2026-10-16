-- Calculadora Fitness: tablas para Supabase.
-- Pégalo entero en SQL Editor → New query → Run.

create table if not exists profiles (
  id text primary key, name text not null, emoji text,
  kcal double precision, p double precision, c double precision, f double precision
);
create table if not exists foods (
  id text primary key, name text not null, cat text, basis text default 'g',
  kcal double precision, p double precision, c double precision, f double precision,
  unit_name text, unit_g double precision, owner text
);
create table if not exists entries (
  id text primary key, profile text not null, date text not null, food_id text, name text,
  qty double precision, basis text,
  kcal double precision, p double precision, c double precision, f double precision, ts bigint
);
create index if not exists entries_profile_date on entries (profile, date);
create table if not exists combos (
  id text primary key, profile text, name text, items jsonb
);

-- Sin login (selector de perfil): la app puede leer y escribir con la clave pública.
alter table profiles enable row level security;
alter table foods    enable row level security;
alter table entries  enable row level security;
alter table combos   enable row level security;
create policy "app" on profiles for all to anon using (true) with check (true);
create policy "app" on foods    for all to anon using (true) with check (true);
create policy "app" on entries  for all to anon using (true) with check (true);
create policy "app" on combos   for all to anon using (true) with check (true);
grant select, insert, update, delete on profiles, foods, entries, combos to anon;
