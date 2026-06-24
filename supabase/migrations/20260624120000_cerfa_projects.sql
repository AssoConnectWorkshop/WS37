create table if not exists cerfa_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nom_projet text,
  nom_association text,
  siren text,
  financeur text,
  statut text not null default 'en_cours',
  generated_at timestamptz,
  completion_pct integer not null default 0,
  data jsonb not null default '{}'::jsonb
);

alter table cerfa_projects enable row level security;

create policy "Public access cerfa_projects"
  on cerfa_projects
  for all
  using (true)
  with check (true);

create or replace function update_cerfa_projects_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cerfa_projects_updated_at
  before update on cerfa_projects
  for each row execute function update_cerfa_projects_updated_at();
