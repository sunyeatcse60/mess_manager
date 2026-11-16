import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings as Gear, LayoutDashboard, Soup, ShoppingCart, HandCoins, Receipt, Home } from 'lucide-react';
import appLogo from '../assets/icon-only.png';
import { useApp, monthLabel, shiftMonth, currentMonth } from './store.jsx';
import { checkForUpdate } from './update.js';
import Dashboard from './screens/Dashboard.jsx';
import Meals from './screens/Meals.jsx';
import Expenses from './screens/Expenses.jsx';
import Settlement from './screens/Settlement.jsx';
import Settings from './screens/Settings.jsx';
import GuestHome, { CreatedScreen } from './screens/GuestHome.jsx';
import Gate from './screens/Gate.jsx';
import { UserAvatar } from './profile.jsx';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'navDash' },
  { id: 'meals', icon: Soup, label: 'navMeals' },
  { id: 'bazar', icon: ShoppingCart, label: 'navBazar' },
  { id: 'bua', icon: HandCoins, label: 'navBua' },
  { id: 'settle', icon: Receipt, label: 'navSettle' },
];

function BrandLogo({ large = false, size = 17 }) {
  return (
    <div className={large ? 'logo big-logo' : 'logo'}>
      <img src={appLogo} alt="Mess Manager logo" className="brand-logo" width={size} height={size} />
    </div>
  );
}

function Splash({ error, retry }) {
  const { t, signOutNow } = useApp();
  return (
    <div className="auth splash">
      <BrandLogo large size={30} />
      {error ? (
        <>
          <p className="muted">{t('loadFail')}</p>
          <button className="btn btn-primary" onClick={retry}>{t('retry')}</button>
          <button className="link muted-link" onClick={signOutNow}>{t('logout')}</button>
        </>
      ) : (
        <p className="muted">{t('loading')}</p>
      )}
    </div>
  );
}

export default function App() {
  const { t, lang, month, setSettings, me, isManager, data, stage, cloudOn, guest, justCreated, profile, activeMess, retryLoad } = useApp();
  const [screen, setScreen] = useState('dashboard');
  const [expenseOpen, setExpenseOpen] = useState({ bazar: false, bua: false });
  const [update, setUpdate] = useState({ checking: false, result: null });

  const runCheck = useCallback(async () => {
    setUpdate((u) => ({ ...u, checking: true }));
    const result = await checkForUpdate(data.settings.repo);
    setUpdate({ checking: false, result });
  }, [data.settings.repo]);

  // অ্যাপ খুললে একবার আপডেট চেক
  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === 'loading') return <Splash />;
  if (stage === 'error') return <Splash error retry={retryLoad} />;
  if (justCreated) return <CreatedScreen />;
  if (stage === 'gate') return <Gate />;

  const hasUpdate = update.result?.status === 'available';
  // লগইন ছাড়া শুধু হোম আর সেটিংস
  const cur = guest && screen !== 'settings' ? 'dashboard' : screen;

  const openExpense = (kind) => {
    setScreen(kind);
    setExpenseOpen((s) => ({ ...s, [kind]: true }));
  };

  const body = {
    dashboard: guest ? <GuestHome /> : <Dashboard go={setScreen} openExpense={openExpense} />,
    meals: <Meals />,
    bazar: <Expenses kind="bazar" modalOpen={expenseOpen.bazar} setModalOpen={(v) => setExpenseOpen((s) => ({ ...s, bazar: v }))} />,
    bua: <Expenses kind="bua" modalOpen={expenseOpen.bua} setModalOpen={(v) => setExpenseOpen((s) => ({ ...s, bua: v }))} />,
    settle: <Settlement />,
    settings: <Settings update={update} runCheck={runCheck} goHome={() => setScreen('dashboard')} />,
  }[cur];

  const loggedIn = cloudOn && !guest;
  const nav = NAV;

  return (
    <div className="app">
      <header className="topbar">
        <div className="row gap center">
          {loggedIn ? (
            <button className="avatar-btn" onClick={() => setScreen('settings')} aria-label="profile">
              <UserAvatar name={profile?.full_name || profile?.username} url={profile?.avatar_url} size={36} round />
            </button>
          ) : (
            <BrandLogo size={17} />
          )}
          <div>
            <h1>{loggedIn ? profile?.full_name || profile?.username || t('appTitle') : t('appTitle')}</h1>
            {loggedIn ? (
              <p>{activeMess ? `${activeMess.name} · ${isManager ? t('manager') : t('viewer')}` : t('gateTitle')}</p>
            ) : guest ? (
              <p>{t('guestHint')}</p>
            ) : (
              <p>{me?.name} · {isManager ? t('manager') : t('viewer')}</p>
            )}
          </div>
        </div>
        <button className={`icon-btn lg ${cur === 'settings' ? 'active' : ''}`} onClick={() => setScreen(cur === 'settings' ? 'dashboard' : 'settings')} aria-label="settings">
          <Gear size={17} />
          {hasUpdate && <i className="notif" />}
        </button>
      </header>

      {!guest && cur !== 'settings' && (
        <div className="monthbar">
          <button className="icon-btn" onClick={() => setSettings({ month: shiftMonth(month, -1) })} aria-label="prev month"><ChevronLeft size={16} /></button>
          <button className="month-label" onClick={() => setSettings({ month: currentMonth() })}>{monthLabel(month, lang)}</button>
          <button className="icon-btn" onClick={() => setSettings({ month: shiftMonth(month, 1) })} aria-label="next month"><ChevronRight size={16} /></button>
        </div>
      )}

      {hasUpdate && cur !== 'settings' && (
        <button className="update-banner" onClick={() => setScreen('settings')}>
          🚀 {t('updateAvailable')} v{update.result.latest}
        </button>
      )}

      <main className="viewport" key={cur}>{body}</main>

      {!guest && (
        <nav className="bottom-nav">
          {nav.map(({ id, icon: Icon, label }) => (
            <button key={id} className={cur === id ? 'on' : ''} onClick={() => setScreen(id)}>
              <Icon size={19} />
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}