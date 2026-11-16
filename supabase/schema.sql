-- ============================================================================
--  Mess Manager — Supabase স্কিমা
--  Supabase Dashboard → SQL Editor → New query → পুরোটা পেস্ট করে একবার Run করুন
-- ============================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- টেবিল ----
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name   text not null default '',
  last_seen   timestamptz default now(),
  created_at  timestamptz default now()
);

create table public.messes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 60),
  code              text unique not null,
  member_pass_hash  text not null,
  manager_pass_hash text not null,
  created_by        uuid not null references public.profiles(id),
  created_at        timestamptz default now()
);

create table public.mess_members (
  mess_id    uuid references public.messes(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('manager','member')),
  is_founder boolean not null default false,
  active     boolean not null default true,
  color      text not null default '#64748b',
  perms      jsonb not null default '{}',      -- ভবিষ্যতের কাস্টম পারমিশন: {"bazar":true}
  joined_at  timestamptz default now(),
  primary key (mess_id, user_id)
);
create index on public.mess_members (user_id);

create table public.meals (
  mess_id uuid not null references public.messes(id) on delete cascade,
  date    date not null,
  user_id uuid not null references public.profiles(id),
  count   numeric(4,1) not null check (count > 0 and count <= 20),
  primary key (mess_id, date, user_id)
);

create table public.deposits (
  id         uuid primary key default gen_random_uuid(),
  mess_id    uuid not null references public.messes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  amount     numeric(12,2) not null check (amount > 0),
  note       text default '',
  date       date not null,
  created_by uuid default auth.uid()
);

create table public.bazar (
  id         uuid primary key default gen_random_uuid(),
  mess_id    uuid not null references public.messes(id) on delete cascade,
  payer_id   uuid references public.profiles(id),          -- null = মেস ফান্ড থেকে
  amount     numeric(12,2) not null check (amount > 0),
  title      text default '',
  date       date not null,
  created_by uuid default auth.uid()
);

create table public.bua_bills (like public.bazar including all);
alter table public.bua_bills add foreign key (mess_id) references public.messes(id) on delete cascade;
alter table public.bua_bills add foreign key (payer_id) references public.profiles(id);

create index on public.deposits  (mess_id, date);
create index on public.bazar     (mess_id, date);
create index on public.bua_bills (mess_id, date);

create table public.join_attempts (
  user_id      uuid not null,
  mess_code    text not null,
  failed       int  not null default 0,
  locked_until timestamptz,
  primary key (user_id, mess_code)
);

-- --------------------------------------------- নতুন ইউজারে প্রোফাইল তৈরি ----
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------ সাহায্যকারী ফাংশন ----
create function public.is_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mess_members where mess_id = m and user_id = auth.uid() and active)
$$;

create function public.is_manager(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mess_members where mess_id = m and user_id = auth.uid() and active and role = 'manager')
$$;

create function public.can_edit(m uuid, perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mess_members
    where mess_id = m and user_id = auth.uid() and active
      and (role = 'manager' or perms ->> perm = 'true')
  )
$$;

create function public.shares_mess(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mess_members a join mess_members b on a.mess_id = b.mess_id
    where a.user_id = auth.uid() and a.active and b.user_id = u
  )
$$;

-- -------------------------------------------------------------------- RLS ----
alter table public.profiles      enable row level security;
alter table public.messes        enable row level security;
alter table public.mess_members  enable row level security;
alter table public.join_attempts enable row level security;

create policy profiles_sel on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_mess(id));
create policy profiles_upd on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy messes_sel on public.messes for select to authenticated
  using (public.is_member(id));

create policy members_sel on public.mess_members for select to authenticated
  using (public.is_member(mess_id));
-- mess_members / messes / join_attempts-এ লেখা শুধু নিচের RPC ফাংশন দিয়ে হয়

