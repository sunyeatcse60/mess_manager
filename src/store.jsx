import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { computeMonth } from './calc.js';
import { dict } from './i18n.js';
import { cloudReady } from './config.js';
import { supabase } from './supabase.js';
import * as C from './cloud.js';

const KEY = 'mess-manager-v1';

export const MEMBER_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
export const THEMES = [
  { id: 'emerald', color: '#10b981' },
  { id: 'indigo', color: '#6366f1' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'sky', color: '#0ea5e9' },
  { id: 'violet', color: '#8b5cf6' },
];

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => fmtDate(new Date());
export const currentMonth = () => todayStr().slice(0, 7);
export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const shiftDay = (date, delta) => {
  const [y, m, d] = date.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d + delta));
};

const defaultSettings = () => ({
  lang: 'bn',
  theme: 'emerald',
  mode: 'dark',
  meId: 'm1',
  month: currentMonth(),
  repo: '',
  useSolo: false, // true = লগইন ছাড়া শুধু এই ফোনে (অফলাইন)
  messId: null, // ক্লাউডে বর্তমানে কোন মেস খোলা
});

export function emptyData(keepMembers = []) {
  return {
    members: keepMembers.length
      ? keepMembers
      : [{ id: 'm1', name: 'আমি (ম্যানেজার)', color: MEMBER_COLORS[0], isManager: true, active: true }],
    deposits: [],
    bazar: [],
    bua: [],
    meals: {},
    settings: defaultSettings(),
  };
}

export function demoData() {
  const month = currentMonth();
  const today = new Date();
  const lastDay = Math.max(1, Math.min(today.getDate(), daysInMonth(month)));
  const d = (n) => `${month}-${pad(n)}`;
  const members = [
    { id: 'm1', name: 'আবির', color: MEMBER_COLORS[0], isManager: true, active: true },
    { id: 'm2', name: 'রাহুল', color: MEMBER_COLORS[1], isManager: false, active: true },
    { id: 'm3', name: 'তানভীর', color: MEMBER_COLORS[2], isManager: false, active: true },
    { id: 'm4', name: 'সাকিব', color: MEMBER_COLORS[3], isManager: false, active: true },
  ];
  const meals = {};
  for (let i = 1; i <= lastDay; i++) {
    meals[d(i)] = {
      m1: 2,
      m2: i % 5 === 0 ? 1 : 1.5,
      m3: i % 4 === 0 ? 1 : 2,
      m4: i % 3 === 0 ? 0.5 : 1,
    };
  }
  return {
    members,
    deposits: [
      { id: 'd1', memberId: 'm1', amount: 4500, date: d(1), note: '' },
      { id: 'd2', memberId: 'm2', amount: 3200, date: d(1), note: '' },
      { id: 'd3', memberId: 'm3', amount: 2800, date: d(Math.min(2, lastDay)), note: '' },
      { id: 'd4', memberId: 'm4', amount: 3500, date: d(Math.min(2, lastDay)), note: '' },
    ],
    bazar: [
      { id: 'b1', payerId: 'fund', amount: 1850, title: 'চাল ও সয়াবিন তেল', date: d(1) },
      { id: 'b2', payerId: 'fund', amount: 920, title: 'মুরগি ৩ কেজি ও ডিম', date: d(Math.min(4, lastDay)) },
      { id: 'b3', payerId: 'm2', amount: 650, title: 'সবজি ও আলু পেঁয়াজ (নিজের পকেট থেকে)', date: d(Math.min(6, lastDay)) },
    ],
    bua: [{ id: 'bu1', payerId: 'fund', amount: 1200, title: 'বুয়ার মাসিক বেতন', date: d(Math.min(5, lastDay)) }],
    meals,
    settings: { ...defaultSettings(), month },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.members) && p.settings) {
        p.settings = { ...defaultSettings(), ...p.settings };
        return p;
      }
    }
  } catch (e) {
    /* ignore corrupted storage */
  }
  return demoData();
}

