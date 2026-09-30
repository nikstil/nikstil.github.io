-- nikstil.com online features: accounts, TRANSLATR™ leaderboards and Messenger (DMs).
--
-- Run this whole file in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It's safe to run again after an update: tables are only created if missing, and functions
-- and policies are replaced.
--
-- How it's protected: the website only has the public ("publishable"/"anon") key, so everything
-- here assumes visitors can call the database directly. Row Level Security decides what each
-- signed-in player can read, and anything that writes goes through the functions below, which
-- check who's asking, rate-limit, and time speedruns on the server.

-- ================= Profiles =================
-- One per account, created automatically at sign-up from the username the site sends.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  allow_dms boolean not null default true,
  is_admin boolean not null default false,
  banned boolean not null default false
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := new.raw_user_meta_data ->> 'username';
begin
  if name is null then
    -- Accounts made some other way (e.g. "Add user" in the dashboard) get a placeholder name.
    name := 'player_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  if name !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Usernames are 3 to 20 letters, numbers or underscores.';
  end if;
  if lower(name) in ('admin', 'administrator', 'mod', 'moderator', 'staff', 'support', 'system', 'official', 'translatr', 'nikstilos') then
    raise exception 'That username is reserved.';
  end if;
  insert into public.profiles (id, username) values (new.id, name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin and not p.banned from public.profiles p where p.id = auth.uid()), false);
$$;

/** Raises unless the caller is signed in and not banned. Returns their id. */
create or replace function public.require_player()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = me and banned) then
    raise exception 'This account has been banned.' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- ================= Speedruns & Daily Challenge =================
-- The game page tells the server when a run starts (start_run) and when it ends (finish_run).
-- The server times the run too, and the time posted has to match it. So a time can't be typed in
-- or edited afterwards: posting 12:34 takes 12:34 between the two calls. (A browser game can't be
-- made cheat-proof, since someone could script those calls without playing; admins can remove
-- runs, see admin_set_run_removed.)

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('speedrun', 'daily')),
  day date, -- the Daily Challenge's date; null for speedruns
  game_started_at bigint, -- the game's own start time (ms), so a reload finds the same run
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'finished', 'abandoned', 'rejected', 'removed')),
  time_ms integer check (time_ms > 0),
  server_ms integer,
  ending text check (ending ~ '^[a-z0-9_]{1,32}$'),
  splits jsonb check (splits is null or pg_column_size(splits) < 4096),
  note text
);
create index if not exists runs_boards on public.runs (mode, ending, time_ms) where status = 'finished';
create index if not exists runs_daily on public.runs (day, time_ms) where status = 'finished' and mode = 'daily';
create index if not exists runs_by_user on public.runs (user_id, started_at desc);

