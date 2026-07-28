create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  phone text not null,
  name text not null,
  created_at timestamptz default now() not null,
  unique(user_id, phone)
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  phone text not null,
  content text not null,
  status text default 'pending' not null check (status in ('pending','sent','delivered','read','failed')),
  wa_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists whatsapp_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id text unique not null default 'default',
  is_connected boolean default false not null,
  phone_number text,
  last_connected timestamptz
);

create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  key_value text unique not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table contacts enable row level security;
alter table messages enable row level security;
alter table api_keys enable row level security;

create policy "Users can manage their own contacts"
  on contacts for all
  using (auth.uid() = user_id);

create policy "Users can manage their own messages"
  on messages for all
  using (auth.uid() = user_id);

create policy "Users can manage their own api_keys"
  on api_keys for all
  using (auth.uid() = user_id);

create index idx_contacts_user on contacts(user_id);
create index idx_messages_user on messages(user_id);
create index idx_messages_wa_id on messages(wa_message_id);
create index idx_messages_status on messages(status);
create index idx_api_keys_value on api_keys(key_value);
