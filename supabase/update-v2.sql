-- ============================================================================
--  আপডেট v2: প্রোফাইল ছবি
--  Supabase → SQL Editor → New query → পেস্ট করে Run করুন (একবারই)
--  schema.sql আগেই চালানো থাকতে হবে।
-- ============================================================================
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_len;
alter table public.profiles add constraint profiles_avatar_len
  check (avatar_url is null or char_length(avatar_url) < 80000);