import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useApp } from './store.jsx';
import { Field, Modal, useToast } from './ui.jsx';

// ছবি বেছে নিলে মাঝখান থেকে বর্গাকার করে ১২৮×১২৮ করে ছোট JPEG বানায় (প্রায় ৫–১০ KB)
export function fileToAvatar(file, size = 128) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMG'));
    };
    img.src = url;
  });
}

// ছবি থাকলে ছবি, নইলে নামের প্রথম অক্ষর
export function UserAvatar({ name, url, size = 36, color = '#10b981', round = false }) {
  if (url) {
    return <img className="avatar-img" src={url} alt="" style={{ width: size, height: size, borderRadius: round ? '50%' : 12 }} />;
  }
  return (
    <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.42, borderRadius: round ? '50%' : 12 }}>
      {(name || '?').trim().charAt(0)}
    </div>
  );
}

export function EditProfileModal({ open, onClose }) {
  const { t, profile, updateMyProfile } = useApp();
  const toast = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile?.full_name || '');
      setPhoto(profile?.avatar_url || null);
    }
  }, [open, profile]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setPhoto(await fileToAvatar(f));
    } catch (err) {
      toast(t('photoBad'), 'err');
    }
  };

  const save = async () => {
    if (!name.trim()) return toast(t('errName'), 'err');
    try {
      setBusy(true);
      await updateMyProfile({ full_name: name.trim(), avatar_url: photo });
      toast(t('profileSaved'));
      onClose();
    } catch (err) {
      toast(String(err?.message || err), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={t('editProfile')} onClose={onClose}>
      <div className="avatar-edit">
        <UserAvatar name={name || profile?.username} url={photo} size={88} round />
        <button className="badge-cam" onClick={() => fileRef.current?.click()} aria-label={t('changePhoto')}>
          <Camera size={14} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
      <div className="row gap" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          <Camera size={13} /> {t('changePhoto')}
        </button>
        {photo && (
          <button className="btn btn-danger btn-sm" onClick={() => setPhoto(null)}>
            <Trash2 size={13} /> {t('removePhoto')}
          </button>
        )}
      </div>
      <Field label={t('yourName')}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </Field>
      <button className="btn btn-primary full" onClick={save} disabled={busy}>
        {busy ? t('loading') : t('save')}
      </button>
    </Modal>
  );
}