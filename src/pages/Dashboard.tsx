import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarClock, ContactRound, FileText, RefreshCw, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';

type RecordValue = Record<string, unknown>;
function flatten(value: unknown): RecordValue { return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}; }
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—'; }
function rows(value: unknown): RecordValue[] { return Array.isArray(value) ? value.filter((row): row is RecordValue => Boolean(row) && typeof row === 'object') as RecordValue[] : []; }

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<RecordValue | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<unknown>('/dashboard/summary');
      setSummary(flatten(result.data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load dashboard');
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const leads = flatten(summary?.leads);
  const customers = flatten(summary?.customers);
  const quotations = flatten(summary?.quotations);
  const branches = rows(summary?.branchPerformance);
  const maxLeads = Math.max(1, ...branches.map((branch) => typeof branch.leads === 'number' ? branch.leads : 0));
  const metrics = [
    ['Total leads', leads.total, ContactRound],
    ['Customers', customers.total, Users],
    ['Site visits', summary?.siteVisits, CalendarClock],
    ['Quotations', quotations.total, FileText],
  ] as const;

  return <div className="page-wrap">
    <div className="page-heading dashboard-heading">
      <div><div className="eyebrow">YOUR BUSINESS AT A GLANCE</div><h1>{greeting}, {user?.firstName || 'there'} <span className="wave">✳</span></h1><p>Live totals and branch performance within your account scope.</p></div>
      <button className="secondary-btn" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Updating' : 'Refresh'}</button>
    </div>
    {error && <div className="notice-error" role="alert">{error}</div>}
    <section className="metric-grid">
      {metrics.map(([title, value, Icon], index) => <article className={`metric-card tone-${index}`} key={title}>
        <div className="metric-top"><span>{title}</span><span className="metric-icon"><Icon size={18}/></span></div>
        <div className="metric-value">{loading && !summary ? '…' : number(value)}</div>
        <div className="metric-foot"><span className="metric-trend"><ArrowUpRight size={14}/>{loading ? 'Refreshing' : 'Live total'}</span><span>Scoped to your access</span></div>
      </article>)}
    </section>
    <section className="dashboard-grid">
      <article className="panel performance-panel">
        <div className="panel-heading"><div><h2>Branch pipeline</h2><p>Leads and conversions from the dashboard API</p></div><span className="live-pill"><span className="status-dot"/> LIVE</span></div>
        {branches.length ? <div className="branch-performance">
          {branches.slice(0, 8).map((branch, index) => {
            const count = typeof branch.leads === 'number' ? branch.leads : 0;
            const converted = typeof branch.converted === 'number' ? branch.converted : 0;
            return <div className="branch-performance-row" key={String(branch._id ?? branch.name ?? index)}>
              <div className="branch-performance-label"><b>{String(branch.name ?? 'Unassigned branch')}</b><span>{number(converted)} converted · {number(count)} leads</span></div>
              <div className="branch-performance-track"><i style={{ width: `${Math.min(100, count / maxLeads * 100)}%` }}/></div>
            </div>;
          })}
        </div> : <div className="branch-performance-empty">{loading ? 'Loading branch performance…' : 'No branch performance data is available for this account.'}</div>}
        <div className="chart-legend"><span><i className="legend-leads"/> Leads</span><span><i className="legend-visits"/> Converted leads</span></div>
      </article>
      <article className="panel focus-panel">
        <div className="panel-heading"><div><h2>Today’s focus</h2><p>Open your live work queues</p></div><span className="focus-icon"><Activity size={17}/></span></div>
        <div className="focus-list">
          <Link to="/leads"><span className="focus-bullet green"><CalendarClock size={17}/></span><span><b>Lead follow-ups</b><small>Review upcoming and overdue follow-ups</small></span><span className="focus-count">→</span></Link>
          <Link to="/employees"><span className="focus-bullet blue"><BriefcaseBusiness size={17}/></span><span><b>Team activity</b><small>View employees and reporting hierarchy</small></span><span className="focus-count">→</span></Link>
          <Link to="/amc"><span className="focus-bullet amber"><BadgeCheck size={17}/></span><span><b>Service renewals</b><small>Review upcoming AMC renewals and service</small></span><span className="focus-count">→</span></Link>
        </div>
        <Link to="/reports" className="text-link">Explore reports <ArrowUpRight size={15}/></Link>
      </article>
    </section>
    <div className="dashboard-lower">
      <article className="panel welcome-panel"><div className="welcome-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="welcome-sun"><span/></div><div className="floating-card card-a">Live<small>Workspace</small></div><div className="floating-card card-b">✓<small>Scoped</small></div></div><div className="welcome-copy"><div className="eyebrow">ONE TEAM, ONE VIEW</div><h2>Make every interaction count.</h2><p>Follow the customer journey from lead to quotation, service, and long-term support.</p></div></article>
      <div className="quick-grid">
        <Link className="quick-card" to="/leads"><span className="quick-icon mint"><ContactRound size={19}/></span><b>Work leads</b><small>Review your pipeline</small><ArrowUpRight size={15} className="quick-arrow"/></Link>
        <Link className="quick-card" to="/customers"><span className="quick-icon lavender"><Users size={19}/></span><b>Customer book</b><small>Manage relationships</small><ArrowUpRight size={15} className="quick-arrow"/></Link>
      </div>
    </div>
  </div>;
}
