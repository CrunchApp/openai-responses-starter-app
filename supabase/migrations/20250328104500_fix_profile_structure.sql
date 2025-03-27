-- -----------------------------------------------------------------------------
-- Migration: Fix Profile Structure
-- 
-- Description: 
-- This migration ensures the consolidated profile structure is properly maintained.
-- It drops the user_profiles table if it exists, as we're using a consolidated
-- approach with all profile data in the profiles table.
--
-- Date: 2024-03-28
-- -----------------------------------------------------------------------------

-- Drop the user_profiles table if it exists (from the first migration)
drop table if exists public.user_profiles;

-- Ensure the profiles table has the correct structure
-- This is effectively a no-op if the table already exists with this structure
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

-- Ensure RLS is enabled
alter table public.profiles enable row level security;

-- Ensure the correct policies exist
-- First drop any policies that might conflict
drop policy if exists "authenticated users can view their own profile" on public.profiles;
drop policy if exists "authenticated users can create their own profile" on public.profiles;
drop policy if exists "authenticated users can update their own profile" on public.profiles;
drop policy if exists "authenticated users can delete their own profile" on public.profiles;
drop policy if exists "anonymous users cannot view profiles" on public.profiles;
drop policy if exists "anonymous users cannot create profiles" on public.profiles;
drop policy if exists "anonymous users cannot update profiles" on public.profiles;
drop policy if exists "anonymous users cannot delete profiles" on public.profiles;

-- Ensure the policies from the second migration exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Service role can manage all profiles" on public.profiles;

-- Create the policies again to ensure they exist
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Service role can manage all profiles"
on public.profiles
for all
to service_role
using (true);

-- Ensure the comment is updated
comment on table public.profiles is 'Stores user profile information including personal details, education, career goals, and preferences'; 