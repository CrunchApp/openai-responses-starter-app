#!/usr/bin/env node

// Script to run migrations against Supabase database
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Uses service role key for admin privileges
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function runMigration() {
  try {
    console.log('Starting migration...');
    
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../migrations/20240530_add_profile_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Run SQL using Supabase client
    console.log('Executing migration SQL...');
    const { error } = await supabase.rpc('pgclient_execute', { query: sql });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 