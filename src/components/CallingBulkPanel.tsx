import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
type Settings = { enabled: boolean; skipUnfinished: boolean };
type Batch = { _id: string; title: string; state: string; candidateCount: number; sheetCount: number; error: string };
export default function CallingBulkPanel({ refreshKey }: { refreshKey: number }) {
  const [settings, setSettings] = useState<Settings | null>(null), [batches, setBatches] = useState<Batch[]>([]);
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const [config, result] = await Promise.all([api.get<Settings>('/calling-lists/distribution'), api.get<{ data: Batch[]; total: number }>(`/calling-lists/batches?page=${page}&limit=10`)]); setSettings(config.data); setBatches(result.data.data); setTotal(result.data.total); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load batches'); } finally { setBusy(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  async function save() { if (!settings) return; setBusy(true); setError(''); setNotice(''); try { await api.patch('/calling-lists/distribution', { enabled: settings.enabled, skipUnfinished: settings.skipUnfinished }); setNotice('Daily distribution settings saved.'); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings'); } finally { setBusy(false); } }
  async function retry(id: string) { setBusy(true); setError(''); try { await api.post(`/calling-lists/batches/${id}/retry`); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to retry batch'); } finally { setBusy(false); } }
  return <section className="panel calling-panel"><h2>Daily allocation · 9:30 AM IST</h2><p>Unassigned candidate details stay in private S3 files. They enter the database only when assigned to an RM. Refresh manually to see import progress.</p>
    {settings && <form onSubmit={event => { event.preventDefault(); void save(); }}><fieldset disabled={busy} className="calling-fieldset"><div className="modal-fields">
      <label><span><input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })}/> Enable daily assignment</span></label>
      <label><span><input type="checkbox" checked={settings.skipUnfinished} onChange={e => setSettings({ ...settings, skipUnfinished: e.target.checked })}/> Wait until the RM has no uncalled candidates from earlier allocations</span></label>
    </div><button className="primary-btn">Save allocation settings</button></fieldset></form>}
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
    <div className="panel-heading"><h3>Upload batches ({total})</h3><button type="button" className="secondary-btn" disabled={busy} onClick={() => void load()}>Refresh batches</button></div>
    {batches.map(batch => <div key={batch._id} className="panel-heading"><div><b>{batch.title}</b><p>{batch.state} · {batch.candidateCount.toLocaleString()} candidates processed · {batch.sheetCount.toLocaleString()} sheets{batch.error ? ` · ${batch.error}` : ''}</p></div>{batch.state === 'FAILED' && <button className="secondary-btn" disabled={busy} onClick={() => void retry(batch._id)}>Retry processing</button>}</div>)}
    {!batches.length && <p>No upload batches yet.</p>}<div className="calling-pagination"><button className="secondary-btn" disabled={busy || page === 1} onClick={() => setPage(v => v - 1)}>Previous batches</button><span>Page {page}</span><button className="secondary-btn" disabled={busy || page * 10 >= total} onClick={() => setPage(v => v + 1)}>Next batches</button></div>
  </section>;
}
