import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { cpPayload, personName, type CpDraft } from '../lib/calling-lists';
import { customerCpDraft, type CustomerCpOptions } from '../lib/customer-cp';

type Place = { _id: string; name: string };
export default function CustomerCpConversion({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: (sent: boolean, already: boolean) => void }) {
  const [options, setOptions] = useState<CustomerCpOptions | null>(null), [draft, setDraft] = useState<CpDraft | null>(null);
  const [manager, setManager] = useState(''), [states, setStates] = useState<Place[]>([]), [districts, setDistricts] = useState<Place[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void Promise.all([api.get<CustomerCpOptions>(`/customers/${customerId}/cp-conversion`), api.get<Place[]>('/geography/states')]).then(([r, locations]) => {
      if (!active) return; setOptions(r.data); setDraft(customerCpDraft(r.data.defaults)); setStates(locations.data);
      setManager(r.data.defaults.reportingManagerId ?? (r.data.managers.length === 1 ? r.data.managers[0]._id : ''));
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to prepare conversion'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, reload]);
  useEffect(() => { let active = true; setDistricts([]); if (draft?.state) void api.get<Place[]>(`/geography/states/${encodeURIComponent(draft.state)}/districts`).then(r => { if (active) setDistricts(r.data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load districts'); }); return () => { active = false; }; }, [draft?.state]);
  function update(key: keyof CpDraft, value: string) { setDraft(previous => previous ? ({ ...previous, [key]: value, ...(key === 'state' ? { district: '' } : {}) }) : previous); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!draft || !manager || busy) return; setBusy(true); setError('');
    try {
      const r = await api.post<{ invitationSent: boolean; alreadyConverted: boolean }>(`/customers/${customerId}/convert-to-cp`, {
        ...cpPayload(draft), confirmed: true, reportingManagerId: manager,
        ...(options?.defaults.branch && draft.state === options.defaults.state && draft.district === options.defaults.district ? { branch: options.defaults.branch } : {})
      }); onSaved(r.data.invitationSent, r.data.alreadyConverted);
    } catch (e) { setError(e instanceof Error ? e.message : 'Conversion failed'); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" style={{ zIndex: 45 }}><form className="create-modal" role="dialog" aria-modal="true" aria-label="Confirm customer conversion to CP" onSubmit={event => void submit(event)}>
    <div className="modal-heading"><div><div className="eyebrow">CUSTOMER TO CHANNEL PARTNER</div><h2>Convert customer to CP?</h2></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="Close conversion"><X size={19}/></button></div>
    <p>This creates a CP employee account and sends a password-setup email. The customer record and all history remain linked to the CP and visible to their upline.</p>
    {loading ? <p role="status">Loading conversion details...</p> : options?.cpEmployee ? <p>This customer already has a CP employee account. Use Employees to view the account or resend its invitation.</p> : draft && options ? <fieldset className="calling-fieldset" disabled={busy}><div className="modal-fields">
      {([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Invitation email'], ['mobileNumber', 'Mobile number'], ['addressLine', 'Address'], ['city', 'City (optional)'], ['pincode', 'Postal code (optional)']] as const).map(([key, label]) => <label key={key}>{label}<input required={!['city', 'pincode'].includes(key)} type={key === 'email' ? 'email' : key === 'mobileNumber' ? 'tel' : 'text'} maxLength={key === 'addressLine' ? 300 : key === 'email' ? 254 : key === 'mobileNumber' ? 16 : key === 'pincode' ? 12 : 80} value={draft[key]} onChange={e => update(key, e.target.value)}/></label>)}
      <label>State<select required value={draft.state} onChange={e => update('state', e.target.value)}><option value="">Select state</option>{states.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
      <label>District<select required value={draft.district} onChange={e => update('district', e.target.value)}><option value="">Select district</option>{districts.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
      <label>Reporting RM<select required value={manager} onChange={e => setManager(e.target.value)}><option value="">Select RM</option>{options.managers.map(rm => <option key={rm._id} value={rm._id}>{personName(rm)} - {rm.employeeCode}</option>)}</select></label>
    </div>{!options.managers.length && <p>No active RM is available in your permitted hierarchy.</p>}</fieldset> : null}
    {error && <div role="alert" className="form-error">{error} {!options && <button type="button" className="filter-btn" onClick={() => setReload(value => value + 1)}>Retry</button>}</div>}
    <div className="modal-actions"><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Cancel</button>{options && !options.cpEmployee && <button className="primary-btn" disabled={busy || loading || !manager || !draft}>{busy ? 'Converting...' : 'OK, convert to CP'}</button>}</div>
  </form></div>;
}
