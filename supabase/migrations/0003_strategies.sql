create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  level text not null check (level in ('eenvoudig', 'normaal', 'uitgebreid')),
  period_months integer not null check (period_months in (3, 6, 9)),
  channels text[] not null default '{}',
  starts_on date not null,
  conversation jsonb not null default '{}'::jsonb,
  document jsonb not null default '{}'::jsonb,
  data_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategies_project_id_idx on public.strategies (project_id);

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at
  before update on public.strategies
  for each row execute function public.set_updated_at();

alter table public.posts
  add column if not exists strategy_id uuid references public.strategies (id) on delete set null;

alter table public.strategies enable row level security;

drop policy if exists strategies_all on public.strategies;
create policy strategies_all on public.strategies
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

notify pgrst, 'reload schema';
