import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Utensils, Settings as Gear, LayoutDashboard, Soup, ShoppingCart, HandCoins, Receipt } from 'lucide-react';
import { useApp, monthLabel, shiftMonth, currentMonth } from './store.jsx';
import { checkForUpdate } from './update.js';
import Dashboard from './screens/Dashboard.jsx';
import Meals from './screens/Meals.jsx';
import Expenses from './screens/Expenses.jsx';
import Settlement from './screens/Settlement.jsx';
import Settings from './screens/Settings.jsx';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'navDash' },
  { id: 'meals', icon: Soup, label: 'navMeals' },
  { id: 'bazar', icon: ShoppingCart, label: 'navBazar' },
  { id: 'bua', icon: HandCoins, label: 'navBua' },
  { id: 'settle', icon: Receipt, label: 'navSettle' },
];

export default function App() {
  const { t, lang, month, setSettings, me, isManager, data } = useApp();
  const [screen, setScreen] = useState('dashboard');
  const [expenseOpen, setExpenseOpen] = useState({ bazar: false, bua: false });
  const [update, setUpdate] = useState({ checking: false, result: null });

  const runCheck = useCallback(async () => {
    setUpdate((u) => ({ ...u, checking: true }));
    const result = await checkForUpdate(data.settings.repo);
    setUpdate({ checking: false, result });
  }, [data.settings.repo]);

  // check once when the app opens
  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUpdate = update.result?.status === 'available';

  const openExpense = (kind) => {
    setScreen(kind);
    setExpenseOpen((s) => ({ ...s, [kind]: true }));
  };

  const body = {
    dashboard: <Dashboard go={setScreen} openExpense={openExpense} />,
    meals: <Meals />,
    bazar: <Expenses kind="bazar" modalOpen={expenseOpen.bazar} setModalOpen={(v) => setExpenseOpen((s) => ({ ...s, bazar: v }))} />,
    bua: <Expenses kind="bua" modalOpen={expenseOpen.bua} setModalOpen={(v) => setExpenseOpen((s) => ({ ...s, bua: v }))} />,
    settle: <Settlement />,
    settings: <Settings update={update} runCheck={runCheck} />,
  }[screen];

  return (
    <div className="app">
      <header className="topbar">
        <div className="row gap center">
          <div className="logo">
            <Utensils size={17} />
          </div>
          <div>
            <h1>{t('appTitle')}</h1>
            <p>
              {me?.name} · {isManager ? t('manager') : t('viewer')}
            </p>
          </div>
        </div>
        <button className={`icon-btn lg ${screen === 'settings' ? 'active' : ''}`} onClick={() => setScreen(screen === 'settings' ? 'dashboard' : 'settings')} aria-label="settings">
          <Gear size={17} />
          {hasUpdate && <i className="notif" />}
        </button>
      </header>

      {screen !== 'settings' && (
        <div className="monthbar">
          <button className="icon-btn" onClick={() => setSettings({ month: shiftMonth(month, -1) })} aria-label="prev month">
            <ChevronLeft size={16} />
          </button>
          <button className="month-label" onClick={() => setSettings({ month: currentMonth() })}>
            {monthLabel(month, lang)}
          </button>
          <button className="icon-btn" onClick={() => setSettings({ month: shiftMonth(month, 1) })} aria-label="next month">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {hasUpdate && screen !== 'settings' && (
        <button className="update-banner" onClick={() => setScreen('settings')}>
          🚀 {t('updateAvailable')} v{update.result.latest}
        </button>
      )}

      <main className="viewport" key={screen}>
        {body}
      </main>

      <nav className="bottom-nav">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} className={screen === id ? 'on' : ''} onClick={() => setScreen(id)}>
            <Icon size={19} />
            <span>{t(label)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
