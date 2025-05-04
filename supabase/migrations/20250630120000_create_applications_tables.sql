-- Migration: Create applications tracking tables
-- Purpose: Introduce tables to centralise and track user applications and their tasks
-- ------------------------------------------------------------
-- This migration creates the core schema required for the new
-- AI-assisted application-management feature. It adds two tables:
-- 1. applications       – one row per program application.
-- 2. application_tasks  – granular checklist items/tasks attached to an application.
--
-- Row Level Security (RLS) is enabled on both tables with policies
-- that allow access only to the owning authenticated user.
-- ------------------------------------------------------------

-- 1. applications ---------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  -- OpenAI file ids that hold the source context for generation
  profile_file_id text,
  program_file_id text,
  status text not null default 'in_progress',
  checklist jsonb,                          -- cached generated checklist (optional)
  timeline jsonb,                           -- cached generated timeline  (optional)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Always keep updated_at current
create or replace function public.set_applications_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_applications_updated_at
before update on public.applications
for each row execute function public.set_applications_updated_at();

-- Enable RLS --------------------------------------------------------------
alter table public.applications enable row level security;

-- Policy: allow owners full access
create policy applications_owner_select on public.applications
  for select using (auth.uid() = user_id);

create policy applications_owner_insert on public.applications
  for insert with check (auth.uid() = user_id);

create policy applications_owner_update on public.applications
  for update using (auth.uid() = user_id);

create policy applications_owner_delete on public.applications
  for delete using (auth.uid() = user_id);

-- 2. application_tasks ----------------------------------------------------
create table if not exists public.application_tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending',
  sort_order integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace function public.set_application_tasks_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_application_tasks_updated_at
before update on public.application_tasks
for each row execute function public.set_application_tasks_updated_at();

-- Enable RLS --------------------------------------------------------------
alter table public.application_tasks enable row level security;

-- Determine owning user via join on applications
create policy application_tasks_owner_select on public.application_tasks
  for select using (
    auth.uid() = (
      select user_id from public.applications a where a.id = application_id
    )
  );

create policy application_tasks_owner_insert on public.application_tasks
  for insert with check (
    auth.uid() = (
      select user_id from public.applications a where a.id = application_id
    )
  );

create policy application_tasks_owner_update on public.application_tasks
  for update using (
    auth.uid() = (
      select user_id from public.applications a where a.id = application_id
    )
  );

create policy application_tasks_owner_delete on public.application_tasks
  for delete using (
    auth.uid() = (
      select user_id from public.applications a where a.id = application_id
    )
  );

-- ------------------------------------------------------------------------
-- End of migration                                                         
-- ------------------------------------------------------------------------ 