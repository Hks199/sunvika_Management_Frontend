import QuotationPolicy from './QuotationPolicy';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';
import { QuotationOptions, type Options } from './QuotationOptions';

export default function QuotationSettings() {
  const { user } = useAuth();
  const role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (role === 'MD') void api.get<Options>('/quotations/options').then(r => setOptions(r.data)).catch(e => setError(e instanceof Error ? e.message : 'Could not load options')); }, [role]);
  if (role !== 'MD') return <div className="page-wrap">Only the Managing Director can manage quotation options.</div>;
  return <div className="page-wrap"><div className="page-heading"><div><h1>Quotation settings</h1><p>Manage the choices available for new quotations.</p></div></div><section className="panel calling-panel">{error && <p role="alert">{error}</p>}{options ? <QuotationOptions options={options} onChange={setOptions}/> : !error && <p>Loading…</p>}</section><QuotationPolicy/></div>;
}
