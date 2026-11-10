import { useState } from 'react';
import { Plus, Wallet, HandCoins, ShoppingCart, Trash2, UserPlus } from 'lucide-react';
import { useApp, money, num, dateLabel, todayStr } from '../store.jsx';
import { Avatar, Field, Modal, ManagerBadge, SectionHead, Empty, useToast } from '../ui.jsx';

export function DepositModal({ open, onClose }) {
  const { data, t, lang, add, month } = useApp();
  const toast = useToast();
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const active = data.members.filter((m) => m.active !== false);

  const save = () => {
    const a = parseFloat(amount);
    if (!(a > 0)) return toast(t('invalidAmount'), 'err');
    const today = todayStr();
    add('deposits', {
      memberId: memberId || active[0]?.id,
      amount: a,
      note,
      date: today.startsWith(month) ? today : `${month}-01`,
    });
    setAmount('');
    setNote('');
    onClose();
    toast(t('saved'));
  };

  return (
    <Modal open={open} title={t('depositTitle')} onClose={onClose}>
      <Field label={t('member')}>
        <select value={memberId || active[0]?.id || ''} onChange={(e) => setMemberId(e.target.value)}>
          {active.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('amount')}>
        <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
      </Field>
      <Field label={t('note')}>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="row gap">
        <button className="btn btn-primary grow" onClick={save}>
          {t('save')}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
}

export function MemberModal({ open, onClose }) {
  const { t, addMember } = useApp();
  const toast = useToast();
  const [name, setName] = useState('');
  const [mgr, setMgr] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    addMember(name.trim(), mgr);
    setName('');
    setMgr(false);
    onClose();
    toast(t('saved'));
  };
  return (
    <Modal open={open} title={t('addMember')} onClose={onClose}>
      <Field label={t('memberName')}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <label className="check">
        <input type="checkbox" checked={mgr} onChange={(e) => setMgr(e.target.checked)} />
        <span>{t('giveManager')}</span>
      </label>
      <div className="row gap">
        <button className="btn btn-primary grow" onClick={save}>
          {t('save')}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
}

export default function Dashboard({ go, openExpense }) {
  const { data, calc, t, lang, isManager, month, del } = useApp();
  const toast = useToast();
  const [depOpen, setDepOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);

  const deposits = data.deposits.filter((d) => d.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));

  const onDelDeposit = (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    del('deposits', id);
    toast(t('deleted'));
  };

  return (
    <div className="screen">
      <div className="hero">
        <div className="row between top">
          <div>
            <span className="pill">{t('liveRate')}</span>
            <div className="hero-rate">
              {money(calc.mealRate, lang)} <small>{t('perMeal')}</small>
            </div>
          </div>
          <div className="hero-icon">
            <Wallet size={22} />
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <p>{t('totalDeposit')}</p>
            <b>{money(calc.totalDeposit, lang, 0)}</b>
          </div>
          <div>
            <p>{t('totalBazar')}</p>
            <b>{money(calc.totalBazar, lang, 0)}</b>
          </div>
          <div>
            <p>{t('totalMeals')}</p>
            <b>{num(calc.totalMeals, lang, 1)}</b>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card stat">
          <p>{t('messCash')}</p>
          <b className={calc.fundCash < 0 ? 'neg' : ''}>{money(calc.fundCash, lang, 0)}</b>
        </div>
        <div className="card stat">
          <p>{t('buaTotal')}</p>
          <b className="purple">{money(calc.totalBua, lang, 0)}</b>
        </div>
      </div>

      {isManager && (
        <div className="row gap quick">
          <button className="btn btn-primary grow" onClick={() => setDepOpen(true)}>
            <Plus size={14} /> {t('addDeposit')}
          </button>
          <button className="btn btn-rose grow" onClick={() => openExpense('bazar')}>
            <ShoppingCart size={14} /> {t('addBazarShort')}
          </button>
          <button className="btn btn-purple grow" onClick={() => openExpense('bua')}>
            <HandCoins size={14} /> {t('addBuaShort')}
          </button>
        </div>
      )}

      <SectionHead
        title={t('memberBalances')}
        right={
          isManager && (
            <button className="link" onClick={() => setMemOpen(true)}>
              <UserPlus size={12} /> {t('addMember')}
            </button>
          )
        }
      />
      <div className="stack">
        {calc.participants.map((m) => {
          const b = calc.perMember[m.id];
          const net = Math.round(b.net);
          const share = calc.totalMeals ? (b.meals / calc.totalMeals) * 100 : 0;
          return (
            <div className="card member" key={m.id}>
              <Avatar member={m} />
              <div className="grow">
                <p className="name">
                  {m.name} {m.isManager && <ManagerBadge />}
                </p>
                <p className="muted">
                  {t('mealsLabel')}: {num(b.meals, lang, 1)} · {t('buaLabel')}: {money(b.buaShare, lang, 0)}
                </p>
                <div className="bar" title={`${t('shareOfMeals')} ${share.toFixed(0)}%`}>
                  <i style={{ width: `${share}%`, background: m.color }} />
                </div>
              </div>
              <span className={`badge ${net > 0 ? 'badge-pos' : net < 0 ? 'badge-neg' : 'badge-muted'}`}>
                {net === 0 ? t('even') : `${net > 0 ? t('willGet') : t('willPay')}: ${money(Math.abs(net), lang, 0)}`}
              </span>
            </div>
          );
        })}
      </div>

      <SectionHead title={t('recentDeposits')} />
      <div className="stack">
        {deposits.length === 0 && <Empty text={t('nothing')} />}
        {deposits.map((d) => {
          const m = data.members.find((x) => x.id === d.memberId);
          return (
            <div className="card row between" key={d.id}>
              <div className="row gap center">
                <Avatar member={m} size={28} />
                <div>
                  <p className="name">{m?.name || '—'}</p>
                  <p className="muted">
                    {dateLabel(d.date, lang)}
                    {d.note ? ` · ${d.note}` : ''}
                  </p>
                </div>
              </div>
              <div className="row gap center">
                <b className="pos">{money(d.amount, lang)}</b>
                {isManager && (
                  <button className="icon-btn danger" onClick={() => onDelDeposit(d.id)} aria-label="delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DepositModal open={depOpen} onClose={() => setDepOpen(false)} />
      <MemberModal open={memOpen} onClose={() => setMemOpen(false)} />
    </div>
  );
}
