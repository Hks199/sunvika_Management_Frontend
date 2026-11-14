import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { QUERY_ROLES, notificationsChanged, personName, type QueryDetail, type QueryRecipient, type QueryThread, type PageMeta } from '../lib/queries';
import { useAuth } from '../state/auth';

function Conversation({ id, onReply }: { id: string; onReply: () => void }) {
  const [detail, setDetail] = useState<QueryDetail | null>(null), [page, setPage] = useState(1), [tick, setTick] = useState(0);
  const [error, setError] = useState(''), [body, setBody] = useState(''), [busy, setBusy] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    setDetail(null); setError('');
    void api.get<QueryDetail>(`/queries/${encodeURIComponent(id)}?page=${page}&limit=50`).then(result => { if (active) setDetail(result.data); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load query.'); });
    return () => { active = false; };
  }, [id, page, tick]);
  useEffect(() => {
    if (!detail?.messages.length) return;
    const markSeen = () => {
      if (document.visibilityState !== 'visible') return;
      void api.post(`/queries/${encodeURIComponent(id)}/seen`, { messageIds: detail.messages.map(message => message._id) }).then(notificationsChanged).catch(cause => setError(cause instanceof Error ? cause.message : 'Unable to mark messages as seen.'));
    };
    markSeen(); document.addEventListener('visibilitychange', markSeen);
    return () => document.removeEventListener('visibilitychange', markSeen);
  }, [detail, id]);
  async function reply(event: FormEvent) {
    event.preventDefault(); if (sending.current || !body.trim()) return;
    sending.current = true; setBusy(true); setError('');
    try { await api.post(`/queries/${encodeURIComponent(id)}/replies`, { body: body.trim() }); setBody(''); setPage(1); setTick(value => value + 1); notificationsChanged(); onReply(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send reply.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <section className="panel query-conversation"><div className="notification-heading"><h2>{detail?.thread.title ?? 'Query conversation'}</h2><button className="filter-btn" onClick={() => setTick(value => value + 1)}>Refresh</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!detail && !error && <p>Loading conversation...</p>}
    {detail && <><p className="query-meta">From {personName(detail.thread.createdBy)} · To {personName(detail.thread.assignedTo)} ({detail.thread.recipientRole === 'CP_HEAD' ? 'CP Head' : detail.thread.recipientRole})</p>
      <div className="query-pager"><button className="filter-btn" disabled={page >= detail.meta.totalPages} onClick={() => setPage(page + 1)}>Older messages</button><span>Page {page}</span><button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Newer messages</button></div>
      {detail.messages.map(message => <article className="query-message" key={message._id}><b>{personName(message.sender)}</b><small>{new Date(message.createdAt).toLocaleString('en-IN')}</small><p>{message.body}</p></article>)}
      <form className="query-form" onSubmit={event => void reply(event)}><label>Reply<textarea required value={body} maxLength={5000} rows={4} disabled={busy} onChange={event => setBody(event.target.value)}/></label><button className="primary-btn" disabled={busy || !body.trim()}>{busy ? 'Sending...' : 'Send reply'}</button></form>
    </>}
  </section>;
}

export default function Queries() {
  const { user } = useAuth(); const role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const enabled = QUERY_ROLES.includes(role ?? ''), canCreate = ['MD', 'RM', 'CP'].includes(role ?? '');
  const [params, setParams] = useSearchParams(); const selected = params.get('thread') ?? '';
  const [items, setItems] = useState<QueryThread[]>([]), [meta, setMeta] = useState<PageMeta | null>(null), [page, setPage] = useState(1), [tick, setTick] = useState(0);
  const [recipients, setRecipients] = useState<QueryRecipient[]>([]), [recipientRole, setRecipientRole] = useState('CP_HEAD'), [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [error, setError] = useState(''), [recipientError, setRecipientError] = useState(''), [creating, setCreating] = useState(false), [busy, setBusy] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    if (!enabled) return; let active = true;
    void api.get<{ items: QueryThread[]; meta: PageMeta }>(`/queries?page=${page}&limit=20`).then(result => { if (active) { setItems(result.data.items); setMeta(result.data.meta); setError(''); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load queries.'); });
    return () => { active = false; };
  }, [enabled, page, tick]);
  useEffect(() => {
    if (!canCreate || !creating) return; let active = true; setRecipientError('');
    void api.get<QueryRecipient[]>('/queries/recipients').then(result => { if (active) setRecipients(result.data); }).catch(cause => { if (active) setRecipientError(cause instanceof Error ? cause.message : 'Unable to load recipients.'); });
    return () => { active = false; };
  }, [canCreate, creating, tick]);
  async function create(event: FormEvent) {
    event.preventDefault(); if (sending.current) return; sending.current = true; setBusy(true); setError('');
    try { const result = await api.post<{ _id: string }>('/queries', { title: title.trim(), body: body.trim(), recipientRole, recipientId }); setCreating(false); setTitle(''); setBody(''); setRecipientId(''); setPage(1); setTick(value => value + 1); setParams({ thread: result.data._id }); notificationsChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to raise query.'); }
    finally { sending.current = false; setBusy(false); }
  }
  if (!enabled) return <p>Queries are not available for your role.</p>;
  const choices = recipients.filter(person => person.roleCode === recipientRole);
  return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">TEAM SUPPORT</div><h1>Queries</h1><p>Send questions, follow replies, and keep MD informed.</p></div><div className="heading-actions"><button className="filter-btn" onClick={() => setTick(value => value + 1)}>Refresh</button>{canCreate && <button className="primary-btn" disabled={busy} onClick={() => setCreating(!creating)}>{creating ? 'Cancel' : 'Raise query'}</button>}</div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {creating && <form className="panel query-form" onSubmit={event => void create(event)}><h2>Raise a query</h2><label>Send to<select value={recipientRole} disabled={busy} onChange={event => { setRecipientRole(event.target.value); setRecipientId(''); }}><option value="CP_HEAD">CP Head</option><option value="MIS">MIS</option>{(role === 'CP' || role === 'MD') && <option value="RM">RM</option>}</select></label><label>Recipient<select required value={recipientId} disabled={busy} onChange={event => setRecipientId(event.target.value)}><option value="">Choose recipient</option>{choices.map(person => <option key={person._id} value={person._id}>{personName(person)} ({person.employeeCode})</option>)}</select></label>{recipientError && <p className="form-error">{recipientError}</p>}{!choices.length && !recipientError && <p>No available recipient for this role. Try the other option or contact MD.</p>}<label>Subject<input required maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/></label><label>Query<textarea required maxLength={5000} rows={5} value={body} disabled={busy} onChange={event => setBody(event.target.value)}/></label><button className="primary-btn" disabled={busy || !recipientId || !title.trim() || !body.trim()}>{busy ? 'Sending...' : 'Send query'}</button></form>}
    <div className="query-layout"><section className="panel query-list" aria-label="Query list">{items.map(item => <button key={item._id} className={`query-list-item ${selected === item._id ? 'selected' : ''}`} onClick={() => setParams({ thread: item._id })}><b>{item.title}</b><span>{personName(item.createdBy)} → {personName(item.assignedTo)}</span><small>{new Date(item.lastMessageAt).toLocaleString('en-IN')}</small></button>)}{!items.length && <p>No queries yet.</p>}<div className="query-pager"><button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="filter-btn" disabled={!meta || page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button></div></section>{selected ? <Conversation key={selected} id={selected} onReply={() => setTick(value => value + 1)}/> : <section className="panel query-conversation"><p>Select a query to read the conversation.</p></section>}</div>
  </div>;
}
