alter table public.projects
  add column if not exists country text not null default 'NL',
  add column if not exists region text;

notify pgrst, 'reload schema';
