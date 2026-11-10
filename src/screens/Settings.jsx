import { useState } from 'react';
import { Download, RefreshCw, Rocket, Trash2, Copy, Upload, Sparkles, UserX, UserCheck, UserPlus, Moon, Sun } from 'lucide-react';
import { useApp, THEMES } from '../store.jsx';
import { APP_VERSION, DEFAULT_REPO, openExternal } from '../update.js';
import { Avatar, Field, Modal, ManagerBadge, SectionHead, useToast } from '../ui.jsx';
import { MemberModal } from './Dashboard.jsx';

function UpdateCard({ update, runCheck, repo, setRepo }) {
  const { t } = useApp();
  const { status, latest, notes, url, error } = update.result || {};
  const busy = update.checking;

  return (
    <div className={`card update ${status === 'available' ? 'update-new' : ''}`}>
      <div className="row between center">
        <div className="row gap center">
          <div className="hero-icon sm">
            <Rocket size={16} />
          </div>
          <div>
            <b>{t('update')}</b>
            <p className="muted small">
              {t('version')}: v{APP_VERSION}
            </p>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={runCheck} disabled={busy}>
          <RefreshCw size={13} className={busy ? 'spin' : ''} /> {busy ? t('checking') : t('checkUpdate')}
        </button>
      </div>

      {status === 'latest' && <p className="ok-text">{t('upToDate')}</p>}
      {status === 'norelease' && <p className="warn-text">{t('updateNoRelease')}</p>}
      {status === 'error' && (
        <p className="warn-text">
          {t('updateError')} ({error})
        </p>
      )}
      {status === 'norepo' && <p className="warn-text">{t('updateNoRepo')}</p>}

      {status === 'available' && (
        <div className="update-box">
          <div className="row between center">
            <b>
              <Sparkles size={14} /> {t('updateAvailable')}
            </b>
            <span className="badge badge-accent">
              {t('newVersion')}: v{latest}
            </span>
          </div>
          {notes && (
            <>
              <p className="muted small">{t('whatsNew')}</p>
              <pre className="notes">{notes}</pre>
            </>
          )}
          <button className="btn btn-primary full" onClick={() => openExternal(url)}>
            <Download size={14} /> {t('downloadUpdate')}
          </button>
          <p className="muted small">{t('installHint')}</p>
        </div>
      )}

      {!DEFAULT_REPO && (
        <Field label={t('repoLabel')}>
          <input type="text" value={repo} placeholder="username/bachelor-mess" onChange={(e) => setRepo(e.target.value)} onBlur={runCheck} />
        </Field>
      )}
    </div>
  );
}

