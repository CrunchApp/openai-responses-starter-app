-- Migration: Create conversation_vector_files table
-- Purpose: Store a single vector-store file ID per conversation for upsert operations.
-- Tables affected: conversation_vector_files

-- create table to map each conversation to its current vector store file
create table if not exists conversation_vector_files (
  conversation_id uuid primary key references conversations(id) on delete cascade,
  vector_store_file_id text not null,
  updated_at timestamp with time zone default now()
);

-- enable row-level security for this table
alter table conversation_vector_files enable row level security;

-- policy: allow insert if the conversation belongs to the authenticated user
create policy "Users can insert their own conversation vector files"
  on conversation_vector_files for insert using (
    exists (
      select 1 from conversations
      where id = conversation_vector_files.conversation_id
        and user_id = auth.uid
    )
  );

-- policy: allow select if the conversation belongs to the authenticated user
create policy "Users can select their own conversation vector files"
  on conversation_vector_files for select using (
    exists (
      select 1 from conversations
      where id = conversation_vector_files.conversation_id
        and user_id = auth.uid
    )
  );

-- policy: allow update if the conversation belongs to the authenticated user
create policy "Users can update their own conversation vector files"
  on conversation_vector_files for update using (
    exists (
      select 1 from conversations
      where id = conversation_vector_files.conversation_id
        and user_id = auth.uid
    )
  );

-- policy: allow delete if the conversation belongs to the authenticated user
create policy "Users can delete their own conversation vector files"
  on conversation_vector_files for delete using (
    exists (
      select 1 from conversations
      where id = conversation_vector_files.conversation_id
        and user_id = auth.uid
    )
  ); 