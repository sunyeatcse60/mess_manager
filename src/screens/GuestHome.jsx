import { useState } from 'react';
import { Users, UserPlus, LogIn, ChevronLeft, Zap, ShieldCheck, Smartphone, Copy, Share2, Mail, Lock, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import appLogo from '../../assets/icon-only.png';
import { useApp } from '../store.jsx';
import * as C from '../cloud.js';
import { Field, Modal, useToast } from '../ui.jsx';

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
  const [repass, setRepass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showRepass, setShowRepass] = useState(false);
  const [showJoinPass, setShowJoinPass] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [showManagerPass, setShowManagerPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    if (!C.validatePassword(pass)) throw new Error('E_PASS');
  };

  const signUpNow = async () => {
    const un = username.trim().toLowerCase();
    return C.signUp({ email: email.trim().toLowerCase(), password: pass, fullName: un, username: un });
  };

  const doSignup = () =>
    run(async () => {
      const un = username.trim().toLowerCase();
      if (!USERNAME_RE.test(un)) throw new Error('E_USERNAME');
      if (!email.trim()) throw new Error('EMAIL_REQUIRED');
      if (!C.validatePassword(pass)) throw new Error('E_PASS');
      if (pass !== repass) throw new Error('PASS_MISMATCH');
      if (!termsAccepted) throw new Error('TERMS_REQUIRED');

      await signUpNow();
      setInfo('Account created. Please log in to continue.');
      setView('login');
    });

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
      if (!termsAccepted) throw new Error('TERMS_REQUIRED');
      if (messName.trim().length < 2) throw new Error('BAD_NAME');
      const mgr = mgrPass.trim();
      if (memPass.length < 4 || (mgr && mgr.length < 4)) throw new Error('WEAK_PASS');
      if (mgr && mgr === memPass) throw new Error('SAME_PASS');

      await signUpNow();
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
        if (!termsAccepted) throw new Error('TERMS_REQUIRED');
        await signUpNow();
      }
      const r = await C.joinMess(code, joinPass);
      if (!r.ok) {
        fail(C.explain(new Error(r.error), t));
        return;
      }
      setSettings({ messId: r.mess_id });
      toast(t('joinedOk'));
    });

  const doLogin = () =>
    run(async () => {
      const loginValue = (email || username).trim();
      if (!loginValue) throw new Error('EMAIL_OR_USERNAME_REQUIRED');
      if (!C.validatePassword(pass)) throw new Error('E_PASS');
      const resolvedEmail = await C.resolveLoginEmail(loginValue);
      await C.signIn(resolvedEmail, pass);
      toast(t('loginSuccess'));
      setView('create');
    });

  const PasswordField = ({ value, onChange, placeholder, show, setShow, icon = null }) => (
    <div className="modern-input password-wrap">
      <span className="modern-icon">{icon || <Lock size={16} />}</span>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} onBlur={() => setShow(false)} placeholder={placeholder} autoComplete="new-password" />
      <button type="button" className="pass-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

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
      <Field label={t('password')} hint={t('passPolicy')}>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
      </Field>
    </>
  );

  /* ---------------- ফর্ম স্ক্রিনগুলো ---------------- */
  if (view === 'create') {
    return (
      <div className="screen auth-modern">
        <Back />
        <div className="auth-head modern-head">
          <h1>Create Mess</h1>
          <p className="muted">Set up your mess and invite members</p>
        </div>
        <div className="stack-sm modern-form">
          <label className="modern-input">
            <span className="modern-icon"><Users size={16} /></span>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="Username" autoCapitalize="none" autoComplete="username" />
          </label>
          <label className="modern-input">
            <span className="modern-icon"><Mail size={16} /></span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
          </label>
          <PasswordField value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" show={showPass} setShow={setShowPass} />
          <PasswordField value={repass} onChange={(e) => setRepass(e.target.value)} placeholder="Re-enter password" show={showRepass} setShow={setShowRepass} />
          <label className="modern-input">
            <span className="modern-icon"><Users size={16} /></span>
            <input value={messName} onChange={(e) => setMessName(e.target.value)} maxLength={60} placeholder="Mess name" />
          </label>
          <PasswordField value={memPass} onChange={(e) => setMemPass(e.target.value)} placeholder="Member password" show={showCreatePass} setShow={setShowCreatePass} />
          <PasswordField value={mgrPass} onChange={(e) => setMgrPass(e.target.value)} placeholder="Manager password (optional)" show={showManagerPass} setShow={setShowManagerPass} />
          <label className="check">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>{t('termsAgree')}</span>
          </label>
          <Feedback />
          <button className="btn modern-btn" disabled={busy || !email || !pass || !username || !messName.trim() || !memPass || !termsAccepted} onClick={doCreate}>
            {busy ? t('loading') : 'Create Mess'}
          </button>
          <button className="link muted-link" onClick={() => go('login')}>{t('ctaLogin')}</button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="screen auth-modern">
        <Back />
        <div className="auth-head modern-head">
          <h1>Join Mess</h1>
          <p className="muted">Enter your invite details to join</p>
        </div>
        <div className="stack-sm modern-form">
          <label className="check">
            <input type="checkbox" checked={hasAccount} onChange={(e) => setHasAccount(e.target.checked)} />
            <span>{t('haveAccount')}</span>
          </label>
          {!hasAccount && (
            <>
              <label className="modern-input">
                <span className="modern-icon"><Users size={16} /></span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="Username" autoCapitalize="none" autoComplete="username" />
              </label>
              <label className="modern-input">
                <span className="modern-icon"><Mail size={16} /></span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
              </label>
              <PasswordField value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" show={showPass} setShow={setShowPass} />
            </>
          )}
          <label className="modern-input">
            <span className="modern-icon"><Users size={16} /></span>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MESS-XXXXX" autoCapitalize="characters" />
          </label>
          <PasswordField value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="Mess password" show={showJoinPass} setShow={setShowJoinPass} />
          {!hasAccount && (
            <label className="check">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              <span>{t('termsAgree')}</span>
            </label>
          )}
          <Feedback />
          <button className="btn modern-btn" disabled={busy || !code.trim() || !joinPass || (!hasAccount && (!email || !pass || !username || !termsAccepted))} onClick={doJoin}>
            {busy ? t('loading') : 'Join Mess'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'signup') {
    return (
      <div className="screen auth-modern">
        <Back />
        <div className="auth-head modern-head">
          <h1>Create account</h1>
          <p className="muted">Start managing your mess in seconds</p>
        </div>

        <div className="stack-sm modern-form">
          <label className="modern-input">
            <span className="modern-icon"><Users size={16} /></span>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="Username" autoCapitalize="none" autoComplete="username" />
          </label>

          <label className="modern-input">
            <span className="modern-icon"><Mail size={16} /></span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
          </label>

          <PasswordField value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" show={showPass} setShow={setShowPass} />
          <PasswordField value={repass} onChange={(e) => setRepass(e.target.value)} placeholder="Re-enter password" show={showRepass} setShow={setShowRepass} />

          <label className="check">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>{t('termsAgree')}</span>
          </label>

          <Feedback />

          <button className="btn modern-btn" disabled={busy || !username || !email || !pass || !repass || !termsAccepted} onClick={doSignup}>
            <ArrowRight size={18} /> {busy ? t('loading') : 'Sign up'}
          </button>

          <button className="link muted-link" onClick={() => go('login')}>
            Already have an account? Login
          </button>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="screen auth-modern">
        <Back />
        <div className="auth-head modern-head">
          <h1>Welcome Back!</h1>
          <p className="muted">Login to continue</p>
        </div>

        <div className="stack-sm modern-form">
          <label className="modern-input">
            <span className="modern-icon"><Mail size={16} /></span>
            <input
              type="text"
              placeholder={t('emailOrUsername')}
              value={email || username}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes('@')) {
                  setEmail(value);
                  setUsername('');
                } else {
                  setEmail('');
                  setUsername(value);
                }
              }}
              autoComplete="username"
            />
          </label>

          <PasswordField
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={t('password')}
            show={showPass}
            setShow={setShowPass}
            icon={<Lock size={16} />}
          />

          <div className="modern-meta">
            <label className="remember-me">
              <input type="checkbox" checked />
              <span>Remember Me</span>
            </label>
            <button className="link muted-link" onClick={() => go('signup')}>Forgot Password?</button>
          </div>

          <Feedback />

          <button className="btn modern-btn" disabled={busy || !(email || username) || !pass} onClick={doLogin}>
            <ArrowRight size={18} /> {busy ? t('loading') : 'Login'}
          </button>

          <button className="link muted-link" onClick={() => go('signup')}>
            Need an account? Sign up
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- হোম ---------------- */
  return (
    <div className="screen auth-landing">
      <div className="hero" style={{ textAlign: 'center' }}>
        <div className="logo big-logo" style={{ margin: '0 auto 10px' }}>
          <img src={appLogo} alt="Mess Manager logo" className="brand-logo" width={30} height={30} />
        </div>
        <h2 className="title">{t('appTitle')}</h2>
        <p className="muted" style={{ marginTop: 4 }}>{t('authSub')}</p>
      </div>

      <div className="auth-row">
        <button className="auth-btn primary" onClick={() => go('login')}>
          <span className="auth-btn-icon"><LogIn size={18} /></span>
          <span>Log In</span>
        </button>
        <button className="auth-btn" onClick={() => go('signup')}>
          <span className="auth-btn-icon"><UserPlus size={18} /></span>
          <span>Sign Up</span>
        </button>
      </div>

      <button className="cta" onClick={() => go('join')}>
        <span className="cta-ic"><Users size={20} /></span>
        <span>
          <b>{t('ctaJoin')}</b>
          <span className="sub">{t('ctaJoinSub')}</span>
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