const EMPTY_CLOUD = { members: [], deposits: [], bazar: [], bua: [], meals: {} };

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [local, setLocal] = useState(load);
  const { settings } = local;
  const lang = settings.lang;
  const month = settings.month;
  const cloudOn = cloudReady; // কনফিগ বসানো থাকলে ক্লাউড মোড; লগইন ছাড়া = গেস্ট (শুধু হোম ও সেটিংস)

  const [session, setSession] = useState(undefined); // undefined = এখনো জানা যায়নি
  const [profile, setProfile] = useState(null);
  const [messes, setMesses] = useState(null); // null = লোড হয়নি
  const [cloud, setCloud] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // মেস তৈরির পর সফল স্ক্রিনের তথ্য
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  const langRef = useRef(lang);
  langRef.current = lang;
  const fire = useCallback((e) => {
    const msg = C.errCode(e);
    const text = /row-level|permission denied|ONLY_MANAGER/i.test(msg) ? dict[langRef.current].onlyManager : msg;
    window.dispatchEvent(new CustomEvent('app-error', { detail: text }));
  }, []);

  /* ---- লোকাল সেভ + থিম ---- */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(local));
    } catch (e) {
      /* storage full / blocked */
    }
  }, [local]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mode = settings.mode;
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.mode === 'dark' ? '#0b1220' : '#f1f5f9');
  }, [settings.theme, settings.mode, lang]);

  const t = useCallback((key) => dict[lang][key] ?? dict.bn[key] ?? key, [lang]);
  const setSettings = useCallback(
    (patch) => setLocal((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    []
  );

  /* ---- লগইন সেশন ---- */
  useEffect(() => {
    if (!cloudOn) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [cloudOn]);

  const userId = session?.user?.id || null;

  const refreshMesses = useCallback(async () => {
    if (!userId) return [];
    const list = await C.myMesses(userId);
    setMesses(list);
    return list;
  }, [userId]);

  useEffect(() => {
    setCloud(null);
    setMesses(null);
    setProfile(null);
    setLoadError(false);
    if (!cloudOn || !userId) return undefined;
    let alive = true;
    C.myProfile(userId).then((p) => alive && setProfile(p)).catch(() => {});
    C.myMesses(userId)
      .then((l) => alive && setMesses(l))
      .catch(() => alive && setLoadError(true));
    C.touchLastSeen();
    return () => {
      alive = false;
    };
  }, [cloudOn, userId, tick]);

  const activeMess = useMemo(() => {
    const list = messes || [];
    return list.find((m) => m.id === settings.messId) || list[0] || null;
  }, [messes, settings.messId]);
  const messId = activeMess?.id || null;

  /* ---- মেসের ডেটা লোড + রিয়েলটাইম ---- */
  const range = useMemo(() => [`${month}-01`, `${shiftMonth(month, 1)}-01`], [month]);
  const reload = useCallback(async () => {
    if (!messId) return;
    try {
      setCloud(await C.fetchMess(messId, range[0], range[1]));
    } catch (e) {
      fire(e);
    }
  }, [messId, range, fire]);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const pending = useRef(0);

  useEffect(() => {
    setCloud(null);
  }, [messId]);
  useEffect(() => {
    if (cloudOn && messId) reload();
  }, [cloudOn, messId, reload]);

  useEffect(() => {
    if (!cloudOn || !messId) return undefined;
    let timer;
    const off = C.subscribe(messId, () => {
      if (pending.current > 0) return; // নিজের সেভ চলছে, শেষে একবারেই রিলোড হবে
      clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), 300);
    });
    const onVisible = () => document.visibilityState === 'visible' && reloadRef.current();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cloudOn, messId]);

  /* ---- ক্লাউড মিউটেশন: আগে স্ক্রিনে বদলাও, পরে সার্ভারে পাঠাও ---- */
  const mut = useCallback(
    (apply, remote) => {
      setCloud((c) => (c ? apply(c) : c));
      pending.current += 1;
      Promise.resolve()
        .then(remote)
        .catch(fire)
        .finally(() => {
          pending.current -= 1;
          if (pending.current === 0) reloadRef.current();
        });
    },
    [fire]
  );

  const cloudApi = useMemo(() => {
    const applyMeal = (c, date, id, v) => {
      const day = { ...(c.meals[date] || {}) };
      if (v === 0) delete day[id];
      else day[id] = v;
      const meals = { ...c.meals };
      if (Object.keys(day).length) meals[date] = day;
      else delete meals[date];
      return { ...c, meals };
    };
    const mapMember = (c, id, patch) => ({ ...c, members: c.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
    return {
      add: (col, item) => {
        const it = { id: C.uuid(), ...item };
        mut((c) => ({ ...c, [col]: [...c[col], it] }), () => C.insertRow(col, C.toRow(col, messId, it)));
      },
      edit: (col, id, patch) =>
        mut(
          (c) => ({ ...c, [col]: c[col].map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
          () => C.updateRow(col, id, patch)
        ),
      del: (col, id) =>
        mut((c) => ({ ...c, [col]: c[col].filter((x) => x.id !== id) }), () => C.deleteRow(col, id)),
      setMeal: (date, id, value) => {
        const v = Math.max(0, Math.round(Number(value) * 2) / 2);
        mut((c) => applyMeal(c, date, id, v), () => C.upsertMeal(messId, date, id, v));
      },
      setDay: (date, map) =>
        mut(
          (c) => {
            const meals = { ...c.meals };
            if (map && Object.keys(map).length) meals[date] = map;
            else delete meals[date];
            return { ...c, meals };
          },
          () => C.replaceDay(messId, date, map || {})
        ),
      editMember: (id, patch) => {
        if ('isManager' in patch)
          mut((c) => mapMember(c, id, { isManager: patch.isManager }), () => C.setRole(messId, id, patch.isManager ? 'manager' : 'member'));
      },
      removeMember: (id) =>
        mut((c) => mapMember(c, id, { active: false, isManager: false }), () => C.removeMember(messId, id)),
      addMember: () => {},
      replaceAll: () => {},
      loadDemo: () => {},
      clearAll: () => {},
    };
  }, [messId, mut]);

  /* ---- লোকাল (একা ব্যবহার) API ---- */
  const localApi = useMemo(() => {
    const upd = (fn) => setLocal((d) => fn(d));
    return {
      add: (col, item) => upd((d) => ({ ...d, [col]: [...d[col], { id: uid(), ...item }] })),
      edit: (col, id, patch) => upd((d) => ({ ...d, [col]: d[col].map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      del: (col, id) => upd((d) => ({ ...d, [col]: d[col].filter((x) => x.id !== id) })),
      setMeal: (date, memberId, value) =>
        upd((d) => {
          const day = { ...(d.meals[date] || {}) };
          const v = Math.max(0, Math.round(Number(value) * 2) / 2);
          if (v === 0) delete day[memberId];
          else day[memberId] = v;
          const meals = { ...d.meals };
          if (Object.keys(day).length) meals[date] = day;
          else delete meals[date];
          return { ...d, meals };
        }),
      setDay: (date, map) =>
        upd((d) => {
          const meals = { ...d.meals };
          if (map && Object.keys(map).length) meals[date] = map;
          else delete meals[date];
          return { ...d, meals };
        }),
      addMember: (name, isManager) =>
        upd((d) => ({
          ...d,
          members: [
            ...d.members,
            { id: uid(), name, isManager: !!isManager, active: true, color: MEMBER_COLORS[d.members.length % MEMBER_COLORS.length] },
          ],
        })),
      editMember: (id, patch) => upd((d) => ({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMember: (id) =>
        upd((d) => {
          const used =
            d.deposits.some((x) => x.memberId === id) ||
            d.bazar.some((x) => x.payerId === id) ||
            d.bua.some((x) => x.payerId === id) ||
            Object.values(d.meals).some((day) => id in day);
          if (used) return { ...d, members: d.members.map((m) => (m.id === id ? { ...m, active: false, isManager: false } : m)) };
          return { ...d, members: d.members.filter((m) => m.id !== id) };
        }),
      replaceAll: (next) => setLocal({ ...next, settings: { ...defaultSettings(), ...(next.settings || {}) } }),
      loadDemo: () =>
        setLocal((d) => {
          const demo = demoData();
          return { ...demo, settings: { ...demo.settings, ...d.settings, meId: 'm1' } };
        }),
      clearAll: () =>
        setLocal((d) => {
          const base = emptyData();
          return { ...base, settings: { ...base.settings, ...d.settings, meId: 'm1' } };
        }),
    };
  }, []);

  const api = cloudOn ? cloudApi : localApi;

  /* ---- বাইরে যা দেওয়া হবে ---- */
  const data = useMemo(() => (cloudOn ? { ...(cloud || EMPTY_CLOUD), settings } : local), [cloudOn, cloud, local, settings]);
  const me = cloudOn
    ? data.members.find((m) => m.id === userId)
    : data.members.find((m) => m.id === settings.meId) || data.members.find((m) => m.isManager) || data.members[0];
  const isManager = !!me?.isManager;
  const calc = useMemo(() => computeMonth(data, month), [data, month]);

  let stage = 'app';
  if (cloudOn) {
    if (session === undefined) stage = 'loading';
    else if (session === null) stage = 'app'; // লগইন ছাড়া: শুধু হোম ও সেটিংস
    else if (loadError) stage = 'error';
    else if (messes === null) stage = 'loading';
    else if (!activeMess || gateOpen) stage = 'gate';
  }

  const signOutNow = useCallback(async () => {
    await C.signOut();
    setGateOpen(false);
    setJustCreated(null);
    setSettings({ messId: null });
  }, [setSettings]);

  const guest = cloudOn && session === null;

  const updateMyProfile = useCallback(
    async (patch) => {
      const p = await C.updateProfile(userId, patch);
      setProfile(p);
      reloadRef.current();
      return p;
    },
    [userId]
  );

  const value = {
    data,
    calc,
    t,
    lang,
    me,
    isManager,
    month,
    setSettings,
    ...api,
    cloudOn,
    cloudReady,
    guest,
    justCreated,
    setJustCreated,
    updateMyProfile,
    stage,
    session,
    userId,
    profile,
    messes: messes || [],
    activeMess,
    gateOpen,
    setGateOpen,
    refreshMesses,
    signOutNow,
    retryLoad: () => setTick((n) => n + 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------- formatting helpers ----------
export const locale = (lang) => (lang === 'bn' ? 'bn-BD' : 'en-US');
export const num = (n, lang, max = 2) =>
  new Intl.NumberFormat(locale(lang), { maximumFractionDigits: max }).format(Math.round((Number(n) + Number.EPSILON) * 100) / 100);
export const money = (n, lang, max = 2) => `৳${num(n, lang, max)}`;
export const monthLabel = (month, lang) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale(lang), { month: 'long', year: 'numeric' });
};
export const dateLabel = (date, lang) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short', weekday: 'short' });
};