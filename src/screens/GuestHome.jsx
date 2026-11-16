import { useState } from 'react';
import { Users, UserPlus, LogIn, ChevronLeft, Zap, ShieldCheck, Smartphone, Copy, Share2 } from 'lucide-react';
import appLogo from '../../assets/icon-only.png';
import { useApp } from '../store.jsx';
import * as C from '../cloud.js';
import { Field, useToast } from '../ui.jsx';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const fail = (msg) => window.dispatchEvent(new CustomEvent('app-error', { detail: msg }));

/* ---------- লগইন ছাড়া ব্যবহারকারীর হোম ---------- */
export default function GuestHome() {
  const { t, setSettings, setJustCreated } = useApp();
  const toast = useToast();
  const [view, setView] = useState('home'); // home | create | join | login
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [messName, setMessName] = useState('');
  const [memPass, setMemPass] = useState('');
  const [mgrPass, setMgrPass] = useState('');
  const [code, setCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [hasAccount, setHasAccount] = useState(false);

  const go = (v) => {
    setView(v);
    setErr('');
    setInfo('');
  };

  const checkAccount = () => {
    if (!USERNAME_RE.test(username.trim().toLowerCase())) throw new Error('E_USERNAME');
    if (pass.length < 6) throw new Error('E_PASS');
  };

  const signUpNow = async () => {
    const un = username.trim().toLowerCase();
    return C.signUp({ email: email.trim().toLowerCase(), password: pass, fullName: un, username: un });
  };

  const run = async (fn) => {
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(C.explain(e, t));
    } finally {
      setBusy(false);
    }
  };

  /* নতুন মেস: অ্যাকাউন্ট খোলা + মেস বানানো */
  const doCreate = () =>
    run(async () => {
      checkAccount();
      if (messName.trim().length < 2) throw new Error('BAD_NAME');
      const mgr = mgrPass.trim();
      if (memPass.length < 4 || (mgr && mgr.length < 4)) throw new Error('WEAK_PASS');
      if (mgr && mgr === memPass) throw new Error('SAME_PASS');

      const r = await signUpNow();
      if (r.needsConfirm) {
        setInfo(t('confirmMail'));
        setView('login');
        return;
      }
      const finalMgr = mgr || C.genPass();
      const m = await C.createMess(messName.trim(), memPass, finalMgr);
      setSettings({ messId: m.id });
      setJustCreated({ name: messName.trim(), code: m.code, managerPass: mgr ? '' : finalMgr });
    });

  /* মেসে যোগ: নতুন অ্যাকাউন্ট (বা আগের অ্যাকাউন্টে লগইন) + কোড দিয়ে যোগ */
  const doJoin = () =>
    run(async () => {
      if (hasAccount) {
        await C.signIn(email.trim().toLowerCase(), pass);
      } else {
        checkAccount();
        const r = await signUpNow();
        if (r.needsConfirm) {
          setInfo(t('confirmMail'));
          setView('login');
          return;
        }
      }
      const r = await C.joinMess(code, joinPass);
      if (!r.ok) {
        // অ্যাকাউন্ট খোলা বা লগইন হয়ে গেছে; এখন "মেস গেট" আসবে, সেখানে আবার চেষ্টা করা যাবে
        fail(C.explain(new Error(r.error), t));
        return;
      }
      setSettings({ messId: r.mess_id });
      toast(t('joinedOk'));
    });

  const doLogin = () =>
    run(async () => {
      await C.signIn(email.trim().toLowerCase(), pass);
    });

  const doSendOtp = () =>
    run(async () => {
      await C.sendLoginOtp(email.trim().toLowerCase());
      setOtpSent(true);
      setInfo('OTP sent to your email. Enter the 6-digit code below.');
    });

  const doVerifyOtp = () =>
    run(async () => {
      await C.verifyLoginOtp(email.trim().toLowerCase(), otpCode.trim());
      setOtpSent(false);
    });

  const Back = () => (
    <button className="form-back" onClick={() => go('home')}>
      <ChevronLeft size={16} /> {t('back')}
    </button>
  );
  const Feedback = () => (
    <>
      {err && <p className="err-text">{err}</p>}
      {info && <p className="ok-text">{info}</p>}
    </>
  );
  const accountFields = (
    <>
      {!(view === 'join' && hasAccount) && (
        <Field label={t('username')} hint={t('usernameHint')}>
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" autoComplete="username" />
        </Field>
      )}
      <Field label={t('email')}>
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label={t('password')}>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
      </Field>
    </>
  );

  /* ---------------- ফর্ম স্ক্রিনগুলো ---------------- */
  if (view === 'create') {
    return (
      <div className="screen">
        <Back />
        <h2 className="title">{t('createFormTitle')}</h2>
        <div className="stack-sm">
          {accountFields}
          <Field label={t('messName')}>
            <input value={messName} onChange={(e) => setMessName(e.target.value)} maxLength={60} />
          </Field>
          <Field label={t('memberPass')} hint={t('memberPassHint')}>
            <input type="password" value={memPass} onChange={(e) => setMemPass(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t('managerPassOpt')} hint={t('managerPassOptHint')}>
            <input type="password" value={mgrPass} onChange={(e) => setMgrPass(e.target.value)} autoComplete="new-password" />
          </Field>
          <Feedback />
          <button className="btn btn-primary full" disabled={busy || !email || !pass || !username || !messName.trim() || !memPass} onClick={doCreate}>
            {busy ? t('loading') : t('createBtn')}
          </button>
          <button className="link" onClick={() => go('login')}>{t('ctaLogin')}</button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="screen">
        <Back />
        <h2 className="title">{t('joinFormTitle')}</h2>
        <div className="stack-sm">
          <label className="check">
            <input type="checkbox" checked={hasAccount} onChange={(e) => setHasAccount(e.target.checked)} />
            <span>{t('haveAccount')}</span>
          </label>
          {accountFields}
          <Field label={t('messCode')}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MESS-XXXXX" autoCapitalize="characters" />
          </Field>
          <Field label={t('joinPass')} hint={t('joinPassHint')}>
            <input type="password" value={joinPass} onChange={(e) => setJoinPass(e.target.value)} />
          </Field>
          <Feedback />
          <button className="btn btn-primary full" disabled={busy || !email || !pass || !code.trim() || !joinPass || (!hasAccount && !username)} onClick={doJoin}>
            {busy ? t('loading') : t('joinBtn')}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="screen">
        <Back />
        <h2 className="title">{t('loginFormTitle')}</h2>
        <div className="stack-sm">
          <Field label={t('email')}>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label={t('password')}>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </Field>

          {otpSent && (
            <Field label="OTP code">
              <input type="text" inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
            </Field>
          )}

          <Feedback />

          {!otpSent ? (
            <>
              <button className="btn btn-primary full" disabled={busy || !email || !pass} onClick={doLogin}>
                {busy ? t('loading') : t('btnLogin')}
              </button>
              <button className="btn btn-ghost full" disabled={busy || !email} onClick={doSendOtp}>
                {busy ? t('loading') : 'Send OTP to email'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary full" disabled={busy || !email || otpCode.length !== 6} onClick={doVerifyOtp}>
              {busy ? t('loading') : 'Verify OTP'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- হোম ---------------- */
  return (
    <div className="screen">
      <div className="hero" style={{ textAlign: 'center' }}>
        <div className="logo big-logo" style={{ margin: '0 auto 10px' }}>
          <img src={appLogo} alt="Mess Manager logo" className="brand-logo" width={30} height={30} />
        </div>
        <h2 className="title">{t('appTitle')}</h2>
        <p className="muted" style={{ marginTop: 4 }}>{t('authSub')}</p>
      </div>

      <button className="cta primary" onClick={() => go('create')}>
        <span className="cta-ic"><Users size={20} /></span>
        <span>
          <b>{t('ctaCreate')}</b>
          <span className="sub">{t('ctaCreateSub')}</span>
        </span>
      </button>
      <button className="cta" onClick={() => go('join')}>
        <span className="cta-ic"><UserPlus size={20} /></span>
        <span>
          <b>{t('ctaJoin')}</b>
          <span className="sub">{t('ctaJoinSub')}</span>
        </span>
      </button>
      <button className="cta" onClick={() => go('login')}>
        <span className="cta-ic"><LogIn size={20} /></span>
        <span>
          <b>{t('ctaLogin')}</b>
          <span className="sub">{t('ctaLoginSub')}</span>
        </span>
      </button>

      <div className="card perks">
        <div><Zap size={16} />{t('perk1')}</div>
        <div><Smartphone size={16} />{t('perk2')}</div>
        <div><ShieldCheck size={16} />{t('perk3')}</div>
      </div>
    </div>
  );
}

/* ---------- মেস তৈরির পর সফল স্ক্রিন ---------- */
export function CreatedScreen() {
  const { t, justCreated: j, setJustCreated, data } = useApp();
  const toast = useToast();

  const share = async () => {
    const r = await C.shareText(C.inviteText({ name: j.name, code: j.code }, t, data.settings.repo), t('appTitle'));
    if (r !== 'cancel') toast(t('codeCopied'));
  };
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast(t('codeCopied')));

  return (
    <div className="auth">
      <div className="auth-head">
        <h1>{t('createdTitle')}</h1>
        <p className="muted">{t('createdSub')}</p>
      </div>
      <div className="card code-box">
        <p className="muted">{j.name}</p>
        <b className="code">{j.code}</b>
        <div className="row gap">
          <button className="btn btn-ghost grow" onClick={() => copy(j.code)}><Copy size={14} /> {t('copyCode')}</button>
          <button className="btn btn-primary grow" onClick={share}><Share2 size={14} /> {t('shareInvite')}</button>
        </div>
      </div>
      {j.managerPass && (
        <div className="card stack-sm">
          <b className="name">{t('yourManagerPass')}</b>
          <div className="pass-box">{j.managerPass}</div>
          <p className="muted small">{t('savePassNote')}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => copy(j.managerPass)}><Copy size={13} /> {t('copyCode')}</button>
        </div>
      )}
      <button className="btn btn-primary full" onClick={() => setJustCreated(null)}>{t('continueBtn')}</button>
    </div>
  );
}