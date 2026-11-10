import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { computeMonth } from './calc.js';
import { dict } from './i18n.js';

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

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [data, setData] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full / blocked */
    }
  }, [data]);

  const { settings } = data;
  const lang = settings.lang;

  // theme + mode on <html>
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mode = settings.mode;
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.mode === 'dark' ? '#0b1220' : '#f1f5f9');
  }, [settings.theme, settings.mode, lang]);

  const t = useCallback((key) => dict[lang][key] ?? dict.bn[key] ?? key, [lang]);

  const me = data.members.find((m) => m.id === settings.meId) || data.members.find((m) => m.isManager) || data.members[0];
  const isManager = !!me?.isManager;

  const calc = useMemo(() => computeMonth(data, settings.month), [data, settings.month]);

  const api = useMemo(() => {
    const upd = (fn) => setData((d) => fn(d));
    return {
      setSettings: (patch) => upd((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
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
          if (used) {
            return { ...d, members: d.members.map((m) => (m.id === id ? { ...m, active: false, isManager: false } : m)) };
          }
          return { ...d, members: d.members.filter((m) => m.id !== id) };
        }),
      replaceAll: (next) => {
        const merged = { ...next, settings: { ...defaultSettings(), ...(next.settings || {}) } };
        setData(merged);
      },
      loadDemo: () => setData((d) => ({ ...demoData(), settings: { ...demoData().settings, lang: d.settings.lang, theme: d.settings.theme, mode: d.settings.mode, repo: d.settings.repo } })),
      clearAll: () =>
        setData((d) => {
          const base = emptyData();
          return { ...base, settings: { ...base.settings, lang: d.settings.lang, theme: d.settings.theme, mode: d.settings.mode, repo: d.settings.repo } };
        }),
    };
  }, []);

  const value = { data, calc, t, lang, me, isManager, month: settings.month, ...api };
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
