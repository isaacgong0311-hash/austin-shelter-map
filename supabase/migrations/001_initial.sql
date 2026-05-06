-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Shelters table
create table shelters (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text not null,
  lat           float not null,
  lng           float not null,
  total_beds    int not null,
  bed_types     jsonb default '{"men": 0, "women": 0, "family": 0}'::jsonb,
  phone         text,
  contact_email text,
  created_at    timestamptz default now()
);

-- Bed counts (append-only log)
create table bed_counts (
  id                 uuid primary key default gen_random_uuid(),
  shelter_id         uuid references shelters(id) not null,
  available_beds     int not null,
  available_by_type  jsonb default '{}'::jsonb,
  notes              text,
  updated_at         timestamptz default now(),
  updated_by         uuid references auth.users(id)
);

-- User profiles
create table profiles (
  id          uuid primary key references auth.users(id),
  shelter_id  uuid references shelters(id),
  role        text check (role in ('staff', 'admin')),
  full_name   text
);

-- View: latest bed count per shelter
create view shelter_latest as
select distinct on (s.id)
  s.id,
  s.name,
  s.address,
  s.lat,
  s.lng,
  s.total_beds,
  s.bed_types,
  s.phone,
  bc.available_beds,
  bc.available_by_type,
  bc.notes,
  bc.updated_at
from shelters s
left join bed_counts bc on bc.shelter_id = s.id
order by s.id, bc.updated_at desc;

-- Seed 3 real Austin shelters
insert into shelters (name, address, lat, lng, total_beds, bed_types, phone) values
  ('ARCH (Austin Resource Center for the Homeless)', '500 E 7th St, Austin, TX 78701', 30.2643, -97.7358, 200, '{"men": 150, "women": 50, "family": 0}', '512-305-4100'),
  ('Salvation Army Austin', '501 E 8th St, Austin, TX 78701', 30.2653, -97.7355, 100, '{"men": 60, "women": 30, "family": 10}', '512-476-1111'),
  ('Caritas of Austin', '611 Neches St, Austin, TX 78701', 30.2689, -97.7393, 75, '{"men": 40, "women": 25, "family": 10}', '512-472-4135');

-- Row Level Security
alter table shelters enable row level security;
alter table bed_counts enable row level security;
alter table profiles enable row level security;

create policy "Public read shelters" on shelters for select using (true);
create policy "Public read bed_counts" on bed_counts for select using (true);
create policy "Staff insert bed_counts" on bed_counts for insert
  with check (auth.uid() = updated_by);
create policy "Users read own profile" on profiles for select
  using (auth.uid() = id);
