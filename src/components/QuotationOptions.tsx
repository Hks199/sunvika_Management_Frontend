import { useState } from 'react';
import { api } from '../lib/api';
import './quotation-options.css';

export type Options = { paymentModes: string[]; panelBrands: string[]; panelTechnologies: string[]; inverters: string[]; wattsOptions: string[]; categories: string[]; systemTypes: string[] };
export function QuotationOptions({ options, onChange }: { options: Options; onChange: (value: Options) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(options);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError('');
    try { const cleaned = Object.fromEntries(Object.entries(draft).map(([k,v]) => [k,v.map(x=>x.trim()).filter(Boolean)])) as Options; const response = await api.patch<Options>('/quotations/options', cleaned); onChange(response.data); setEditing(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save options'); }
    finally { setBusy(false); }
  }
  return <div className="quotation-options field-wide"><button type="button" className="secondary-btn" onClick={() => { setDraft(options); setEditing(!editing); }}>Manage quotation options</button>{editing && <div>
    <p>Enter one option per line. For watts, enter positive numbers only. Changes apply to new quotations.</p>
    {(['paymentModes', 'panelBrands', 'panelTechnologies', 'inverters', 'wattsOptions', 'categories', 'systemTypes'] as const).map(key => <label key={key}>{key === 'paymentModes' ? 'Payment modes' : key === 'panelBrands' ? 'Panel brands' : key === 'panelTechnologies' ? 'Panel technologies' : key === 'inverters' ? 'Inverters' : key === 'wattsOptions' ? 'Watts per panel' : key === 'categories' ? 'Categories' : 'System types'}<textarea value={draft[key].join('\n')} onChange={event => setDraft({ ...draft, [key]: event.target.value.split('\n') })}/></label>)}
    {error && <p role="alert">{error}</p>}<button type="button" className="primary-btn quotation-options-save" disabled={busy} onClick={() => void save()}>{busy ? 'Saving?' : 'Save options'}</button>
  </div>}</div>;
}