create or replace function public.start_run(p_mode text, p_game_started_at bigint default null, p_day date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_player();
  rid uuid;
  today date := (now() at time zone 'utc')::date;
begin
  if p_mode is null or p_mode not in ('speedrun', 'daily') then
    raise exception 'Only speedruns and the Daily Challenge go on the leaderboards.';
  end if;
  -- The game dates its Daily Challenge in the player's time zone, so allow a day either side.
  if p_mode = 'daily' and (p_day is null or abs(p_day - today) > 1) then
    raise exception 'That isn''t today''s Daily Challenge.';
  end if;
  -- A reload in the middle of a run carries on with the same run (and the same server clock).
  if p_game_started_at is not null then
    select id into rid from public.runs
      where user_id = me and status = 'running' and mode = p_mode and game_started_at = p_game_started_at;
    if found then
      return rid;
    end if;
  end if;
  if (select count(*) from public.runs where user_id = me and started_at > now() - interval '1 hour') >= 60 then
    raise exception 'That''s a lot of runs. Take a breather and try again in a bit.';
  end if;
  update public.runs set status = 'abandoned', finished_at = now() where user_id = me and status = 'running';
  insert into public.runs (user_id, mode, day, game_started_at)
    values (me, p_mode, case when p_mode = 'daily' then p_day end, p_game_started_at)
    returning id into rid;
  return rid;
end;
$$;

/**
 * Tells every open leaderboard (the desktop's, and the game's ending screen) that something
 * changed, over Supabase Realtime's public 'leaderboard' channel. They then fetch the new standings.
 */
create or replace function public.notify_leaderboard(p_mode text default null, p_ending text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(jsonb_build_object('mode', p_mode, 'ending', p_ending), 'changed', 'leaderboard', false);
exception when others then
  null; -- live updates are a nice-to-have: they must never stop a run from being saved
end;
$$;

-- Where a time would place on its board: 1 + the players with a better personal best.
create or replace function public.board_rank(p_mode text, p_ending text, p_day date, p_time integer, p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select 1 + count(*) from (
    select r.user_id, min(r.time_ms) as best
    from public.runs r
    join public.profiles p on p.id = r.user_id and not p.banned
    where r.status = 'finished'
      and r.mode = p_mode
      and (p_mode <> 'daily' or r.day = p_day)
      and (p_ending is null or r.ending = p_ending)
      and r.user_id <> p_user
    group by r.user_id
  ) others
  where others.best < p_time;
$$;

create or replace function public.finish_run(p_run uuid, p_time_ms integer, p_ending text, p_splits jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_player();
  r public.runs;
  elapsed integer;
  slack integer;
  prev integer;
begin
  select * into r from public.runs where id = p_run and user_id = me for update;
  if not found then
    raise exception 'That run isn''t yours, or doesn''t exist.';
  end if;
  if r.status <> 'running' then
    raise exception 'That run is already over.';
  end if;
  if p_ending is null or p_ending !~ '^[a-z0-9_]{1,32}$' then
    raise exception 'Unknown ending.';
  end if;
  if p_splits is not null and (jsonb_typeof(p_splits) <> 'object' or pg_column_size(p_splits) >= 4096) then
    p_splits := null;
  end if;

  elapsed := least(floor(extract(epoch from now() - r.started_at) * 1000), 2147483647)::integer;
  -- 5 seconds plus 2% of leeway for network lag between the game and the server.
  slack := 5000 + elapsed / 50;

  if r.mode = 'daily' and p_ending <> 'daily' then
    update public.runs set status = 'abandoned', finished_at = now(), ending = p_ending where id = r.id;
    return jsonb_build_object('status', 'abandoned');
  end if;
  if p_time_ms is null or p_time_ms <= 0 then
    update public.runs set status = 'rejected', finished_at = now(), server_ms = elapsed, ending = p_ending, note = 'Impossible time.' where id = r.id;
    return jsonb_build_object('status', 'rejected', 'reason', 'That time doesn''t add up.');
  end if;
  if p_time_ms < elapsed - slack or p_time_ms > elapsed + slack then
    update public.runs
      set status = 'rejected', finished_at = now(), time_ms = p_time_ms, server_ms = elapsed, ending = p_ending, splits = p_splits,
          note = format('Claimed %s ms, but the server timed %s ms.', p_time_ms, elapsed)
      where id = r.id;
    return jsonb_build_object('status', 'rejected', 'reason', 'the time didn''t match how long the server saw the run take.');
  end if;

  select min(time_ms) into prev from public.runs
    where user_id = me and status = 'finished' and mode = r.mode
      and (r.mode <> 'daily' or day = r.day);
  update public.runs
    set status = 'finished', finished_at = now(), time_ms = p_time_ms, server_ms = elapsed, ending = p_ending, splits = p_splits
    where id = r.id;
  perform public.notify_leaderboard(r.mode, p_ending);
  return jsonb_build_object(
    'status', 'finished',
    'time_ms', p_time_ms,
    'pb', prev is null or p_time_ms < prev,
    'rank', public.board_rank(r.mode, case when r.mode = 'daily' then null end, r.day, least(p_time_ms, coalesce(prev, p_time_ms)), me),
    'ending_rank', case when r.mode = 'speedrun' then public.board_rank('speedrun', p_ending, null, p_time_ms, me) end
  );
end;
$$;

/**
 * A leaderboard: everyone's personal best, fastest first.
 * p_board: 'any' (any ending), an ending id like 'buy', or 'daily' (with p_day, default today UTC).
 */
create or replace function public.leaderboard(p_board text default 'any', p_day date default null, p_limit integer default 50)
returns table (rank bigint, user_id uuid, username text, time_ms integer, ending text, finished_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.time_ms, r.ending, r.finished_at
    from public.runs r
    join public.profiles p on p.id = r.user_id and not p.banned
    where r.status = 'finished'
      and case
        when p_board = 'daily' then r.mode = 'daily' and r.day = coalesce(p_day, (now() at time zone 'utc')::date)
        when p_board = 'any' then r.mode = 'speedrun'
        else r.mode = 'speedrun' and r.ending = p_board
      end
    order by r.user_id, r.time_ms, r.finished_at
  )
  select rank() over (order by b.time_ms), b.user_id, p.username, b.time_ms, b.ending, b.finished_at
  from best b
  join public.profiles p on p.id = b.user_id
  order by b.time_ms, b.finished_at
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

/** The caller's own place on a board (for when they're not in the top 50), or nothing. */
create or replace function public.my_rank(p_board text default 'any', p_day date default null)
returns table (rank bigint, time_ms integer, ending text)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select r.time_ms, r.ending
    from public.runs r
    where r.user_id = auth.uid()
      and r.status = 'finished'
      and case
        when p_board = 'daily' then r.mode = 'daily' and r.day = coalesce(p_day, (now() at time zone 'utc')::date)
        when p_board = 'any' then r.mode = 'speedrun'
        else r.mode = 'speedrun' and r.ending = p_board
      end
    order by r.time_ms
    limit 1
  )
  select public.board_rank(
           case when p_board = 'daily' then 'daily' else 'speedrun' end,
           case when p_board in ('daily', 'any') then null else p_board end,
           coalesce(p_day, (now() at time zone 'utc')::date),
           m.time_ms,
           auth.uid()),
         m.time_ms,
         m.ending
  from mine m;
$$;

-- ================= Messenger =================

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender <> recipient)
);
create index if not exists messages_to on public.messages (recipient, created_at desc);
create index if not exists messages_from on public.messages (sender, created_at desc);

create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create or replace function public.send_message(p_to uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_player();
  them public.profiles;
  body text := btrim(p_body);
  msg public.messages;
begin
  select * into them from public.profiles where id = p_to;
  if not found or them.banned then
    raise exception 'That user doesn''t exist.';
  end if;
  if them.id = me then
    raise exception 'You can''t message yourself. (We checked.)';
  end if;
  if body is null or char_length(body) = 0 then
    raise exception 'Type a message first.';
  end if;
  if char_length(body) > 1000 then
    raise exception 'That''s too long (1,000 characters max).';
  end if;
  if exists (select 1 from public.blocks where blocker = me and blocked = p_to) then
    raise exception 'You''ve blocked %. Unblock them to send a message.', them.username;
  end if;
  if exists (select 1 from public.blocks where blocker = p_to and blocked = me) or not them.allow_dms then
    raise exception '% isn''t accepting messages.', them.username;
  end if;
  if (select count(*) from public.messages where sender = me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down! Try again in a minute.';
  end if;
  if (select count(*) from public.messages where sender = me and created_at > now() - interval '1 day') >= 1000 then
    raise exception 'That''s the limit for today. Try again tomorrow.';
  end if;
  -- Messaging lots of new people in a short time looks like spam.
  if not exists (select 1 from public.messages where (sender = me and recipient = p_to) or (sender = p_to and recipient = me))
     and (select count(distinct recipient) from public.messages where sender = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'You''ve started a lot of new chats this hour. Try again later.';
  end if;
  insert into public.messages (sender, recipient, body) values (me, p_to, body) returning * into msg;
  return msg;
end;
$$;

create or replace function public.mark_read(p_other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages set read_at = now()
  where recipient = auth.uid() and sender = p_other and read_at is null;
$$;

/** Everyone the caller has a conversation with, most recent first. */
create or replace function public.conversations()
returns table (user_id uuid, username text, last_body text, last_at timestamptz, last_from_me boolean, unread bigint, blocked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select case when m.sender = auth.uid() then m.recipient else m.sender end as other, m.body, m.created_at, m.sender = auth.uid() as from_me
    from public.messages m
    where auth.uid() in (m.sender, m.recipient)
  ),
  latest as (
    select distinct on (other) other, body, created_at, from_me from mine order by other, created_at desc
  )
  select l.other, p.username, l.body, l.created_at, l.from_me,
         (select count(*) from public.messages m where m.sender = l.other and m.recipient = auth.uid() and m.read_at is null),
         exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = l.other)
  from latest l
  join public.profiles p on p.id = l.other
  order by l.created_at desc;
$$;

-- ================= Reports & moderation =================

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references public.profiles (id) on delete set null,
  reported uuid not null references public.profiles (id) on delete cascade,
  message_id bigint references public.messages (id) on delete set null,
  message_body text, -- a copy, so the report still makes sense if the message is deleted
  run_id uuid references public.runs (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index if not exists reports_open on public.reports (created_at desc) where resolved_at is null;

create or replace function public.report(p_user uuid, p_reason text, p_message bigint default null, p_run uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_player();
  body text;
begin
  if p_user is null or p_user = me or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Pick someone to report.';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'Say what happened.';
  end if;
  if (select count(*) from public.reports where reporter = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You''ve sent a lot of reports. Try again later.';
  end if;
  if p_message is not null then
    -- Only a message the reported user sent to the reporter.
    select m.body into body from public.messages m where m.id = p_message and m.sender = p_user and m.recipient = me;
    if not found then
      p_message := null;
    end if;
  end if;
  if p_run is not null and not exists (select 1 from public.runs where id = p_run and user_id = p_user) then
    p_run := null;
  end if;
  insert into public.reports (reporter, reported, message_id, message_body, run_id, reason)
    values (me, p_user, p_message, body, p_run, left(btrim(p_reason), 500));
end;
$$;

create or replace function public.admin_reports(p_open_only boolean default true)
returns table (id bigint, created_at timestamptz, reporter text, reported uuid, reported_name text, reported_banned boolean, reason text, message_body text, run_id uuid, resolved_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return query
    select r.id, r.created_at, rp.username, r.reported, p.username, p.banned, r.reason, r.message_body, r.run_id, r.resolved_at
    from public.reports r
    join public.profiles p on p.id = r.reported
    left join public.profiles rp on rp.id = r.reporter
    where not p_open_only or r.resolved_at is null
    order by r.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_resolve_report(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  update public.reports set resolved_at = now(), resolved_by = auth.uid() where id = p_id;
end;
$$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You can''t ban yourself.';
  end if;
  update public.profiles set banned = p_banned where id = p_user;
  perform public.notify_leaderboard(); -- their times leave (or rejoin) every board
end;
$$;

create or replace function public.admin_recent_runs(p_limit integer default 100)
returns table (id uuid, username text, user_id uuid, mode text, day date, status text, time_ms integer, server_ms integer, ending text, started_at timestamptz, finished_at timestamptz, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return query
    select r.id, p.username, r.user_id, r.mode, r.day, r.status, r.time_ms, r.server_ms, r.ending, r.started_at, r.finished_at, r.note
    from public.runs r
    join public.profiles p on p.id = r.user_id
    where r.status in ('finished', 'rejected', 'removed')
    order by r.finished_at desc nulls last
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

/** Takes a run off the leaderboards (or puts it back). */
create or replace function public.admin_set_run_removed(p_run uuid, p_removed boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  update public.runs
    set status = case when p_removed then 'removed' else 'finished' end,
        note = coalesce(p_note, note)
    where id = p_run and status in ('finished', 'removed');
  perform public.notify_leaderboard();
end;
$$;

-- ================= Your account =================

/** Deletes the caller's account and everything attached to it (runs, messages, blocks). */
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  delete from auth.users where id = me;
  perform public.notify_leaderboard();
end;
$$;

-- ================= Row Level Security =================
-- Tables are read-only from the website except where a policy says otherwise: every other write
-- goes through the functions above.

alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

revoke all on public.profiles, public.runs, public.messages, public.blocks, public.reports from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (allow_dms) on public.profiles to authenticated;
grant select on public.runs, public.messages to authenticated;
grant select, insert, delete on public.blocks to authenticated;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);
drop policy if exists "Players edit their own profile" on public.profiles;
create policy "Players edit their own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Players see their own runs" on public.runs;
create policy "Players see their own runs" on public.runs for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Players see their own messages" on public.messages;
create policy "Players see their own messages" on public.messages for select to authenticated
  using ((select auth.uid()) in (sender, recipient));

drop policy if exists "Players manage their own blocks" on public.blocks;
create policy "Players manage their own blocks" on public.blocks for all to authenticated
  using (blocker = (select auth.uid())) with check (blocker = (select auth.uid()));

-- (reports: no policies, so only the admin functions can read them.)

-- Functions: nobody by default, then exactly who needs each one.
revoke execute on function
  public.handle_new_user(),
  public.is_admin(),
  public.require_player(),
  public.start_run(text, bigint, date),
  public.board_rank(text, text, date, integer, uuid),
  public.notify_leaderboard(text, text),
  public.finish_run(uuid, integer, text, jsonb),
  public.leaderboard(text, date, integer),
  public.my_rank(text, date),
  public.send_message(uuid, text),
  public.mark_read(uuid),
  public.conversations(),
  public.report(uuid, text, bigint, uuid),
  public.admin_reports(boolean),
  public.admin_resolve_report(bigint),
  public.admin_set_banned(uuid, boolean),
  public.admin_recent_runs(integer),
  public.admin_set_run_removed(uuid, boolean, text),
  public.delete_account()
from public, anon, authenticated;
grant execute on function public.leaderboard(text, date, integer) to anon, authenticated;
grant execute on function public.my_rank(text, date) to authenticated;
grant execute on function public.start_run(text, bigint, date) to authenticated;
grant execute on function public.finish_run(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.conversations() to authenticated;
grant execute on function public.report(uuid, text, bigint, uuid) to authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_reports(boolean) to authenticated;
grant execute on function public.admin_resolve_report(bigint) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;
grant execute on function public.admin_recent_runs(integer) to authenticated;
grant execute on function public.admin_set_run_removed(uuid, boolean, text) to authenticated;

-- ================= Realtime =================
-- New messages are pushed to the recipient's browser (Realtime checks the policies above, so
-- nobody receives anyone else's).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
