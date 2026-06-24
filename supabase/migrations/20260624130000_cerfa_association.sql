create table if not exists cerfa_association (
  id integer primary key default 1 check (id = 1),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

alter table cerfa_association enable row level security;

create policy "Public access cerfa_association"
  on cerfa_association
  for all
  using (true)
  with check (true);

insert into cerfa_association (id, data) values (1, '{}') on conflict do nothing;
