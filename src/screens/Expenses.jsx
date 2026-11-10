import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp, money, dateLabel, todayStr } from '../store.jsx';
import { FUND } from '../calc.js';
import { Empty, Field, Modal, useToast } from '../ui.jsx';

// One modal used for both bazar and bua bills
export function ExpenseModal({ kind, open, editing, onClose }) {
  const { data, t, add, edit, month } = useApp();
  const toast = useToast();
  const col = kind === 'bua' ? 'bua' : 'bazar';
  const [payerId, setPayerId] = useState(FUND);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPayerId(editing.payerId || FUND);
      setAmount(String(editing.amount));
      setTitle(editing.title || '');
      setDate(editing.date);
    } else {
      setPayerId(FUND);
      setAmount('');
      setTitle('');
      const today = todayStr();
      setDate(today.startsWith(month) ? today : `${month}-01`);
    }
  }, [open, editing, month]);

  const save = () => {
    const a = parseFloat(amount);
    if (!(a > 0)) return toast(t('invalidAmount'), 'err');
    const item = { payerId, amount: a, title: title.trim() || (kind === 'bua' ? t('navBua') : t('navBazar')), date };
    if (editing) edit(col, editing.id, item);
    else add(col, item);
    onClose();
    toast(t('saved'));
  };

  const active = data.members.filter((m) => m.active !== false);
  const heading = editing ? (kind === 'bua' ? t('editBua') : t('editBazar')) : kind === 'bua' ? t('newBua') : t('newBazar');

  return (
    <Modal open={open} title={heading} onClose={onClose}>
      <Field label={t('paidBy')} hint={t('paidByHint')}>
        <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
          <option value={FUND}>{t('fromFund')}</option>
          {active.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid2">
        <Field label={t('amount')}>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label={t('date')}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label={t('title')}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'bua' ? t('buaTitlePh') : ''} />
      </Field>
      <div className="row gap">
        <button className={`btn grow ${kind === 'bua' ? 'btn-purple' : 'btn-rose'}`} onClick={save}>
          {t('save')}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
}

export default function Expenses({ kind, modalOpen, setModalOpen }) {
  const { data, calc, t, lang, isManager, month, del } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const col = kind === 'bua' ? 'bua' : 'bazar';
  const items = data[col].filter((x) => x.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  const isBua = kind === 'bua';

  const onDelete = (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    del(col, id);
    toast(t('deleted'));
  };

  return (
    <div className="screen">
      <div className="row between top">
        <div>
          <h2 className="title">{isBua ? t('buaTitle') : t('bazarTitle')}</h2>
          <p className="muted">{isBua ? t('buaSub') : t('bazarSub')}</p>
        </div>
        {isManager && (
          <button
            className={`btn btn-sm ${isBua ? 'btn-purple' : 'btn-rose'}`}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={13} /> {t('addExpense')}
          </button>
        )}
      </div>

      {isBua ? (
        <div className="card tinted-purple">
          <div className="row between center">
            <span className="purple name">{t('buaPerHead')}</span>
            <b className="purple big">{money(calc.buaPerHead, lang, 1)}</b>
          </div>
          <p className="muted small">
            {t('buaFormula')} ({calc.participants.length})
          </p>
        </div>
      ) : (
        <div className="grid2">
          <div className="card stat">
            <p>{t('totalBazar')}</p>
            <b className="neg">{money(calc.totalBazar, lang, 0)}</b>
          </div>
          <div className="card stat">
            <p>{t('avgPerDay')}</p>
            <b>{money(calc.avgBazarPerDay, lang, 0)}</b>
          </div>
        </div>
      )}

      <div className="stack">
        {items.length === 0 && <Empty text={t('nothing')} />}
        {items.map((x) => {
          const payer = data.members.find((m) => m.id === x.payerId);
          return (
            <div className="card row between center" key={x.id}>
              <div className="grow">
                <p className="name">{x.title}</p>
                <p className="muted">
                  {dateLabel(x.date, lang)} ·{' '}
                  <span className={payer ? 'tag-own' : 'tag-fund'}>
                    {payer ? `${t('paidOwnTag')}: ${payer.name}` : t('paidFromFundTag')}
                  </span>
                </p>
              </div>
              <div className="row gap center">
                <b className={isBua ? 'purple' : 'neg'}>{money(x.amount, lang)}</b>
                {isManager && (
                  <>
                    <button
                      className="icon-btn"
                      aria-label="edit"
                      onClick={() => {
                        setEditing(x);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button className="icon-btn danger" aria-label="delete" onClick={() => onDelete(x.id)}>
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ExpenseModal
        kind={kind}
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
