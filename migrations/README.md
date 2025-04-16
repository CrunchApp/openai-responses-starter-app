# Database Migrations

This directory contains SQL migration files for the Vista Education Adviser application.

## Migration Files

- `20240530_add_profile_fields.sql`: Adds location, nationality, study level, and language proficiency fields to the profiles table to support enhanced recommendation features.

## Running Migrations

To run a migration:

1. Ensure you have the necessary environment variables set in your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the migration script:
   ```bash
   node scripts/run-migration.js
   ```

## Creating New Migrations

When creating new migrations:

1. Name the file with a date prefix for easy ordering (e.g., `YYYYMMDD_description.sql`)
2. Include both the migration and any necessary rollback commands
3. Document the changes in this README
4. Test migrations in a development environment before applying to production

## Best Practices

- Always use `IF EXISTS` or `IF NOT EXISTS` clauses to make migrations idempotent
- Include comments explaining the purpose of the migration
- Keep migrations small and focused on a single concern
- Consider backward compatibility when making schema changes 