do $$
declare r record;
begin
  for r in select * from (values ('meals','meals'), ('deposits','deposits'), ('bazar','bazar'), ('bua_bills','bua')) v(t, p) loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(mess_id))', r.t || '_sel', r.t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit(mess_id, %L))', r.t || '_ins', r.t, r.p);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit(mess_id, %L)) with check (public.can_edit(mess_id, %L))', r.t || '_upd', r.t, r.p, r.p);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit(mess_id, %L))', r.t || '_del', r.t, r.p);
  end loop;
end $$;

-- পাসওয়ার্ড হ্যাশ কলাম অ্যাপ থেকে কখনোই পড়া যাবে না
revoke all on public.messes, public.mess_members, public.join_attempts from anon, authenticated;
grant select (id, name, code, created_by, created_at) on public.messes to authenticated;
grant select on public.mess_members to authenticated;
revoke all on public.profiles from anon;

-- -------------------------------------------------------- RPC ফাংশনসমূহ ----
create function public.gen_mess_code() returns text
language plpgsql set search_path = public as $$
declare c text;
begin
  loop
    select 'MESS-' || string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
      into c from generate_series(1, 5);
    exit when not exists (select 1 from messes where code = c);
  end loop;
  return c;
end $$;

create function public.pick_color(m uuid) returns text
language sql stable set search_path = public as $$
  select (array['#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#ef4444','#84cc16'])
         [1 + (select count(*) from mess_members where mess_id = m)::int % 8]
$$;

create function public.username_available(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(trim(p)))
$$;

create function public.public_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'users',   (select count(*) from profiles),
    'active7', (select count(*) from profiles where last_seen > now() - interval '7 days')
  )
$$;

create function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen = now() where id = auth.uid()
$$;