export default function Settings({ update, runCheck }) {
  const { data, t, lang, isManager, me, setSettings, editMember, removeMember, replaceAll, loadDemo, clearAll } = useApp();
  const toast = useToast();
  const { settings, members } = data;
  const [memOpen, setMemOpen] = useState(false);
  const [impOpen, setImpOpen] = useState(false);
  const [impText, setImpText] = useState('');

  const toggleManager = (m) => {
    const managers = members.filter((x) => x.isManager && x.active !== false);
    if (m.isManager && managers.length <= 1) return toast(t('needOneManager'), 'err');
    editMember(m.id, { isManager: !m.isManager });
  };

  const exportBackup = async () => {
    const json = JSON.stringify(data);
    try {
      await navigator.clipboard.writeText(json);
      toast(t('copied'));
    } catch (e) {
      window.prompt(t('exportBackup'), json);
    }
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
    <div className="screen">
      <h2 className="title">{t('settingsTitle')}</h2>

      <UpdateCard update={update} runCheck={runCheck} repo={settings.repo} setRepo={(v) => setSettings({ repo: v })} />

      <SectionHead title={t('profile')} />
      <div className="card">
        <p className="muted small">{t('profileHint')}</p>
        <select value={me?.id} onChange={(e) => setSettings({ meId: e.target.value })}>
          {members
            .filter((m) => m.active !== false)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.isManager ? `(${t('manager')})` : ''}
              </option>
            ))}
        </select>
      </div>

      <SectionHead title={t('appearance')} />
      <div className="card stack-sm">
        <div className="swatches">
          {THEMES.map((th) => (
            <button
              key={th.id}
              className={`swatch ${settings.theme === th.id ? 'on' : ''}`}
              style={{ background: th.color }}
              onClick={() => setSettings({ theme: th.id })}
              aria-label={th.id}
            />
          ))}
        </div>
        <div className="row between center">
          <span className="row gap center">
            {settings.mode === 'dark' ? <Moon size={15} /> : <Sun size={15} />} {t('darkMode')}
          </span>
          <button className={`switch ${settings.mode === 'dark' ? 'on' : ''}`} onClick={() => setSettings({ mode: settings.mode === 'dark' ? 'light' : 'dark' })} aria-label="mode">
            <i />
          </button>
        </div>
        <div className="row between center">
          <span>{t('language')}</span>
          <div className="seg">
            <button className={lang === 'bn' ? 'on' : ''} onClick={() => setSettings({ lang: 'bn' })}>
              বাংলা
            </button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setSettings({ lang: 'en' })}>
              English
            </button>
          </div>
        </div>
      </div>

      <SectionHead
        title={t('roles')}
        right={
          isManager && (
            <button className="link" onClick={() => setMemOpen(true)}>
              <UserPlus size={12} /> {t('addMember')}
            </button>
          )
        }
      />
      <div className="stack">
        {members.map((m) => (
          <div className={`card row between center ${m.active === false ? 'dim' : ''}`} key={m.id}>
            <div className="row gap center">
              <Avatar member={m} size={30} />
              <div>
                <p className="name">
                  {m.name} {m.isManager && <ManagerBadge />}
                </p>
                {m.active === false && <p className="muted small">{t('inactive')}</p>}
              </div>
            </div>
            {isManager && (
              <div className="row gap center">
                {m.active !== false && (
                  <button className={`btn btn-xs ${m.isManager ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleManager(m)}>
                    {m.isManager ? t('manager') : t('viewer')}
                  </button>
                )}
                {m.active === false ? (
                  <button className="icon-btn" onClick={() => editMember(m.id, { active: true })} aria-label={t('reactivate')} title={t('reactivate')}>
                    <UserCheck size={14} />
                  </button>
                ) : (
                  <button
                    className="icon-btn danger"
                    title={t('leave')}
                    aria-label={t('leave')}
                    onClick={() => {
                      if (m.isManager && members.filter((x) => x.isManager && x.active !== false).length <= 1) return toast(t('needOneManager'), 'err');
                      if (window.confirm(`${t('removeMember')}: ${m.name}?`)) removeMember(m.id);
                    }}
                  >
                    <UserX size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionHead title={t('backup')} />
      <div className="card stack-sm">
        <p className="muted small">{t('offlineNote')}</p>
        <div className="row gap">
          <button className="btn btn-ghost grow" onClick={exportBackup}>
            <Copy size={14} /> {t('exportBackup')}
          </button>
          <button className="btn btn-ghost grow" onClick={() => setImpOpen(true)}>
            <Upload size={14} /> {t('importBackup')}
          </button>
        </div>
        {isManager && (
          <>
            <button
              className="btn btn-amber full"
              onClick={() => window.confirm(t('confirmDemo')) && (loadDemo(), toast(t('saved')))}
            >
              {t('restoreDemo')}
            </button>
            <button className="btn btn-danger full" onClick={() => window.confirm(t('confirmClear')) && (clearAll(), toast(t('deleted')))}>
              <Trash2 size={14} /> {t('clearAll')}
            </button>
          </>
        )}
      </div>

      <MemberModal open={memOpen} onClose={() => setMemOpen(false)} />

      <Modal open={impOpen} title={t('importBackup')} onClose={() => setImpOpen(false)}>
        <Field label={t('pasteBackup')}>
          <textarea rows={5} value={impText} onChange={(e) => setImpText(e.target.value)} />
        </Field>
        <div className="row gap">
          <button className="btn btn-primary grow" onClick={() => importNow(impText)}>
            {t('importBackup')}
          </button>
          <label className="btn btn-ghost">
            {t('pickFile')}
            <input type="file" accept="application/json,.json,.txt" hidden onChange={onFile} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
