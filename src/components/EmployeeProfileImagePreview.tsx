import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';

export default function EmployeeProfileImagePreview({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setUrl(''); setError('');
    void api.get<{ url?: string }>(`/employees/${encodeURIComponent(employeeId)}/profile-image-url`)
      .then(response => {
        if (!active) return;
        if (!response.data?.url) throw new Error('No profile image is saved for this employee. Use Change / add profile image to upload one.');
        const imageUrl = new URL(response.data.url);
        if (!['https:', 'http:'].includes(imageUrl.protocol)) throw new Error('The image address is invalid.');
        setUrl(imageUrl.href);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoading(false);
        setError((cause as { status?: number })?.status === 404
          ? 'No profile image is saved for this employee. Use Change / add profile image to upload one.'
          : cause instanceof Error ? cause.message : 'Unable to load profile image.');
      });
    return () => { active = false; };
  }, [employeeId, retry]);
  return <dialog ref={dialog} className="employee-photo-dialog" aria-labelledby="employee-photo-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="employee-photo-content">
      <div className="modal-heading"><h2 id="employee-photo-title">Profile image</h2><button className="icon-button" aria-label="Close profile image" onClick={onClose}><X size={20}/></button></div>
      {loading && <p role="status">Loading profile image...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {url && <img src={url} alt="Employee profile" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setUrl(''); setError('The saved photo could not be loaded. Retry, or replace it using Change / add profile image.'); }}/ >}
      <button className="filter-btn" disabled={loading} onClick={() => setRetry(value => value + 1)}>Retry image</button>
    </div>
  </dialog>;
}
