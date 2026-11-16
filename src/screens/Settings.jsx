import { useEffect, useState } from 'react';
import {
  Download, RefreshCw, Rocket, Trash2, Copy, Upload, Sparkles, UserX, UserCheck, UserPlus,
  Moon, Sun, LogOut, Share2, KeyRound, Repeat, Plus, DoorOpen, Pencil, Home,
} from 'lucide-react';
import { useApp, THEMES, num } from '../store.jsx';
import { APP_VERSION, DEFAULT_REPO, openExternal, fetchDownloadCount, normalizeRepo } from '../update.js';
import { DEVELOPER, cloudReady } from '../config.js';
import * as C from '../cloud.js';
import { Avatar, Field, Modal, ManagerBadge, SectionHead, useToast } from '../ui.jsx';
import { MemberModal } from './Dashboard.jsx';
import { UserAvatar, EditProfileModal } from '../profile.jsx';

/* ---------------- অ্যাপ আপডেট ---------------- */
function UpdateCard({ update, runCheck }) {
  const { t } = useApp();
  const { status, latest, notes, url, error } = update.result || {};
  const busy = update.checking;
  return (
    <div className={`card update ${status === 'available' ? 'update-new' : ''}`}>
      <div className="row between center">
        <div className="row gap center">
          <div className="hero-icon sm"><Rocket size={16} /></div>
          <div>
            <b>{t('update')}</b>
            <p className="muted small">{t('version')}: v{APP_VERSION}</p>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={runCheck} disabled={busy}>
          <RefreshCw size={13} className={busy ? 'spin' : ''} /> {busy ? t('checking') : t('checkUpdate')}
        </button>
      </div>
      {status === 'latest' && <p className="ok-text">{t('upToDate')}</p>}
      {status === 'norelease' && <p className="warn-text">{t('updateNoRelease')}</p>}
      {status === 'error' && <p className="warn-text">{t('updateError')} ({error})</p>}
      {status === 'norepo' && <p className="warn-text">{t('updateNoRepo')}</p>}
      {status === 'available' && (
        <div className="update-box">
          <div className="row between center">
            <b><Sparkles size={14} /> {t('updateAvailable')}</b>
            <span className="badge badge-accent">{t('newVersion')}: v{latest}</span>
          </div>
          {notes && (<><p className="muted small">{t('whatsNew')}</p><pre className="notes">{notes}</pre></>)}
          <button className="btn btn-primary full" onClick={() => openExternal(url)}>
            <Download size={14} /> {t('downloadUpdate')}
          </button>
          <p className="muted small">{t('installHint')}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- কমিউনিটি কাউন্টার ---------------- */
function Community({ repo }) {
  const { t, lang, cloudOn } = useApp();
  const [dl, setDl] = useState(null);
  const [st, setSt] = useState(null);
  useEffect(() => {
    fetchDownloadCount(repo).then(setDl).catch(() => {});
    if (cloudOn) C.publicStats().then(setSt).catch(() => {});
  }, [repo, cloudOn]);
  const f = (v) => (v == null ? '—' : num(v, lang, 0));
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <b className="name">{t('community')}</b>
      </div>
      <div className="row gap">
        <div className="stat"><b className="accent">{f(dl)}</b><span>{t('downloads')}</span></div>
        {cloudOn && (
          <>
            <div className="stat"><b style={{ color: 'var(--warn)' }}>{f(st?.users)}</b><span>{t('usersCount')}</span></div>
            <div className="stat"><b style={{ color: 'var(--purple)' }}>{f(st?.active7)}</b><span>{t('activeWeek')}</span></div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- ডেভেলপার কার্ড ---------------- */
function DevCard() {
  const { t } = useApp();
  const [hasPhoto, setHasPhoto] = useState(true);
  const initials = DEVELOPER.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <div className="card dev">
      <p className="muted dev-tag">{t('developedBy')}</p>
      <div className="row gap center">
        {hasPhoto ? (
          <img className="dev-photo" src="./developer.jpg" alt={DEVELOPER.name} onError={() => setHasPhoto(false)} />
        ) : (
          <div className="dev-photo ph">{initials}</div>
        )}
        <div className="grow">
          <div className="dev-name">{DEVELOPER.name}</div>
          <p className="muted">{t('devRole')}</p>
          <div className="row gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
            {DEVELOPER.links.map((l) => (
              <button key={l.label} className="badge badge-muted" onClick={() => openExternal(l.url)}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="muted small center-text">{t('madeIn')} · v{APP_VERSION}</p>
    </div>
  );
}

/* ---------------- অ্যাকাউন্ট ও মেস কার্ড (ক্লাউড) ---------------- */
function AccountCard() {
  const { t, profile, session, signOutNow } = useApp();
  const [edit, setEdit] = useState(false);
  return (
    <div className="card row between center">
      <div className="row gap center">
        <UserAvatar name={profile?.full_name || profile?.username} url={profile?.avatar_url} size={46} round />
        <div>
          <p className="name">{profile?.full_name || '—'}</p>
          <p className="muted small">{profile?.username && `@${profile.username} · `}{session?.user?.email}</p>
        </div>
      </div>
      <div className="row gap">
        <button className="icon-btn" onClick={() => setEdit(true)} aria-label={t('editProfile')} title={t('editProfile')}><Pencil size={15} /></button>
        <button className="icon-btn danger" onClick={signOutNow} aria-label={t('logout')} title={t('logout')}><LogOut size={15} /></button>
      </div>
      <EditProfileModal open={edit} onClose={() => setEdit(false)} />
    </div>
  );
}

function GuestCard({ goHome }) {
  const { t } = useApp();
  return (
    <div className="card stack-sm">
      <b className="name">{t('guestSettingsTitle')}</b>
      <p className="muted small">{t('guestSettingsHint')}</p>
      <button className="btn btn-primary full" onClick={goHome}><Home size={14} /> {t('goHome')}</button>
    </div>
  );
}

function MessCard() {
  const { t, activeMess, messes, isManager, setSettings, setGateOpen, refreshMesses, data } = useApp();
  const toast = useToast();
  const [passOpen, setPassOpen] = useState(false);
  const [mp, setMp] = useState('');
  const [gp, setGp] = useState('');
  const [busy, setBusy] = useState(false);
  if (!activeMess) return null;

  const run = async (fn, okMsg) => {
    try {
      setBusy(true);
      await fn();
      if (okMsg) toast(okMsg);
    } catch (e) {
      const m = C.errCode(e);
      toast(m.includes('WEAK_PASS') ? t('errWeakPass') : m.includes('SAME_PASS') ? t('errSamePass') : m.includes('FOUNDER') ? t('errFounderLeave') : m, 'err');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const r = await C.shareText(C.inviteText(activeMess, t, data.settings.repo), t('appTitle'));
    if (r !== 'cancel') toast(t('codeCopied'));
  };

  return (
    <div className="card stack-sm">
      <div className="row between center">
        <div>
          <p className="muted small">{t('myMess')}</p>
          <p className="name big">{activeMess.name}</p>
        </div>
        <span className={`badge ${isManager ? 'badge-accent' : 'badge-muted'}`}>{isManager ? t('manager') : t('viewer')}</span>
      </div>

      <div className="code-box mini">
        <div>
          <p className="muted small">{t('messCode')}</p>
          <b className="code sm">{activeMess.code}</b>
        </div>
        <div className="row gap">
          <button className="icon-btn" aria-label="copy" onClick={() => navigator.clipboard?.writeText(activeMess.code).then(() => toast(t('codeCopied')))}>
            <Copy size={14} />
          </button>
          <button className="icon-btn" aria-label="share" onClick={share}><Share2 size={14} /></button>
        </div>
      </div>

      {messes.length > 1 && (
        <Field label={t('switchMess')}>
          <select value={activeMess.id} onChange={(e) => setSettings({ messId: e.target.value })}>
            {messes.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </Field>
      )}

      <div className="row gap" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setGateOpen(true)}><Plus size={13} /> {t('newOrJoin')}</button>
        {isManager && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setPassOpen(true)}><KeyRound size={13} /> {t('changePass')}</button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => window.confirm(t('confirmRotate')) && run(async () => { await C.rotateCode(activeMess.id); await refreshMesses(); }, t('codeRotated'))}
            >
              <Repeat size={13} /> {t('rotateCode')}
            </button>
          </>
        )}
        {!activeMess.founder && (
          <button
            className="btn btn-danger btn-sm"
            disabled={busy}
            onClick={() =>
              window.confirm(t('confirmLeave')) &&
              run(async () => { await C.leaveMess(activeMess.id); setSettings({ messId: null }); await refreshMesses(); })
            }
          >
            <DoorOpen size={13} /> {t('leaveMess')}
          </button>
        )}
      </div>

      <Modal open={passOpen} title={t('changePass')} onClose={() => setPassOpen(false)}>
        <p className="muted small">{t('passChangeHint')}</p>
        <Field label={t('newMemberPass')}><input type="password" value={mp} onChange={(e) => setMp(e.target.value)} autoComplete="new-password" /></Field>
        <Field label={t('newManagerPass')}><input type="password" value={gp} onChange={(e) => setGp(e.target.value)} autoComplete="new-password" /></Field>
        <button
          className="btn btn-primary full"
          disabled={busy || (!mp && !gp)}
          onClick={() => run(async () => { await C.setPasswords(activeMess.id, mp, gp); setMp(''); setGp(''); setPassOpen(false); }, t('passChanged'))}
        >
          {t('save')}
        </button>
      </Modal>
    </div>
  );
}

/* ---------------- মেম্বার ও রোল ---------------- */
function MembersSection() {
  const { data, t, cloudOn, isManager, userId, editMember, removeMember } = useApp();
  const toast = useToast();
  const [memOpen, setMemOpen] = useState(false);
  const { members } = data;
  const activeManagers = members.filter((x) => x.isManager && x.active !== false);

  const toggleManager = (m) => {
    if (!cloudOn && m.isManager && activeManagers.length <= 1) return toast(t('needOneManager'), 'err');
    editMember(m.id, { isManager: !m.isManager });
  };

  return (
    <>
      <SectionHead
        title={t('roles')}
        right={isManager && !cloudOn && (
          <button className="link" onClick={() => setMemOpen(true)}><UserPlus size={12} /> {t('addMember')}</button>
        )}
      />
      <div className="stack">
        {members.map((m) => {
          const locked = m.isFounder; // প্রতিষ্ঠাতাকে কেউ বদলাতে পারে না
          return (
            <div className={`card row between center ${m.active === false ? 'dim' : ''}`} key={m.id}>
              <div className="row gap center">
                <Avatar member={m} size={30} />
                <div>
                  <p className="name">
                    {m.name} {m.isManager && <ManagerBadge />} {m.isFounder && <span className="badge badge-muted">{t('founder')}</span>}
                  </p>
                  {m.username && <p className="muted small">@{m.username}</p>}
                  {m.active === false && <p className="muted small">{t('inactive')}</p>}
                </div>
              </div>
              {isManager && !locked && (
                <div className="row gap center">
                  {m.active !== false && (
                    <button className={`btn btn-xs ${m.isManager ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleManager(m)}>
                      {m.isManager ? t('manager') : t('viewer')}
                    </button>
                  )}
                  {m.active === false ? (
                    !cloudOn && (
                      <button className="icon-btn" onClick={() => editMember(m.id, { active: true })} aria-label={t('reactivate')} title={t('reactivate')}>
                        <UserCheck size={14} />
                      </button>
                    )
                  ) : (
                    m.id !== userId && (
                      <button
                        className="icon-btn danger"
                        title={t('leave')}
                        aria-label={t('leave')}
                        onClick={() => {
                          if (!cloudOn && m.isManager && activeManagers.length <= 1) return toast(t('needOneManager'), 'err');
                          if (window.confirm(`${cloudOn ? t('removeConfirm') : t('removeMember')}: ${m.name}?`)) removeMember(m.id);
                        }}
                      >
                        <UserX size={14} />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!cloudOn && <MemberModal open={memOpen} onClose={() => setMemOpen(false)} />}
    </>
  );
}

/* ---------------- ব্যাকআপ (শুধু একা ব্যবহার মোডে) ---------------- */
function BackupSection() {
  const { data, t, isManager, replaceAll, loadDemo, clearAll } = useApp();
  const toast = useToast();
  const [impOpen, setImpOpen] = useState(false);
  const [impText, setImpText] = useState('');

  const exportBackup = async () => {
    const json = JSON.stringify(data);
    try { await navigator.clipboard.writeText(json); toast(t('copied')); } catch (e) { window.prompt(t('exportBackup'), json); }
  };
  const importNow = (text) => {
    try {
      const p = JSON.parse(text);
      if (!p || !Array.isArray(p.members) || !Array.isArray(p.deposits) || !Array.isArray(p.bazar) || typeof p.meals !== 'object') throw new Error('bad');
      if (!Array.isArray(p.bua)) p.bua = [];
      replaceAll(p);
      setImpOpen(false);
      setImpText('');
      toast(t('importOk'));
    } catch (e) {
      toast(t('importBad'), 'err');
    }
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importNow(String(r.result));
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <>
      <SectionHead title={t('backup')} />
      <div className="card stack-sm">
        <p className="muted small">{t('offlineNote')}</p>
        <div className="row gap">
          <button className="btn btn-ghost grow" onClick={exportBackup}><Copy size={14} /> {t('exportBackup')}</button>
          <button className="btn btn-ghost grow" onClick={() => setImpOpen(true)}><Upload size={14} /> {t('importBackup')}</button>
        </div>
        {isManager && (
          <>
            <button className="btn btn-amber full" onClick={() => window.confirm(t('confirmDemo')) && (loadDemo(), toast(t('saved')))}>{t('restoreDemo')}</button>
            <button className="btn btn-danger full" onClick={() => window.confirm(t('confirmClear')) && (clearAll(), toast(t('deleted')))}>
              <Trash2 size={14} /> {t('clearAll')}
            </button>
          </>
        )}
      </div>
      <Modal open={impOpen} title={t('importBackup')} onClose={() => setImpOpen(false)}>
        <Field label={t('pasteBackup')}><textarea rows={5} value={impText} onChange={(e) => setImpText(e.target.value)} /></Field>
        <div className="row gap">
          <button className="btn btn-primary grow" onClick={() => importNow(impText)}>{t('importBackup')}</button>
          <label className="btn btn-ghost">{t('pickFile')}<input type="file" accept="application/json,.json,.txt" hidden onChange={onFile} /></label>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- সেটিংস স্ক্রিন ---------------- */
export default function Settings({ update, runCheck, goHome }) {
  const { data, t, lang, cloudOn, guest, me, setSettings } = useApp();
  const { settings, members } = data;

  return (
    <div className="screen">
      <h2 className="title">{t('settingsTitle')}</h2>

      {guest && <GuestCard goHome={goHome} />}
      {cloudOn && !guest && <AccountCard />}
      {cloudOn && !guest && <MessCard />}

      <div className="card stack-sm">
        <div className="row between center">
          <b>{t('repoLabel')}</b>
          {DEFAULT_REPO && (
            <button className="link muted-link" onClick={() => setSettings({ repo: DEFAULT_REPO })}>Default</button>
          )}
        </div>
        <input
          value={settings.repo || ''}
          placeholder={DEFAULT_REPO || 'owner/repo'}
          onChange={(e) => setSettings({ repo: normalizeRepo(e.target.value) })}
        />
        {!settings.repo && DEFAULT_REPO && <p className="muted small">Using default repo: {DEFAULT_REPO}</p>}
      </div>

      <UpdateCard update={update} runCheck={runCheck} />
      <Community repo={settings.repo || DEFAULT_REPO} />

      {!cloudOn && (
        <>
          <SectionHead title={t('profile')} />
          <div className="card">
            <p className="muted small">{t('profileHint')}</p>
            <select value={me?.id} onChange={(e) => setSettings({ meId: e.target.value })}>
              {members.filter((m) => m.active !== false).map((m) => (
                <option key={m.id} value={m.id}>{m.name} {m.isManager ? `(${t('manager')})` : ''}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <SectionHead title={t('appearance')} />
      <div className="card stack-sm">
        <div className="swatches">
          {THEMES.map((th) => (
            <button key={th.id} className={`swatch ${settings.theme === th.id ? 'on' : ''}`} style={{ background: th.color }} onClick={() => setSettings({ theme: th.id })} aria-label={th.id} />
          ))}
        </div>
        <div className="row between center">
          <span className="row gap center">{settings.mode === 'dark' ? <Moon size={15} /> : <Sun size={15} />} {t('darkMode')}</span>
          <button className={`switch ${settings.mode === 'dark' ? 'on' : ''}`} onClick={() => setSettings({ mode: settings.mode === 'dark' ? 'light' : 'dark' })} aria-label="mode"><i /></button>
        </div>
        <div className="row between center">
          <span>{t('language')}</span>
          <div className="seg">
            <button className={lang === 'bn' ? 'on' : ''} onClick={() => setSettings({ lang: 'bn' })}>বাংলা</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setSettings({ lang: 'en' })}>English</button>
          </div>
        </div>
      </div>

      {!guest && <MembersSection />}

      {!cloudOn && <BackupSection />}

      {!cloudReady && (
        <div className="card stack-sm">
          <b className="name">{t('cloudOffTitle')}</b>
          <p className="muted small">{t('cloudOffHint')}</p>
        </div>
      )}

      <DevCard />
    </div>
  );
}