import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { cpCustomerDocuments, cpCustomerFields, cpCustomerPayload, type CpCustomerDocument, type CpCustomerOptions, type CustomerPlace } from '../lib/cp-customer';

export default function CpCustomerConversion({ cpId, onClose, onSaved }: { cpId: string; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [files, setFiles] = useState<Partial<Record<CpCustomerDocument, File>>>({});
  const [states, setStates] = useState<CustomerPlace[]>([]), [districts, setDistricts] = useState<CustomerPlace[]>([]), [branches, setBranches] = useState<CustomerPlace[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const path = `/customers/from-cp/${encodeURIComponent(cpId)}`;
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void Promise.all([api.get<CpCustomerOptions>(`${path}/options`), api.get<CustomerPlace[]>('/geography/states')]).then(([response, places]) => {
      if (!active) return;
      if (response.data.customerId) { setDraft(null); setError('This CP already has a customer record. Close and refresh the details.'); return; }
      setDraft(response.data.defaults); setStates(places.data);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load conversion'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, reload]);
  useEffect(() => { let active = true; setDistricts([]); if (draft?.state) void api.get<CustomerPlace[]>(`/geography/states/${draft.state}/districts`).then(r => { if (active) setDistricts(r.data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [draft?.state]);
  useEffect(() => { let active = true; setBranches([]); if (draft?.district) void api.get<CustomerPlace[]>(`/geography/districts/${draft.district}/branches`).then(r => { if (active) setBranches(r.data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [draft?.district]);
  function update(key: string, value: string) { setDraft(previous => previous ? { ...previous, [key]: value, ...(key === 'state' ? { district: '', branch: '' } : key === 'district' ? { branch: '' } : {}) } : previous); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!draft || busy) return; setError('');
    try {
      const payload = cpCustomerPayload(draft);
      for (const type of cpCustomerDocuments) { const file = files[type]; if (!file || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 20 * 1024 * 1024) throw new Error(`Select ${type.replaceAll('_', ' ')} as PDF, JPEG, PNG or WebP, up to 20 MB.`); }
      if (!window.confirm('Create a linked customer record for this channel partner? The CP account and reporting manager will be preserved.')) return;
      setBusy(true);
      const response = await api.post<Array<{ uploadId: string; documentType: CpCustomerDocument }>>(`${path}/document-upload-urls`, { documents: cpCustomerDocuments.map(type => { const file = files[type]!; return { documentType: type, fileName: file.name, mimeType: file.type, fileSize: file.size }; }) });
      for (const upload of response.data) { const file = files[upload.documentType]; if (!file) throw new Error('Invalid document reservation. Please retry.'); await api.put(`${path}/document-uploads/${upload.uploadId}`, file, file.type); }
      await api.post(path, { ...payload, documentUploadIds: response.data.map(upload => upload.uploadId) }); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Conversion failed'); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" style={{ zIndex: 45 }}><form className="create-modal" role="dialog" aria-modal="true" aria-label="Convert channel partner to customer" onSubmit={event => void submit(event)}>
    <div className="modal-heading"><h2>Convert CP to customer</h2><button type="button" className="icon-button" disabled={busy} onClick={onClose} aria-label="Close conversion"><X size={19}/></button></div>
    <p>The channel partner will also become a customer. Complete the customer details and upload all four required documents.</p>
    {loading ? <p role="status">Loading...</p> : draft && <fieldset className="calling-fieldset" disabled={busy}><div className="modal-fields">
      {cpCustomerFields.map(([key, label, type, max]) => <label key={key}>{label}<input type={type} maxLength={max} required={!['alternateNumber', 'blockOrTehsil'].includes(key)} value={draft[key] ?? ''} min={key === 'requiredCapacityKW' ? 0.1 : key === 'ratePerKW' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} onChange={e => update(key, e.target.value)}/></label>)}
      {([['state', 'State', states], ['district', 'District', districts], ['branch', 'Branch', branches]] as const).map(([key, label, places]) => <label key={key}>{label}<select required value={draft[key] ?? ''} onChange={e => update(key, e.target.value)}><option value="">Select {label.toLowerCase()}</option>{places.map(place => <option key={place._id} value={place._id}>{place.name}</option>)}</select></label>)}
      {cpCustomerDocuments.map(type => <label key={type}>{type.replaceAll('_', ' ')} (required)<input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFiles(previous => ({ ...previous, [type]: e.target.files?.[0] }))}/></label>)}
    </div><p>PDF, JPEG, PNG or WebP. Maximum 20 MB per document.</p></fieldset>}
    {error && <div role="alert" className="form-error">{error}{!draft && <button type="button" className="filter-btn" onClick={() => setReload(v => v + 1)}>Retry</button>}</div>}
    <div className="modal-actions"><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy || loading || !draft}>{busy ? 'Uploading and converting...' : 'Convert to customer'}</button></div>
  </form></div>;
}
