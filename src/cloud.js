// Supabase-এর সাথে সব কথাবার্তা এই ফাইলে।
import { supabase } from './supabase.js';
import { DEFAULT_REPO, normalizeRepo } from './update.js';

const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};
export const errCode = (e) => String(e?.message || e || '');

export const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(String(password || ''));

export async function resolveLoginEmail(identifier) {
  const cleaned = String(identifier || '').trim();
  if (!cleaned) throw new Error('EMAIL_OR_USERNAME_REQUIRED');

  if (cleaned.includes('@')) return cleaned.toLowerCase();

  const { data, error } = await supabase.rpc('lookup_email_by_username', { p_username: cleaned.toLowerCase() });
  if (error) throw error;
  if (!data) throw new Error('USER_NOT_FOUND');
  return String(data).trim().toLowerCase();
}

export const uuid = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });

/* ---------------- অ্যাকাউন্ট ---------------- */
export async function signUp({ email, password, fullName, username }) {
  const user = String(username || '').trim().toLowerCase();
  if (!validatePassword(password)) throw new Error('E_PASS');
  const free = ok(await supabase.rpc('username_available', { p: user }));
  if (!free) throw new Error('USERNAME_TAKEN');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, username: user } },
  });
  if (error) throw error;
  return { needsConfirm: false, session: data.session };
}
export const signIn = async (email, password) => ok(await supabase.auth.signInWithPassword({ email, password }));
export async function requestOtpLogin(identifier, password) {
  const value = String(identifier || '').trim();
  const email = await resolveLoginEmail(value);
  if (!validatePassword(password)) throw new Error('E_PASS');
  return ok(await supabase.auth.signInWithOtp({ email }));
}
export async function verifyOtpLogin(identifier, token) {
  const email = await resolveLoginEmail(identifier);
  if (!String(token || '').trim()) throw new Error('OTP_REQUIRED');
  return ok(await supabase.auth.verifyOtp({ email, token, type: 'email' }));
}
export const signOut = () => supabase.auth.signOut();
export const myProfile = async (uid) => ok(await supabase.from('profiles').select('*').eq('id', uid).single());
export const updateProfile = async (uid, patch) =>
  ok(await supabase.from('profiles').update(patch).eq('id', uid).select().single());
export const touchLastSeen = () => supabase.rpc('touch_last_seen').then(() => {}, () => {});
export const publicStats = async () => ok(await supabase.rpc('public_stats'));

/* ---------------- মেস ---------------- */
export async function myMesses(uid) {
  const rows = ok(
    await supabase
      .from('mess_members')
      .select('role,is_founder,messes(id,name,code)')
      .eq('user_id', uid)
      .eq('active', true)
  );
  return rows
    .filter((r) => r.messes)
    .map((r) => ({ id: r.messes.id, name: r.messes.name, code: r.messes.code, role: r.role, founder: r.is_founder }));
}
export const createMess = async (name, memberPass, managerPass) =>
  ok(await supabase.rpc('create_mess', { p_name: name, p_member_pass: memberPass, p_manager_pass: managerPass }));
export const joinMess = async (code, pass) =>
  ok(await supabase.rpc('join_mess', { p_code: code.trim().toUpperCase(), p_pass: pass }));
export const leaveMess = async (id) => ok(await supabase.rpc('leave_mess', { p_mess: id }));
export const setRole = async (messId, userId, role) =>
  ok(await supabase.rpc('set_member_role', { p_mess: messId, p_user: userId, p_role: role }));
export const removeMember = async (messId, userId) =>
  ok(await supabase.rpc('remove_member', { p_mess: messId, p_user: userId }));
export const setPasswords = async (messId, member, manager) =>
  ok(await supabase.rpc('set_passwords', { p_mess: messId, p_member: member || null, p_manager: manager || null }));
export const rotateCode = async (messId) => ok(await supabase.rpc('rotate_code', { p_mess: messId }));

/* ---------------- ডেটা (অ্যাপের পুরোনো আকারেই ফেরত দেয়) ---------------- */
const TBL = { deposits: 'deposits', bazar: 'bazar', bua: 'bua_bills' };

export async function fetchMess(messId, from, to) {
  const q = (t) => supabase.from(t).select('*').eq('mess_id', messId).gte('date', from).lt('date', to);
  const [mm, de, ba, bu, ml] = await Promise.all([
    supabase
      .from('mess_members')
      .select('user_id,role,is_founder,active,color,joined_at,profiles(full_name,username,avatar_url)')
      .eq('mess_id', messId)
      .order('joined_at'),
    q('deposits'),
    q('bazar'),
    q('bua_bills'),
    q('meals'),
  ]);

  const members = ok(mm).map((r) => ({
    id: r.user_id,
    name: r.profiles?.full_name || r.profiles?.username || '—',
    username: r.profiles?.username || '',
    avatarUrl: r.profiles?.avatar_url || '',
    color: r.color || '#64748b',
    isManager: r.role === 'manager',
    isFounder: r.is_founder,
    active: r.active,
  }));
  const meals = {};
  ok(ml).forEach((r) => {
    (meals[r.date] ||= {})[r.user_id] = Number(r.count);
  });
  const exp = (r) => ({
    id: r.id,
    payerId: r.payer_id || 'fund',
    amount: Number(r.amount),
    title: r.title || '',
    date: r.date,
  });
  return {
    members,
    deposits: ok(de).map((r) => ({ id: r.id, memberId: r.user_id, amount: Number(r.amount), note: r.note || '', date: r.date })),
    bazar: ok(ba).map(exp),
    bua: ok(bu).map(exp),
    meals,
  };
}

