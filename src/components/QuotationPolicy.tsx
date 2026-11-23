import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type Rule = { stateId: string; minKW: number; maxKW: number; central: number; state: number };
export type Policy = { rules: Rule[]; validityDays: number; subsidyDeadline: string; contactPhone: string; contactEmail: string; website: string; officeAddress: string; branches: string };
type State = { _id: string; name: string };
export default function QuotationPolicy() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void Promise.all([api.get<Policy>('/quotations/policy'), api.get<State[]>('/geography/states')]).then(([p, s]) => { setPolicy(p.data); setStates(Array.isArray(s.data) ? s.data : []); }).catch(e => setError(e instanceof Error ? e.message : 'Could not load settings')); }, []);
  if (!policy) return <p role="status">{error || 'Loading quotation policy…'}</p>;
  function updateRule(index: number, field: keyof Rule, value: string) {
    setPolicy(current => current && ({ ...current, rules: current.rules.map((r, i) => i === index ? { ...r, [field]: field === 'stateId' ? value : Number(value) } : r) }));
  }
  async function save() {
    setError(''); setNotice(''); setBusy(true);
    try { const response = await api.patch<Policy>('/quotations/policy', policy); setPolicy(response.data); setNotice('Quotation policy saved.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save quotation policy'); }
    finally { setBusy(false); }
  }
  return <section className="panel calling-panel"><h2>Subsidy and company details</h2><p>Add a separate non-overlapping capacity range for each state. Amounts are estimates and apply to new quotations.</p>
    {policy.rules.map((r, index) => <div className="modal-fields" key={index}>
      <label>State<select value={r.stateId} onChange={e => updateRule(index, 'stateId', e.target.value)}><option value="">Choose state</option>{states.map(state => <option key={state._id} value={state._id}>{state.name}</option>)}</select></label>
      {(['minKW', 'maxKW', 'central', 'state'] as const).map(key => <label key={key}>{key === 'minKW' ? 'Minimum capacity (kW)' : key === 'maxKW' ? 'Maximum capacity (kW)' : key === 'central' ? 'Central subsidy (Rs.)' : 'State subsidy (Rs.)'}<input type="number" min="0" step="any" value={r[key]} onChange={e => updateRule(index, key, e.target.value)}/></label>)}
      <button type="button" className="secondary-btn" onClick={() => setPolicy({ ...policy, rules: policy.rules.filter((_, i) => i !== index) })}>Remove range</button>
    </div>)}
    <button type="button" className="secondary-btn" onClick={() => setPolicy({ ...policy, rules: [...policy.rules, { stateId: '', minKW: 0, maxKW: 0, central: 0, state: 0 }] })}>Add subsidy range</button>
    <div className="modal-fields"><label>Quotation validity (days)<input type="number" min="1" max="365" value={policy.validityDays} onChange={e => setPolicy({ ...policy, validityDays: Number(e.target.value) })}/></label><label>Subsidy deadline (optional)<input type="date" value={policy.subsidyDeadline} onChange={e => setPolicy({ ...policy, subsidyDeadline: e.target.value })}/></label>
      {(['contactPhone', 'contactEmail', 'website', 'officeAddress', 'branches'] as const).map(key => <label key={key}>{key === 'contactPhone' ? 'Company phone' : key === 'contactEmail' ? 'Company email' : key === 'website' ? 'Website' : key === 'officeAddress' ? 'Office address' : 'Branches'}<input value={policy[key]} onChange={e => setPolicy({ ...policy, [key]: e.target.value })}/></label>)}
    </div>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button type="button" className="primary-btn" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save subsidy and contact settings'}</button>
  </section>;
}
