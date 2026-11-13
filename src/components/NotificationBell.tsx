import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { QUERY_ROLES, notificationsChanged, useNotifications, type QueryNotification } from '../lib/queries';
import { useAuth } from '../state/auth';
export default function NotificationBell() {
  const { user } = useAuth(); const navigate = useNavigate();
  const role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const enabled = QUERY_ROLES.includes(role ?? '');
  const { inbox, error, page, setPage, refresh } = useNotifications(api, enabled ? user?.id ?? user?._id ?? '' : '');
  const [detail,setDetail]=useState<QueryNotification|null>(null);
  const [open, setOpen] = useState(false), [opening, setOpening] = useState(''), [actionError, setActionError] = useState('');
  if (!enabled) return null;
  const count = inbox?.unreadCount ?? 0;
  async function view(item: QueryNotification) {
    setOpening(item._id); setActionError('');
    try { await api.post(`/notifications/${item._id}/seen`); notificationsChanged(); setOpen(false); if(item.kind==='CP_REMINDER'||!item.thread)setDetail(item);else navigate(`/queries?thread=${encodeURIComponent(item.thread)}`); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to open notification.'); }
    finally { setOpening(''); }
  }
  return <><div className="notification-anchor"><button className="icon-button notification" aria-label={`Notifications, ${count} unread`} aria-expanded={open} onClick={() => { setOpen(!open); refresh(); }}><Bell size={19}/>{count > 0 && <span className="notification-count">{count > 99 ? '99+' : count}</span>}</button>
    {open && <section className="notification-panel" aria-label="Notifications"><div className="notification-heading"><b>Notifications ({count} unread)</b><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={17}/></button></div>
      {(error || actionError) && <div className="form-error" role="alert">{actionError || error}<button className="filter-btn" onClick={refresh}>Retry</button></div>}
      {!inbox && !error && <p>Loading notifications...</p>}
      {inbox?.items.map(item => <button key={item._id} className={`notification-item ${item.readAt ? '' : 'unread'}`} disabled={Boolean(opening)} onClick={() => void view(item)}><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleString('en-IN')}{item.readAt ? '' : ' · Unread'}</small></button>)}
      {inbox && !inbox.items.length && <p>No notifications yet.</p>}
      <button className="filter-btn" onClick={refresh}>Refresh notifications</button>
      <div className="query-pager"><button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Newer</button><button className="filter-btn" disabled={!inbox || page >= inbox.meta.totalPages} onClick={() => setPage(page + 1)}>Older</button></div>
    </section>}
  </div>{detail&&<div className="modal-backdrop"><section className="create-modal" role="dialog" aria-modal="true" aria-label="CP notification"><div className="modal-heading"><h2>{detail.title}</h2><button className="icon-button" onClick={()=>setDetail(null)} aria-label="Close message"><X size={18}/></button></div><p style={{whiteSpace:'pre-wrap'}}>{detail.body}</p><small>{new Date(detail.createdAt).toLocaleString('en-IN')}</small></section></div>}</>;
}