export const toRow = (col, messId, it) =>
  col === 'deposits'
    ? { id: it.id, mess_id: messId, user_id: it.memberId, amount: it.amount, note: it.note || '', date: it.date }
    : {
        id: it.id,
        mess_id: messId,
        payer_id: it.payerId && it.payerId !== 'fund' ? it.payerId : null,
        amount: it.amount,
        title: it.title || '',
        date: it.date,
      };

export function patchRow(patch) {
  const r = {};
  if ('memberId' in patch) r.user_id = patch.memberId;
  if ('payerId' in patch) r.payer_id = patch.payerId && patch.payerId !== 'fund' ? patch.payerId : null;
  ['amount', 'note', 'title', 'date'].forEach((k) => k in patch && (r[k] = patch[k]));
  return r;
}

export const insertRow = async (col, row) => ok(await supabase.from(TBL[col]).insert(row));
export const updateRow = async (col, id, patch) => ok(await supabase.from(TBL[col]).update(patchRow(patch)).eq('id', id));
export const deleteRow = async (col, id) => ok(await supabase.from(TBL[col]).delete().eq('id', id));

export async function upsertMeal(messId, date, userId, count) {
  if (count > 0) {
    return ok(
      await supabase
        .from('meals')
        .upsert({ mess_id: messId, date, user_id: userId, count }, { onConflict: 'mess_id,date,user_id' })
    );
  }
  return ok(await supabase.from('meals').delete().match({ mess_id: messId, date, user_id: userId }));
}
export async function replaceDay(messId, date, map) {
  ok(await supabase.from('meals').delete().match({ mess_id: messId, date }));
  const rows = Object.entries(map).map(([user_id, count]) => ({ mess_id: messId, date, user_id, count }));
  if (rows.length) ok(await supabase.from('meals').insert(rows));
}

/* ---------------- রিয়েলটাইম ---------------- */
export function subscribe(messId, cb) {
  const ch = supabase.channel('mess-' + messId);
  ['meals', 'deposits', 'bazar', 'bua_bills', 'mess_members'].forEach((table) =>
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb)
  );
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}

/* ---------------- ইনভাইট শেয়ার ---------------- */
export function inviteText(mess, t, repo) {
  const r = normalizeRepo(repo || DEFAULT_REPO);
  return [
    `${t('inviteMsg')} “${mess.name}”`,
    `${t('messCode')}: ${mess.code}`,
    t('inviteAsk'),
    r ? `${t('appDownload')}: https://github.com/${r}/releases/latest` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareText(text, title) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancel';
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    window.prompt(title, text);
  }
  return 'copied';
}

/* ---------------- সাহায্যকারী ---------------- */
// ম্যানেজার পাসওয়ার্ড ফাঁকা রাখলে অ্যাপ নিজে একটা ৮ অক্ষরের পাসওয়ার্ড বানায়
export function genPass() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = new Uint8Array(8);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => a[x % a.length]).join('');
}

// এরর → ইউজারের ভাষার বার্তা
export function explain(e, t) {
  const m = errCode(e);
  const map = [
    [/Invalid login/i, 'errLogin'], [/already registered/i, 'errEmailTaken'], [/Email not confirmed/i, 'confirmMail'],
    [/USERNAME_TAKEN/, 'errUsernameTaken'], [/E_USERNAME/, 'errUsernameBad'], [/E_PASS/, 'errPassShort'], [/EMAIL_OR_USERNAME_REQUIRED/, 'errUserRequired'],
    [/USER_NOT_FOUND/, 'errUserNotFound'], [/OTP_REQUIRED/, 'otpRequired'], [/INVALID_OTP|otp/i, 'otpInvalid'], [/E_NAME/, 'errName'],
    [/NOT_FOUND/, 'errNotFound'], [/WRONG_PASS/, 'errWrongPass'], [/LOCKED/, 'errLocked'], [/WEAK_PASS/, 'errWeakPass'],
    [/SAME_PASS/, 'errSamePass'], [/BAD_NAME/, 'errBadName'], [/FOUNDER_CANNOT_LEAVE/, 'errFounderLeave'],
    [/rate limit/i, 'errRate'], [/Failed to fetch|NetworkError|network/i, 'errNet'],
  ];
  for (const [re, k] of map) if (re.test(m)) return t(k);
  return m;
}