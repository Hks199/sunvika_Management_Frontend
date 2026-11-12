import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PUBLISHERS, announcementRoleAvailable, announcementAudienceCodes, announcementAudienceChanged, announcementAuthor, announcementsChanged, localAnnouncementDate, type Announcement, type AnnouncementAudience, type AnnouncementPage } from '../lib/announcements';

function AnnouncementForm({ item, onClose, onSaved }: { item: Announcement | null; onClose: () => void; onSaved: () => void }) {
  const [audience, setAudience] = useState<AnnouncementAudience | null>(null), [roles, setRoles] = useState<string[]>(announcementAudienceCodes(item?.audienceRoles ?? []));
  const [title, setTitle] = useState(item?.title ?? ''), [body, setBody] = useState(item?.body ?? ''), [category, setCategory] = useState(item?.category ?? 'BUSINESS'), [expiry, setExpiry] = useState(localAnnouncementDate(item?.expiresAt ?? null));
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [reload, setReload] = useState(0); const saving = useRef(false);
  useEffect(() => {
    let active = true;
    void api.get<AnnouncementAudience>('/announcements/audience').then(result => { if (active) { const roles = result.data.roles.filter(announcementRoleAvailable); setAudience({ ...result.data, roles }); setRoles(item ? announcementAudienceCodes(item.audienceRoles).filter(code => roles.some(role => role.code === code)) : roles.map(role => role.code)); setError(''); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load audience.'); });
    return () => { active = false; };
  }, [item, reload]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving.current) return; saving.current = true; setBusy(true); setError('');
    try {
      const payload: Record<string, unknown> = { title: title.trim(), body: body.trim(), category };
      if (!item || announcementAudienceChanged(item.audienceRoles, roles)) payload.audienceRoles = roles;
      if (!item || expiry !== localAnnouncementDate(item.expiresAt)) payload.expiresAt = expiry ? new Date(expiry).toISOString() : null;
      if (item) await api.patch(`/announcements/${item._id}`, payload); else await api.post('/announcements', payload);
      announcementsChanged(); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save announcement.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="panel"><form className="query-form" onSubmit={event => void save(event)}><h2>{item ? 'Edit announcement' : 'Publish announcement'}</h2><label>Category<select value={category} disabled={busy} onChange={event => setCategory(event.target.value)}>{ANNOUNCEMENT_CATEGORIES.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label>Title<input value={title} required maxLength={160} disabled={busy} onChange={event => setTitle(event.target.value)}/></label><label>Message<textarea value={body} required rows={5} maxLength={2000} disabled={busy} onChange={event => setBody(event.target.value)}/></label>
    <fieldset className="announcement-audience"><legend>Audience {audience?.scope === 'TEAM' ? '(your downline only)' : ''}</legend>{audience ? audience.roles.map(role => <label key={role.code}><input type="checkbox" checked={roles.includes(role.code)} disabled={busy} onChange={event => setRoles(current => event.target.checked ? [...current, role.code] : current.filter(code => code !== role.code))}/>{role.name} ({role.code})</label>) : <p>Loading permitted audiences...</p>}</fieldset><p className="query-meta">Audience changes apply to {audience?.scope === 'TEAM' ? 'your downline only' : 'the organization'}.</p>
    <label>Expires at (optional)<input type="datetime-local" value={expiry} disabled={busy} onChange={event => setExpiry(event.target.value)}/></label>{error && <div className="form-error" role="alert">{error}{!audience && <button type="button" className="filter-btn" onClick={() => setReload(value => value + 1)}>Retry audience</button>}</div>}<div className="heading-actions"><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy || !title.trim() || !body.trim() || !roles.length || !audience}>{busy ? 'Saving...' : item ? 'Save changes' : 'Publish'}</button></div></form></section>;
}

export default function Announcements() {
  const { user } = useAuth(), role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const allowed = ANNOUNCEMENT_PUBLISHERS.includes(role ?? '');
  const [result, setResult] = useState<AnnouncementPage | null>(null), [page, setPage] = useState(1), [tick, setTick] = useState(0), [editing, setEditing] = useState<Announcement | null | undefined>(undefined), [error, setError] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => { if (!allowed) return; let active = true; void api.get<AnnouncementPage>(`/announcements?page=${page}&limit=20`).then(response => { if (active) { setResult(response.data); setError(''); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load announcements.'); }); return () => { active = false; }; }, [allowed, page, tick]);
  async function toggle(item: Announcement) {
    setBusy(item._id); setError('');
    try { await api.patch(`/announcements/${item._id}`, { isActive: !item.isActive }); announcementsChanged(); setTick(value => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update announcement.'); }
    finally { setBusy(''); }
  }
  if (!allowed) return <p>Only MD, MIS, CP Head and RM can publish announcements. Announcements for you appear in the top bar.</p>;
  return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">TEAM FOCUS</div><h1>Announcements</h1><p>{role === 'MD' ? 'Manage all announcements across the organization.' : 'Publish business updates, targets and motivation for your permitted audience.'}</p></div><div className="heading-actions"><button className="filter-btn" onClick={() => { setTick(value => value + 1); announcementsChanged(); }}>Refresh</button><button className="primary-btn" disabled={Boolean(busy)} onClick={() => setEditing(null)}>New announcement</button></div></div>{error && <div className="form-error" role="alert">{error}</div>}
    {editing !== undefined && <AnnouncementForm key={editing?._id ?? 'new'} item={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setPage(1); setTick(value => value + 1); }}/>}
    {result?.items.map(item => <article className="panel announcement-record" key={item._id}><div className="notification-heading"><span className="permission-chip">{item.category}</span><span className="query-meta">{!item.isActive ? 'Stopped' : item.expiresAt && Date.parse(item.expiresAt) <= Date.now() ? 'Expired' : 'Active'}</span></div><h2>{item.title}</h2><p className="announcement-full">{item.body}</p><p className="query-meta">By {announcementAuthor(item)} · {item.scope === 'TEAM' ? 'Author’s downline' : 'Organization'} · {announcementAudienceCodes(item.audienceRoles).join(', ')}{item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleString('en-IN')}` : ''}</p><div className="heading-actions"><button className="secondary-btn" disabled={Boolean(busy)} onClick={() => setEditing(item)}>Edit</button><button className="filter-btn" disabled={Boolean(busy)} onClick={() => void toggle(item)}>{item.isActive ? 'Stop announcement' : 'Activate'}</button></div></article>)}
    {!result && !error && <p>Loading announcements...</p>}{result && !result.items.length && <p>No announcements yet.</p>}<div className="query-pager"><button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="filter-btn" disabled={!result || page >= result.meta.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>
  </div>;
}
