import { useAuth } from '../state/auth';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import RecordDetails from '../components/RecordDetails';

type Customer = { _id: string; customerCode: string; customerName: string; mobileNumber: string; status: string; reviewStatus?: string };
export default function HoldCustomers({ review = false }: { review?: boolean }) {
  const { user } = useAuth();
  const role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const [rows, setRows] = useState<Customer[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await api.get<Customer[]>(review ? '/customers/review-queue' : '/customers/hold'); setRows(result.data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load held customers'); }
    finally { setLoading(false); }
  }, [review]);
  useEffect(() => { void load(); }, [load]);
  return <div><div className="eyebrow">CUSTOMER DOCUMENTS</div><h1>{review ? 'New customers' : 'Hold customers'}</h1><p>{review ? role === 'MIS' ? 'Review each RM-approved document. Verify it or mark it pending with a remark.' : 'Customers remain here until all required documents are verified. Rejected documents remain visible while the channel partner replaces them.' : 'Customers with documents rejected by your RM appear here. Open a customer to see the reason, preview or download the document, and upload a replacement.'}</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="filter-btn" onClick={() => void load()} disabled={loading}>Refresh</button>
    {loading ? <p>Loading held customers...</p> : rows.length ? <div className="related-documents">{rows.map(customer => <div key={customer._id} className="related-document"><span><b>{customer.customerName}</b><small>{customer.customerCode} | {customer.mobileNumber} | {review ? (customer.reviewStatus === 'REJECTED' ? 'Rejected - replacement needed' : customer.reviewStatus === 'MIS_PENDING' ? 'Awaiting MIS verification' : 'Awaiting RM verification') : customer.status}</small></span><button className="filter-btn" onClick={() => setSelected(customer._id)}>View documents</button></div>)}</div> : !error && <p>{review ? 'No unverified customers in your team.' : 'No customers are currently on hold.'}</p>}
    {selected && <RecordDetails type="customers" id={selected} onClose={() => { setSelected(''); void load(); }} onSaved={() => void load()}/>}
  </div>;
}
