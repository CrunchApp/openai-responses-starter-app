-- -----------------------------------------------------------------------------
-- Migration: Create Profile Tables
-- 
-- Description: 
-- Creates the profiles and user_profiles tables for storing user profile information.
-- The profiles table stores basic user information, while user_profiles stores 
-- the complete profile data as JSON including references to vector stores.
--
-- Both tables are secured with Row Level Security (RLS) to ensure users can only
-- access their own profile data.
-- -----------------------------------------------------------------------------

-- create profiles table for basic user information
create table if not exists public.profiles (
    id uuid references auth.users(id) primary key,
    first_name text not null,
    last_name text not null,
    email text not null,
    phone text,
    preferred_name text,
    linkedin_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable row level security on profiles table
alter table public.profiles enable row level security;

-- create policies for the profiles table
-- policies for authenticated users
create policy "authenticated users can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "authenticated users can create their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "authenticated users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

create policy "authenticated users can delete their own profile"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

-- policies for anonymous users (restricted access)
create policy "anonymous users cannot view profiles"
on public.profiles for select
to anon
using (false);

create policy "anonymous users cannot create profiles"
on public.profiles for insert
to anon
with check (false);

create policy "anonymous users cannot update profiles"
on public.profiles for update
to anon
using (false);

create policy "anonymous users cannot delete profiles"
on public.profiles for delete
to anon
using (false);

-- create user_profiles table for complete profile data
create table if not exists public.user_profiles (
    id uuid references public.profiles(id) primary key,
    profile_data jsonb not null,
    vector_store_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable row level security on user_profiles table
alter table public.user_profiles enable row level security;

-- create policies for the user_profiles table
-- policies for authenticated users
create policy "authenticated users can view their own complete profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = id);

create policy "authenticated users can create their own complete profile"
on public.user_profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "authenticated users can update their own complete profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = id);

create policy "authenticated users can delete their own complete profile"
on public.user_profiles for delete
to authenticated
using (auth.uid() = id);

-- policies for anonymous users (restricted access)
create policy "anonymous users cannot view complete profiles"
on public.user_profiles for select
to anon
using (false);

create policy "anonymous users cannot create complete profiles"
on public.user_profiles for insert
to anon
with check (false);

create policy "anonymous users cannot update complete profiles"
on public.user_profiles for update
to anon
using (false);

create policy "anonymous users cannot delete complete profiles"
on public.user_profiles for delete
to anon
using (false);

-- add comment to explain table purposes
comment on table public.profiles is 'Basic profile information for users';
comment on table public.user_profiles is 'Complete profile data including vector store references'; 