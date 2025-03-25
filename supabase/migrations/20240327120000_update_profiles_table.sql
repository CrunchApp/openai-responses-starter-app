-- Migration: Create profiles table for full user profile data
-- Purpose: Create a profiles table to store complete user profile information
-- Date: 2024-03-27

-- create the profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  preferred_name text,
  linkedin_profile text,
  goal text,
  desired_field text,
  education jsonb default '[]'::jsonb,
  career_goals jsonb default '{}'::jsonb,
  skills text[] default '{}'::text[],
  preferences jsonb default '{}'::jsonb,
  documents jsonb default '{}'::jsonb,
  vector_store_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ensure rls is enabled on the profiles table
alter table public.profiles enable row level security;

-- drop existing policies if any (to avoid conflicts)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Service role can manage all profiles" on public.profiles;

-- create rls policies for profiles table
-- policy for authenticated users to select their own profile
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- policy for authenticated users to update their own profile
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- policy for authenticated users to insert their own profile
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- policy for service role to manage all profiles
create policy "Service role can manage all profiles"
on public.profiles
for all
to service_role
using (true);

comment on table public.profiles is 'Stores user profile information including personal details, education, career goals, and preferences'; 