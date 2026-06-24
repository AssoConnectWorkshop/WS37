-- New associations table (replaces the cerfa_association singleton)
create table if not exists cerfa_associations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nom text not null default 'Mon association',
  data jsonb not null default '{}'::jsonb
);

alter table cerfa_associations enable row level security;

create policy "Public access cerfa_associations"
  on cerfa_associations for all using (true) with check (true);

create or replace function update_cerfa_associations_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger cerfa_associations_updated_at
  before update on cerfa_associations
  for each row execute function update_cerfa_associations_updated_at();

-- Add association_id to projects
alter table cerfa_projects
  add column if not exists association_id uuid references cerfa_associations(id) on delete set null;

-- Migrate data from old singleton cerfa_association (if it exists and has data)
do $$
declare
  new_id uuid;
  old_data jsonb;
begin
  if exists (select 1 from information_schema.tables where table_name = 'cerfa_association') then
    select data into old_data from cerfa_association where id = 1;
    if old_data is not null and old_data != '{}'::jsonb then
      insert into cerfa_associations (nom, data) values ('Mon association', old_data) returning id into new_id;
      update cerfa_projects set association_id = new_id where association_id is null;
    end if;
    drop table cerfa_association;
  end if;
end $$;
