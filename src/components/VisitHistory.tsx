import { displayValue } from '../lib/display';

type Row = Record<string, unknown>;
function dateTime(value: unknown) {
  if (typeof value !== 'string') return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
export default function VisitHistory({ rows, scope, loading }: { rows: Row[]; scope: 'lead' | 'employee'; loading: boolean }) {
  return <section className="visit-history" aria-label="Visit history" aria-busy={loading}>
    <h3>{scope === 'lead' ? 'Lead visit history' : 'Employee visit history'}</h3>
    <p className="form-hint">{scope === 'lead' ? 'Visits for this lead, including visits by different employees.' : 'Visits made by this employee across all accessible leads.'}</p>
    {loading ? <p role="status">Loading visit history...</p> : rows.length ? rows.map((visit, index) => {
      const lead = visit.lead && typeof visit.lead === 'object' ? visit.lead as Row : null;
      return <article className="visit-history-card" key={String(visit._id ?? index)}>
        <div className="visit-history-heading"><strong>{lead ? String(lead.customerName ?? lead.leadCode ?? 'Lead') : 'Site visit'}</strong><time>{dateTime(visit.visitDate)}</time></div>
        <dl className="details-list">
          {Boolean(lead?.leadCode) && <div className="details-item"><dt>Lead code</dt><dd>{String(lead?.leadCode)}</dd></div>}
          {Boolean(lead?.mobileNumber) && <div className="details-item"><dt>Mobile number</dt><dd>{String(lead?.mobileNumber)}</dd></div>}
          <div className="details-item"><dt>Visited by</dt><dd>{displayValue(visit.visitedBy)}</dd></div>
          <div className="details-item"><dt>Next visit</dt><dd>{dateTime(visit.nextVisitDate)}</dd></div>
        </dl>
        <div className="visit-history-remark"><b>Visit remarks</b><p>{typeof visit.remark === 'string' && visit.remark ? visit.remark : 'No remarks recorded.'}</p></div>
      </article>;
    }) : <p className="form-hint">No visits found for this history.</p>}
  </section>;
}
