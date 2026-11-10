import { useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Copy, Eraser, Users } from 'lucide-react';
import { useApp, num, todayStr, shiftDay, dateLabel } from '../store.jsx';
import { Avatar, useToast } from '../ui.jsx';

export default function Meals() {
  const { data, calc, t, lang, isManager, month, setMeal, setDay } = useApp();
  const toast = useToast();
  const initial = todayStr().startsWith(month) ? todayStr() : `${month}-01`;
  const [picked, setPicked] = useState(initial);
  // keep the selected date inside the selected month
  const date = picked.startsWith(month) ? picked : `${month}-01`;

  const active = data.members.filter((m) => m.active !== false);
  const day = data.meals[date] || {};
  const dayTotal = Object.entries(day).reduce((a, [id, v]) => (data.members.some((m) => m.id === id) ? a + v : a), 0);

  const move = (delta) => {
    const nd = shiftDay(date, delta);
    if (nd.startsWith(month)) setPicked(nd);
  };

  const fillAll = (v) => {
    const map = {};
    active.forEach((m) => (map[m.id] = v));
    setDay(date, map);
    toast(t('saved'));
  };
  const copyPrev = () => {
    const prev = data.meals[shiftDay(date, -1)];
    if (!prev) return toast(t('nothing'), 'err');
    setDay(date, { ...prev });
    toast(t('saved'));
  };

  return (
    <div className="screen">
      <div>
        <h2 className="title">{t('mealsTitle')}</h2>
        <p className="muted">{t('mealsSub')}</p>
      </div>

      <div className="card row between center day-nav">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="prev">
          <ChevronLeft size={18} />
        </button>
        <div className="center-text">
          <b>{dateLabel(date, lang)}</b>
          <input
            type="date"
            className="date-input"
            value={date}
            min={`${month}-01`}
            max={`${month}-31`}
            onChange={(e) => e.target.value && e.target.value.startsWith(month) && setPicked(e.target.value)}
          />
        </div>
        <button className="icon-btn" onClick={() => move(1)} aria-label="next">
          <ChevronRight size={18} />
        </button>
      </div>

      {isManager && (
        <div className="chips">
          <button className="chip" onClick={() => fillAll(1)}>
            <Users size={12} /> {t('quickAll1')}
          </button>
          <button className="chip" onClick={() => fillAll(2)}>
            <Users size={12} /> {t('quickAll2')}
          </button>
          <button className="chip" onClick={copyPrev}>
            <Copy size={12} /> {t('copyPrev')}
          </button>
          <button className="chip" onClick={() => setDay(date, {})}>
            <Eraser size={12} /> {t('clearDay')}
          </button>
        </div>
      )}

      <div className="stack">
        {active.map((m) => {
          const v = day[m.id] || 0;
          return (
            <div className="card row between center" key={m.id}>
              <div className="row gap center">
                <Avatar member={m} size={32} />
                <span className="name">{m.name}</span>
              </div>
              <div className="stepper">
                <button disabled={!isManager || v <= 0} onClick={() => setMeal(date, m.id, v - 0.5)} aria-label="minus">
                  <Minus size={14} />
                </button>
                <span className={v > 0 ? 'on' : ''}>{num(v, lang, 1)}</span>
                <button disabled={!isManager} onClick={() => setMeal(date, m.id, v + 0.5)} aria-label="plus">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid2">
        <div className="card stat">
          <p>{t('dayTotal')}</p>
          <b>{num(dayTotal, lang, 1)}</b>
        </div>
        <div className="card stat">
          <p>{t('monthMeals')}</p>
          <b>{num(calc.totalMeals, lang, 1)}</b>
        </div>
      </div>

      <div className="card table">
        {calc.participants.map((m) => (
          <div className="row between" key={m.id}>
            <span className="row gap center">
              <i className="dot" style={{ background: m.color }} />
              {m.name}
            </span>
            <b>{num(calc.perMember[m.id].meals, lang, 1)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
