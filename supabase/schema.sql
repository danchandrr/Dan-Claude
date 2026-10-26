-- Zebra Shift online features: profiles, friends, leaderboards and cloud saves.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- It is safe to run more than once.

-- Player profiles. Usernames, doctor portraits and scores are public so leaderboards work;
-- email addresses stay private inside Supabase Auth and are never stored here.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display text check (char_length(display) <= 60),
  doctor jsonb,
  spec text check (char_length(spec) <= 40),
  best integer not null default 0 check (best between 0 and 50000000),
  cases integer not null default 0 check (cases between 0 and 1000),
  runs integer not null default 0 check (runs >= 0),
  ems integer not null default 0 check (ems >= 0),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- One row per player per Case of the day
create table if not exists public.daily_scores (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  score integer not null check (score between 0 and 1000),
  clues integer not null default 0 check (clues between 0 and 20),
  wrong integer not null default 0 check (wrong between 0 and 5),
  won boolean not null default false,
  primary key (user_id, day)
);

-- Friend requests; status becomes 'accepted' when the other player agrees
create table if not exists public.friendships (
  requester uuid not null references public.profiles on delete cascade,
  addressee uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Each player's careers, so the same save follows them between devices
create table if not exists public.saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.daily_scores enable row level security;
alter table public.friendships enable row level security;
alter table public.saves enable row level security;

-- Profiles: anyone can read (leaderboards); you can only create and edit your own
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Daily scores: anyone can read; you write only your own
drop policy if exists "daily read" on public.daily_scores;
create policy "daily read" on public.daily_scores for select using (true);
drop policy if exists "daily insert own" on public.daily_scores;
create policy "daily insert own" on public.daily_scores for insert with check (user_id = auth.uid());
drop policy if exists "daily update own" on public.daily_scores;
create policy "daily update own" on public.daily_scores for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Friendships: only the two people involved can see a request; only the recipient can accept;
-- either side can remove it
drop policy if exists "friends read" on public.friendships;
create policy "friends read" on public.friendships for select using (auth.uid() in (requester, addressee));
drop policy if exists "friends request" on public.friendships;
create policy "friends request" on public.friendships for insert with check (requester = auth.uid() and status = 'pending');
drop policy if exists "friends accept" on public.friendships;
create policy "friends accept" on public.friendships for update using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "friends remove" on public.friendships;
create policy "friends remove" on public.friendships for delete using (auth.uid() in (requester, addressee));

-- Saves: private to their owner
drop policy if exists "saves own" on public.saves;
create policy "saves own" on public.saves for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lets a signed-in player delete their account and everything linked to it
create or replace function public.delete_me() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- ---------------------------------------------------------------------------
-- Added with challenges, achievements and daily reminders. Run the whole file again; it is safe.

-- How many achievements each player has (shown on their profile)
alter table public.profiles add column if not exists ach integer not null default 0 check (ach between 0 and 500);

-- Friend challenges: the same five patients for both players
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  seed text not null check (char_length(seed) between 4 and 16),
  cases jsonb not null,
  from_scores jsonb not null,
  to_scores jsonb,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
alter table public.challenges enable row level security;
drop policy if exists "challenges read" on public.challenges;
create policy "challenges read" on public.challenges for select using (auth.uid() in (from_id, to_id));
-- You can only challenge someone who has accepted your friend request (or whose request you accepted)
drop policy if exists "challenges send" on public.challenges;
create policy "challenges send" on public.challenges for insert with check (
  from_id = auth.uid() and to_scores is null and exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester = from_id and f.addressee = to_id) or (f.requester = to_id and f.addressee = from_id))));
-- Only the person challenged can fill in their scores, and only that column
drop policy if exists "challenges answer" on public.challenges;
create policy "challenges answer" on public.challenges for update using (to_id = auth.uid()) with check (to_id = auth.uid());
revoke update on public.challenges from anon, authenticated;
grant update (to_scores) on public.challenges to authenticated;
drop policy if exists "challenges remove" on public.challenges;
create policy "challenges remove" on public.challenges for delete using (auth.uid() in (from_id, to_id));

-- Daily reminder notifications: one row per device that asked for them
create table if not exists public.push_subs (
  endpoint text primary key check (char_length(endpoint) < 1000),
  user_id uuid not null references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  hour_utc integer not null check (hour_utc between 0 and 23),
  tz_offset integer not null default 0 check (tz_offset between -900 and 900),
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "push own" on public.push_subs;
create policy "push own" on public.push_subs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
