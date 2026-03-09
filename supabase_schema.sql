-- =================================================================
-- CAMPUSHUB DATABASE SCHEMA
-- =================================================================
-- HOW TO USE THIS FILE:
-- 1. Go to https://supabase.com and open your project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy ALL of this text and paste it in the editor
-- 5. Click the green "Run" button
-- 6. You should see "Success. No rows returned"
-- =================================================================

-- ---------------------------------------------------------------
-- TABLE 1: PROFILES (stores student info)
-- ---------------------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  college_email text,
  college text default 'My College',
  major text default 'Engineering',
  year text default '1st Year',
  avatar_url text,
  role text default 'student',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- TABLE 2: LISTINGS (marketplace items)
-- ---------------------------------------------------------------
create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null,        -- 'sell', 'buy', 'borrow', 'lost', 'found'
  title text not null,
  description text default '',
  price numeric(10,2),       -- null for lost/found
  category text not null default 'Other',
  condition text,            -- 'Excellent', 'Good', 'Fair', 'Poor'
  image_url text,
  tags text[] default '{}',
  status text default 'active',  -- 'active', 'sold', 'claimed', 'closed'
  location_last_seen text,   -- for lost/found
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- TABLE 3: CHANNELS (community chat rooms)
-- ---------------------------------------------------------------
create table if not exists channels (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  icon text default '💬',
  is_readonly boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- TABLE 4: MESSAGES (community chat messages)
-- ---------------------------------------------------------------
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  is_bot boolean default false,
  content text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- TABLE 5: DIRECT MESSAGES (private messages between users)
-- ---------------------------------------------------------------
create table if not exists direct_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  listing_id uuid references listings(id) on delete set null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- TABLE 6: SAVED LISTINGS (wishlist)
-- ---------------------------------------------------------------
create table if not exists saved_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  listing_id uuid references listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- =================================================================
-- ADD DEFAULT COMMUNITY CHANNELS
-- =================================================================
insert into channels (name, description, icon, is_readonly) values
  ('general-help',   'Academic help, class queries, campus info',    '🎓', false),
  ('hostel-life',    'Hostel rules, room swaps, PG finder',          '🏠', false),
  ('mess-food',      'Mess menu, food reviews, canteen updates',     '🍱', false),
  ('events',         'Campus fests, competitions, notices',          '🎉', false),
  ('announcements',  'Official updates — admin only',                '📢', true)
on conflict (name) do nothing;

-- =================================================================
-- ROW LEVEL SECURITY (protects your data)
-- =================================================================
alter table profiles        enable row level security;
alter table listings        enable row level security;
alter table messages        enable row level security;
alter table direct_messages enable row level security;
alter table channels        enable row level security;
alter table saved_listings  enable row level security;

-- PROFILES policies
create policy "Anyone can view profiles"
  on profiles for select using (true);
create policy "Users insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- LISTINGS policies
create policy "Anyone can view listings"
  on listings for select using (true);
create policy "Users can create listings"
  on listings for insert with check (auth.uid() = user_id);
create policy "Users can update own listings"
  on listings for update using (auth.uid() = user_id);
create policy "Users can delete own listings"
  on listings for delete using (auth.uid() = user_id);

-- CHANNELS policies
create policy "Anyone can view channels"
  on channels for select using (true);

-- MESSAGES policies
create policy "Anyone can view messages"
  on messages for select using (true);
create policy "Logged in users can send messages"
  on messages for insert with check (auth.uid() = user_id or is_bot = true);

-- DIRECT MESSAGES policies
create policy "Users see their own DMs"
  on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send DMs"
  on direct_messages for insert with check (auth.uid() = sender_id);

-- SAVED LISTINGS policies
create policy "Users see own saved"
  on saved_listings for select using (auth.uid() = user_id);
create policy "Users can save"
  on saved_listings for insert with check (auth.uid() = user_id);
create policy "Users can unsave"
  on saved_listings for delete using (auth.uid() = user_id);

-- =================================================================
-- ENABLE REALTIME (for live chat!)
-- =================================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table direct_messages;
alter publication supabase_realtime add table listings;

-- =================================================================
-- AUTO-CREATE PROFILE WHEN USER SIGNS UP
-- =================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, college_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =================================================================
-- DONE! Your database is ready.
-- =================================================================