create function public.create_mess(p_name text, p_member_pass text, p_manager_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'BAD_NAME'; end if;
  if char_length(coalesce(p_member_pass,'')) < 4 or char_length(coalesce(p_manager_pass,'')) < 4 then raise exception 'WEAK_PASS'; end if;
  if p_member_pass = p_manager_pass then raise exception 'SAME_PASS'; end if;
  v_code := gen_mess_code();
  insert into messes (name, code, member_pass_hash, manager_pass_hash, created_by)
  values (trim(p_name), v_code, crypt(p_member_pass, gen_salt('bf')), crypt(p_manager_pass, gen_salt('bf')), auth.uid())
  returning id into v_id;
  insert into mess_members (mess_id, user_id, role, is_founder, color)
  values (v_id, auth.uid(), 'manager', true, pick_color(v_id));
  return json_build_object('id', v_id, 'code', v_code);
end $$;

-- ভুল পাসওয়ার্ডে exception নয়, json ফেরত দিই, নইলে ব্যর্থ চেষ্টার রেকর্ড rollback হয়ে লক কাজ করত না
create function public.join_mess(p_code text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare m messes; a join_attempts; v_role text; v_failed int;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'NOT_AUTH'); end if;
  select * into m from messes where code = upper(trim(p_code));
  if not found then return json_build_object('ok', false, 'error', 'NOT_FOUND'); end if;

  select * into a from join_attempts where user_id = auth.uid() and mess_code = m.code;
  if found and a.locked_until is not null and a.locked_until > now() then
    return json_build_object('ok', false, 'error', 'LOCKED');
  end if;

  if crypt(p_pass, m.manager_pass_hash) = m.manager_pass_hash then v_role := 'manager';
  elsif crypt(p_pass, m.member_pass_hash) = m.member_pass_hash then v_role := 'member';
  else
    insert into join_attempts (user_id, mess_code, failed) values (auth.uid(), m.code, 1)
    on conflict (user_id, mess_code) do update
      set failed = case when join_attempts.locked_until is not null and join_attempts.locked_until <= now() then 1 else join_attempts.failed + 1 end,
          locked_until = null
    returning failed into v_failed;
    if v_failed >= 5 then
      update join_attempts set locked_until = now() + interval '15 minutes', failed = 0
       where user_id = auth.uid() and mess_code = m.code;
      return json_build_object('ok', false, 'error', 'LOCKED');
    end if;
    return json_build_object('ok', false, 'error', 'WRONG_PASS');
  end if;

  delete from join_attempts where user_id = auth.uid() and mess_code = m.code;
  insert into mess_members (mess_id, user_id, role, color)
  values (m.id, auth.uid(), v_role, pick_color(m.id))
  on conflict (mess_id, user_id) do update
    set active = true,
        role = case when excluded.role = 'manager' then 'manager' else mess_members.role end
  returning role into v_role;
  return json_build_object('ok', true, 'mess_id', m.id, 'role', v_role);
end $$;

create function public.leave_mess(p_mess uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from mess_members where mess_id = p_mess and user_id = auth.uid() and is_founder) then
    raise exception 'FOUNDER_CANNOT_LEAVE';
  end if;
  update mess_members set active = false, role = 'member' where mess_id = p_mess and user_id = auth.uid();
end $$;

create function public.set_member_role(p_mess uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_mess) then raise exception 'ONLY_MANAGER'; end if;
  if p_role not in ('manager','member') then raise exception 'BAD_ROLE'; end if;
  update mess_members set role = p_role
   where mess_id = p_mess and user_id = p_user and active and not is_founder;
  if not found then raise exception 'CANNOT_CHANGE'; end if;
end $$;

create function public.remove_member(p_mess uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_mess) then raise exception 'ONLY_MANAGER'; end if;
  if p_user = auth.uid() then raise exception 'USE_LEAVE'; end if;
  update mess_members set active = false, role = 'member'
   where mess_id = p_mess and user_id = p_user and not is_founder;
  if not found then raise exception 'CANNOT_CHANGE'; end if;
end $$;

create function public.set_passwords(p_mess uuid, p_member text, p_manager text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m messes;
begin
  if not is_manager(p_mess) then raise exception 'ONLY_MANAGER'; end if;
  select * into m from messes where id = p_mess;
  p_member := nullif(p_member, ''); p_manager := nullif(p_manager, '');
  if (p_member is not null and char_length(p_member) < 4) or (p_manager is not null and char_length(p_manager) < 4) then
    raise exception 'WEAK_PASS';
  end if;
  if p_member is not null and p_manager is not null and p_member = p_manager then raise exception 'SAME_PASS'; end if;
  if p_member  is not null and crypt(p_member,  m.manager_pass_hash) = m.manager_pass_hash and p_manager is null then raise exception 'SAME_PASS'; end if;
  if p_manager is not null and crypt(p_manager, m.member_pass_hash)  = m.member_pass_hash  and p_member  is null then raise exception 'SAME_PASS'; end if;
  if p_member  is not null then update messes set member_pass_hash  = crypt(p_member,  gen_salt('bf')) where id = p_mess; end if;
  if p_manager is not null then update messes set manager_pass_hash = crypt(p_manager, gen_salt('bf')) where id = p_mess; end if;
end $$;

create function public.rotate_code(p_mess uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_manager(p_mess) then raise exception 'ONLY_MANAGER'; end if;
  c := gen_mess_code();
  update messes set code = c where id = p_mess;
  return c;
end $$;

-- ফাংশন চালানোর অনুমতি
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.username_available(text), public.public_stats() to anon, authenticated;
grant execute on function
  public.is_member(uuid), public.is_manager(uuid), public.can_edit(uuid, text), public.shares_mess(uuid),
  public.touch_last_seen(), public.create_mess(text, text, text), public.join_mess(text, text),
  public.leave_mess(uuid), public.set_member_role(uuid, uuid, text), public.remove_member(uuid, uuid),
  public.set_passwords(uuid, text, text), public.rotate_code(uuid)
  to authenticated;

-- রিয়েলটাইম (ম্যানেজার সেভ করলে সবার ফোনে সাথে সাথে আপডেট)
alter publication supabase_realtime add table
  public.meals, public.deposits, public.bazar, public.bua_bills, public.mess_members;