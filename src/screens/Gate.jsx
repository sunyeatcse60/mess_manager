import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useApp } from '../store.jsx';
import * as C from '../cloud.js';
import { Field, useToast } from '../ui.jsx';

// লগইন আছে কিন্তু মেস নেই (বা "নতুন মেস / যোগ দিন" চাপা হয়েছে), তখন এই স্ক্রিন আসে
export default function Gate() {
  const { t, activeMess, setGateOpen, refreshMesses, setSettings, signOutNow, profile, setJustCreated } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('create');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [name, setName] = useState('');
  const [memPass, setMemPass] = useState('');
  const [mgrPass, setMgrPass] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');

  const run = async (fn) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(C.explain(e, t));
    } finally {
      setBusy(false);
    }
  };

  const create = (ev) => {
    ev.preventDefault();
    run(async () => {
      const mgr = mgrPass.trim();
      if (memPass.length < 4 || (mgr && mgr.length < 4)) throw new Error('WEAK_PASS');
      if (mgr && mgr === memPass) throw new Error('SAME_PASS');
      const finalMgr = mgr || C.genPass();
      const r = await C.createMess(name.trim(), memPass, finalMgr);
      await refreshMesses();
      setSettings({ messId: r.id });
      setGateOpen(false);
      setJustCreated({ name: name.trim(), code: r.code, managerPass: mgr ? '' : finalMgr });
    });
  };

  const join = (ev) => {
    ev.preventDefault();
    run(async () => {
      const r = await C.joinMess(code, pass);
      if (!r.ok) throw new Error(r.error);
      await refreshMesses();
      setSettings({ messId: r.mess_id });
      setGateOpen(false);
      toast(t('joinedOk'));
    });
  };

  return (
    <div className="auth">
      <div className="auth-head">
        <h1>{t('gateTitle')}</h1>
        <p className="muted">
          {profile?.full_name ? `${profile.full_name} · ` : ''}
          {t('gateSub')}
        </p>
      </div>

      <div className="seg">
        <button className={tab === 'create' ? 'on' : ''} onClick={() => { setTab('create'); setErr(''); }} type="button">{t('tabCreate')}</button>
        <button className={tab === 'join' ? 'on' : ''} onClick={() => { setTab('join'); setErr(''); }} type="button">{t('tabJoin')}</button>
      </div>

      {tab === 'create' ? (
        <form className="stack-sm" onSubmit={create}>
          <Field label={t('messName')}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label={t('memberPass')} hint={t('memberPassHint')}>
            <input type="password" value={memPass} onChange={(e) => setMemPass(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t('managerPassOpt')} hint={t('managerPassOptHint')}>
            <input type="password" value={mgrPass} onChange={(e) => setMgrPass(e.target.value)} autoComplete="new-password" />
          </Field>
          {err && <p className="err-text">{err}</p>}
          <button className="btn btn-primary full" disabled={busy || name.trim().length < 2 || !memPass}>
            {busy ? t('loading') : t('createBtn')}
          </button>
        </form>
      ) : (
        <form className="stack-sm" onSubmit={join}>
          <Field label={t('messCode')}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MESS-XXXXX" autoCapitalize="characters" />
          </Field>
          <Field label={t('joinPass')} hint={t('joinPassHint')}>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
          {err && <p className="err-text">{err}</p>}
          <button className="btn btn-primary full" disabled={busy || !code.trim() || !pass}>
            {busy ? t('loading') : t('joinBtn')}
          </button>
        </form>
      )}

      <div className="row between">
        {activeMess ? <button className="link" onClick={() => setGateOpen(false)}>← {t('back')}</button> : <span />}
        <button className="link muted-link" onClick={signOutNow}>
          <LogOut size={12} /> {t('logout')}
        </button>
      </div>
    </div>
  );
}