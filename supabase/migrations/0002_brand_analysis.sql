alter table public.projects
  add column if not exists brand_analysis jsonb,
  add column if not exists stylebook_path text,
  add column if not exists stylebook_url text;

insert into storage.buckets (id, name, public)
values ('stylebooks', 'stylebooks', false)
on conflict (id) do nothing;

drop policy if exists stylebooks_authenticated_select on storage.objects;
drop policy if exists stylebooks_authenticated_insert on storage.objects;
drop policy if exists stylebooks_authenticated_update on storage.objects;
drop policy if exists stylebooks_authenticated_delete on storage.objects;

create policy stylebooks_authenticated_select
  on storage.objects for select to authenticated
  using (bucket_id = 'stylebooks');

create policy stylebooks_authenticated_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'stylebooks');

create policy stylebooks_authenticated_update
  on storage.objects for update to authenticated
  using (bucket_id = 'stylebooks');

create policy stylebooks_authenticated_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'stylebooks');
