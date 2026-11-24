import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Customer = { _id: string; customerName: string; customerCode: string; mobileNumber: string; status: string };
type Result = { data: Customer[]; meta: { total: number } };

export default function CpCustomers({ cpId, open, onToggle, onSelect, refreshKey }: { cpId: string; open: boolean; onToggle: () => void; onSelect: (id: string) => void; refreshKey: number }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError('');
    void api.get<Result>(`/customers?creatorId=${encodeURIComponent(cpId)}&page=${page}&limit=20`)
      .then(response => { if (active) setResult(response.data); })
      .catch(cause => { if (active) { setResult(null); setError(cause instanceof Error ? cause.message : 'Unable to load customers'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cpId, open, page, refreshKey]);
  return <section>
    <button type="button" className="filter-btn" onClick={onToggle}>{open ? 'Hide customers' : 'View customers created'}</button>
    {open && <div>
      <h3>Customers created by this channel partner</h3>
      {loading ? <p>Loading customers...</p> : error ? <p role="alert">{error}</p> : result?.data.length ? <>
        {result.data.map(customer => <div className="details-item" key={customer._id}>
          <span><b>{customer.customerName}</b> | {customer.customerCode} | {customer.mobileNumber} | {customer.status.replace(/_/g, ' ')}</span>{' '}
          <button type="button" className="filter-btn" onClick={() => onSelect(customer._id)}>View customer details</button>
        </div>)}
        <div className="related-toolbar"><button type="button" className="filter-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button type="button" className="filter-btn" disabled={page * 20 >= result.meta.total} onClick={() => setPage(p => p + 1)}>Next</button></div>
      </> : <p>No customers created by this channel partner.</p>}
    </div>}
  </section>;
}
