import { Printer, Share2, ArrowRight } from 'lucide-react';
import { useApp, money, num, monthLabel } from '../store.jsx';
import { Avatar, SectionHead, useToast } from '../ui.jsx';

export default function Settlement() {
  const { data, calc, t, lang, month } = useApp();
  const toast = useToast();
  const nameOf = (id) => data.members.find((m) => m.id === id)?.name || '—';

  const buildReport = () => {
    const lines = [];
    lines.push(`${t('appTitle')} — ${monthLabel(month, lang)}`);
    lines.push(`${t('mealRateLine')}: ${money(calc.mealRate, lang)} | ${t('totalBazar')}: ${money(calc.totalBazar, lang, 0)} | ${t('totalMeals')}: ${num(calc.totalMeals, lang, 1)}`);
    lines.push('');
    calc.participants.forEach((m) => {
      const b = calc.perMember[m.id];
      const n = Math.round(b.net);
      lines.push(
        `• ${m.name}: ${t('mealCount')} ${num(b.meals, lang, 1)}, ${t('mealCost')} ${money(b.mealCost, lang, 0)}, ${t('buaShare')} ${money(b.buaShare, lang, 0)}, ${t('deposit')} ${money(b.deposit, lang, 0)} → ${
          n === 0 ? t('even') : `${n > 0 ? t('willGet') : t('willPay')} ${money(Math.abs(n), lang, 0)}`
        }`
      );
    });
    if (calc.transfers.length) {
      lines.push('');
      lines.push(`${t('transfers')}:`);
      calc.transfers.forEach((x) => lines.push(`${nameOf(x.from)} → ${nameOf(x.to)}: ${money(x.amount, lang, 0)}`));
    }
    return lines.join('\n');
  };

  const share = async () => {
    const text = buildReport();
    try {
      if (navigator.share) {
        await navigator.share({ title: t('appTitle'), text });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copied'));
    } catch (e) {
      window.prompt(t('share'), text);
    }
  };

  return (
    <div className="screen">
      <div className="row between top">
        <div>
          <h2 className="title">{t('settleTitle')}</h2>
          <p className="muted">
            {monthLabel(month, lang)} · {t('mealRateLine')} {money(calc.mealRate, lang)}
          </p>
        </div>
        <div className="row gap no-print">
          <button className="icon-btn" onClick={share} aria-label="share">
            <Share2 size={15} />
          </button>
          <button className="icon-btn" onClick={() => window.print()} aria-label="print">
            <Printer size={15} />
          </button>
        </div>
      </div>

      <div className="stack">
        {calc.participants.map((m) => {
          const b = calc.perMember[m.id];
          const net = Math.round(b.net * 10) / 10;
          return (
            <div className="card" key={m.id}>
              <div className="row between center card-head">
                <div className="row gap center">
                  <Avatar member={m} size={30} />
                  <b>{m.name}</b>
                </div>
                <b className={net > 0 ? 'pos' : net < 0 ? 'neg' : 'muted'}>
                  {net === 0 ? t('even') : `${net > 0 ? t('willGet') : t('willPay')}: ${money(Math.abs(net), lang, 1)}`}
                </b>
              </div>
              <div className="kv">
                <div>
                  <span>{t('mealCount')}</span>
                  <b>{num(b.meals, lang, 1)}</b>
                </div>
                <div>
                  <span>{t('mealCost')}</span>
                  <b className="neg">{money(b.mealCost, lang, 1)}</b>
                </div>
                <div>
                  <span>{t('buaShare')}</span>
                  <b className="purple">{money(b.buaShare, lang, 1)}</b>
                </div>
                <div>
                  <span>{t('totalCost')}</span>
                  <b>{money(b.totalCost, lang, 1)}</b>
                </div>
                <div>
                  <span>{t('deposit')}</span>
                  <b className="pos">{money(b.deposit, lang, 0)}</b>
                </div>
                <div>
                  <span>{t('paidOut')}</span>
                  <b className="pos">{money(b.paid, lang, 0)}</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionHead title={t('transfers')} />
      <div className="stack">
        {calc.transfers.length === 0 && <div className="empty">{t('transfersEmpty')}</div>}
        {calc.transfers.map((x, i) => (
          <div className="card row between center" key={i}>
            <span className="row gap center">
              <b>{nameOf(x.from)}</b>
              <ArrowRight size={14} className="muted" />
              <b>{nameOf(x.to)}</b>
            </span>
            <b className="accent">{money(x.amount, lang, 0)}</b>
          </div>
        ))}
        {Math.abs(calc.fundCash) >= 1 && (
          <p className="muted small">
            {t('cashHeld')}: <b>{money(calc.fundCash, lang, 0)}</b>
          </p>
        )}
      </div>
    </div>
  );
}
