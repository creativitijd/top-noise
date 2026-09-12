create table if not exists public.project_data_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  provider text not null check (provider in ('ga4', 'gsc')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'expired', 'error')),
  account_label text,
  external_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  snapshot jsonb,
  snapshot_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider)
);

create index if not exists project_data_sources_project_id_idx on public.project_data_sources (project_id);

drop trigger if exists project_data_sources_set_updated_at on public.project_data_sources;
create trigger project_data_sources_set_updated_at
  before update on public.project_data_sources
  for each row execute function public.set_updated_at();

alter table public.project_data_sources enable row level security;

drop policy if exists project_data_sources_all on public.project_data_sources;
create policy project_data_sources_all on public.project_data_sources
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

notify pgrst, 'reload schema';
