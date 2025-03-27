# Profile Data Migration Strategy

## Evolution of Profile Structure

The Vista Education Adviser database schema has evolved through several iterations:

### Initial Design (20250325030437_create_profile_tables.sql)

The initial design used a split approach with two tables:
- `profiles`: Basic user information (first_name, last_name, email, etc.)
- `user_profiles`: Complete profile data as JSON with vector store references

This approach separated basic profile data from the more complex structured data.

### Consolidated Approach (20250327120000_update_profiles_table.sql)

We later moved to a consolidated approach with a single `profiles` table that:
- Contains all user profile fields directly (basic info + structured data)
- Uses specific data types for each field rather than storing everything as JSON
- Includes fields for education, career goals, skills, and preferences
- Maintains vector store references

### Migration Fix (20250328104500_fix_profile_structure.sql)

To ensure database consistency, we created a migration that:
- Drops the unused `user_profiles` table if it exists
- Ensures the consolidated `profiles` table structure is maintained
- Reconciles any policy conflicts by ensuring only the current policies exist

## Current Profile Structure

The current profile structure uses a single table with the following fields:

```sql
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
```

## Row Level Security (RLS)

The profiles table is secured with Row Level Security policies that:
1. Allow authenticated users to view, insert, and update their own profiles
2. Allow the service role to manage all profiles
3. Do not include explicit policies for anonymous users (they have no access by default)

## Benefits of the Consolidated Approach

1. **Simplified Queries**: All profile data is accessible through a single table
2. **Type Safety**: Each field has its appropriate data type
3. **Performance**: Direct field access is faster than JSON property access
4. **Flexibility**: Structured fields like `education` and `career_goals` still use JSONB for complex data

## Future Considerations

As the application evolves, we may:
1. Add more structured fields as needed
2. Create additional tables for many-to-many relationships (e.g., programs, recommendations)
3. Implement more granular RLS policies for specific use cases 