-- Create table for logging Perplexity API queries
create table if not exists public.perplexity_query_logs (
  id uuid primary key default uuid_generate_v4(),
  query_text text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security for the logging table
alter table public.perplexity_query_logs enable row level security;

-- Allow only authenticated users to insert logs
create policy "Allow authenticated inserts on perplexity_query_logs"
  on public.perplexity_query_logs
  for insert
  with check (auth.uid() is not null); 