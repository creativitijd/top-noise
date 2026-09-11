create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  website_url text,
  industry text,
  tone_of_voice text,
  target_audience text,
  goals text,
  visual_guidelines text,
  timezone text not null default 'Europe/Brussels',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram', 'wordpress')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'expired', 'error')),
  account_label text,
  external_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, platform)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  pillar_id uuid references public.content_pillars (id) on delete set null,
  topic text not null,
  title text,
  explanation text,
  visual_brief text,
  scheduled_at timestamptz not null,
  timezone text not null default 'Europe/Brussels',
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram', 'wordpress')),
  content text not null default '',
  hashtags text[] not null default '{}',
  status text not null default 'draft' check (
    status in ('draft', 'ready', 'publishing', 'published', 'failed')
  ),
  remote_id text,
  last_error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  platform text check (platform in ('linkedin', 'facebook', 'instagram', 'wordpress')),
  storage_path text,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  post_target_id uuid not null references public.post_targets (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  scheduled_for timestamptz not null,
  idempotency_key text not null unique,
  attempts int not null default 0,
  claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_target_id uuid not null references public.post_targets (id) on delete cascade,
  captured_at timestamptz not null default now(),
  impressions int not null default 0,
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  clicks int not null default 0,
  raw jsonb not null default '{}'::jsonb
);

create table public.platform_interest (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, platform)
);

create index idx_org_members_user on public.organization_members (user_id);
create index idx_projects_org on public.projects (organization_id);
create index idx_pillars_project on public.content_pillars (project_id);
create index idx_channels_project on public.channels (project_id);
create index idx_posts_project_schedule on public.posts (project_id, scheduled_at);
create index idx_post_targets_post on public.post_targets (post_id);
create index idx_media_post on public.media (post_id);
create index idx_jobs_due on public.publish_jobs (status, scheduled_for);
create index idx_snapshots_target on public.analytics_snapshots (post_target_id, captured_at desc);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger channels_updated_at before update on public.channels
  for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger post_targets_updated_at before update on public.post_targets
  for each row execute function public.set_updated_at();
create trigger publish_jobs_updated_at before update on public.publish_jobs
  for each row execute function public.set_updated_at();

create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = _org_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_access_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = _project_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.ensure_personal_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select om.organization_id into org_id
  from public.organization_members om
  where om.user_id = uid
  order by om.created_at
  limit 1;

  if org_id is not null then
    return org_id;
  end if;

  insert into public.organizations (name, slug)
  values (
    'Persoonlijke workspace',
    'org-' || substr(replace(uid::text, '-', ''), 1, 12)
  )
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, uid, 'owner');

  return org_id;
end;
$$;

create or replace function public.claim_publish_jobs(batch_size int default 10)
returns setof public.publish_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select j.id
    from public.publish_jobs j
    where j.status = 'pending'
      and j.scheduled_for <= now()
      and j.attempts < 8
    order by j.scheduled_for
    limit greatest(batch_size, 1)
    for update skip locked
  )
  update public.publish_jobs j
  set
    status = 'running',
    claimed_at = now(),
    attempts = j.attempts + 1,
    updated_at = now()
  from due
  where j.id = due.id
  returning j.*;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.content_pillars enable row level security;
alter table public.channels enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;
alter table public.media enable row level security;
alter table public.publish_jobs enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.platform_interest enable row level security;

create policy organizations_select on public.organizations
  for select using (public.is_org_member(id));
create policy organizations_update on public.organizations
  for update using (public.is_org_member(id));

create policy org_members_select on public.organization_members
  for select using (public.is_org_member(organization_id));

create policy projects_select on public.projects
  for select using (public.is_org_member(organization_id));
create policy projects_insert on public.projects
  for insert with check (public.is_org_member(organization_id));
create policy projects_update on public.projects
  for update using (public.is_org_member(organization_id));
create policy projects_delete on public.projects
  for delete using (public.is_org_member(organization_id));

create policy pillars_all on public.content_pillars
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy channels_select on public.channels
  for select using (public.can_access_project(project_id));

create policy posts_all on public.posts
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy post_targets_all on public.post_targets
  for all using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.can_access_project(p.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.can_access_project(p.project_id)
    )
  );

create policy media_all on public.media
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy jobs_select on public.publish_jobs
  for select using (
    exists (
      select 1
      from public.post_targets t
      join public.posts p on p.id = t.post_id
      where t.id = post_target_id and public.can_access_project(p.project_id)
    )
  );

create policy snapshots_select on public.analytics_snapshots
  for select using (
    exists (
      select 1
      from public.post_targets t
      join public.posts p on p.id = t.post_id
      where t.id = post_target_id and public.can_access_project(p.project_id)
    )
  );

create policy interest_all on public.platform_interest
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

revoke all on function public.claim_publish_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_publish_jobs(int) to service_role;
grant execute on function public.ensure_personal_organization() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_access_project(uuid) to authenticated;

revoke select (access_token, refresh_token) on public.channels from authenticated, anon;
revoke insert (access_token, refresh_token) on public.channels from authenticated, anon;
revoke update (access_token, refresh_token) on public.channels from authenticated, anon;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy post_images_public_read
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy post_images_authenticated_write
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images');

create policy post_images_authenticated_update
  on storage.objects for update to authenticated
  using (bucket_id = 'post-images');

create policy post_images_authenticated_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images');
