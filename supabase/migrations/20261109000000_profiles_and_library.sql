-- CineStream: profiles + per-profile library (My List, ratings, watch history).
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Security model: every table has Row Level Security. A signed-in user can only
-- see and change their own profiles, and only library rows belonging to those profiles.

-- ───────────────────────── Profiles ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 24),
  avatar      text not null default 'crimson' check (avatar ~ '^[a-z]{2,16}$'),
  created_at  timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- Max 5 profiles per account (like Netflix).
create or replace function public.enforce_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.profiles where user_id = new.user_id) >= 5 then
    raise exception 'An account can have at most 5 profiles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_limit on public.profiles;
create trigger profiles_limit
  before insert on public.profiles
  for each row execute function public.enforce_profile_limit();

-- Every new account starts with one profile, named from the signup form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Me'), 24)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Library tables ─────────────────────────
-- `title` is a small JSON snapshot (name, images, year…) so lists render without
-- calling TMDB for every item.

create table if not exists public.my_list (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  media_type  text not null check (media_type in ('movie', 'tv')),
  tmdb_id     integer not null,
  title       jsonb not null default '{}'::jsonb,
  added_at    timestamptz not null default now(),
  primary key (profile_id, media_type, tmdb_id)
);

create table if not exists public.ratings (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  media_type  text not null check (media_type in ('movie', 'tv')),
  tmdb_id     integer not null,
  rating      smallint not null check (rating in (-1, 1)),
  rated_at    timestamptz not null default now(),
  primary key (profile_id, media_type, tmdb_id)
);

create table if not exists public.watch_history (
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  media_type    text not null check (media_type in ('movie', 'tv')),
  tmdb_id       integer not null,
  title         jsonb not null default '{}'::jsonb,
  season        integer,
  episode       integer,
  episode_name  text,
  watched_at    timestamptz not null default now(),
  primary key (profile_id, media_type, tmdb_id)
);

create index if not exists watch_history_recent_idx on public.watch_history (profile_id, watched_at desc);
create index if not exists my_list_recent_idx on public.my_list (profile_id, added_at desc);

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles      enable row level security;
alter table public.my_list       enable row level security;
alter table public.ratings       enable row level security;
alter table public.watch_history enable row level security;

-- True when the profile belongs to the signed-in user.
create or replace function public.owns_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = pid and p.user_id = (select auth.uid())
  );
$$;

drop policy if exists "own profiles: select" on public.profiles;
drop policy if exists "own profiles: insert" on public.profiles;
drop policy if exists "own profiles: update" on public.profiles;
drop policy if exists "own profiles: delete" on public.profiles;
create policy "own profiles: select" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profiles: insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own profiles: update" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own profiles: delete" on public.profiles for delete to authenticated using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['my_list', 'ratings', 'watch_history'] loop
    execute format('drop policy if exists "own library" on public.%I', t);
    execute format(
      'create policy "own library" on public.%I for all to authenticated
         using (public.owns_profile(profile_id))
         with check (public.owns_profile(profile_id))', t);
  end loop;
end $$;

-- Users cannot delete their last profile (the app always needs one).
create or replace function public.prevent_last_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.profiles where user_id = old.user_id) <= 1
     and exists (select 1 from auth.users where id = old.user_id) then
    raise exception 'You need at least one profile.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists profiles_keep_one on public.profiles;
create trigger profiles_keep_one
  before delete on public.profiles
  for each row execute function public.prevent_last_profile_delete();

-- ───────────────────────── Account deletion ─────────────────────────
-- Lets a signed-in user permanently delete their own account (required by app stores).
-- Cascades to profiles and all library rows.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke all on function public.owns_profile(uuid) from public, anon;
grant execute on function public.owns_profile(uuid) to authenticated;
