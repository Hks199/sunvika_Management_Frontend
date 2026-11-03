import { useEffect, useState, type FormEvent } from 'react';
import { BarChart3, Copy, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { displayJson } from '../lib/display';

const reports = [
  ['employee-performance', 'Employee performance'],
  ['branch-performance', 'Branch performance'],
  ['district-performance', 'District performance'],
  ['state-performance', 'State performance'],
  ['lead-conversion', 'Lead conversion'],
  ['customers', 'Customer report'],
  ['follow-ups', 'Follow-up report'],
  ['quotations', 'Quotation report'],
];
type GeographyOption = { _id: string; name: string };
type EmployeeOption = { _id: string; firstName?: string; lastName?: string; employeeCode?: string; role?: { name?: string; code?: string } | string };
function geographyOptions(value: unknown): GeographyOption[] {
  if (Array.isArray(value)) return value as GeographyOption[];
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as { data: unknown }).data)) {
    return (value as { data: GeographyOption[] }).data;
  }
  return [];
}
function employeeOptions(value: unknown): EmployeeOption[] {
  if (Array.isArray(value)) return value as EmployeeOption[];
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as { data: unknown }).data)) {
    return (value as { data: EmployeeOption[] }).data;
  }
  return [];
}
function employeeName(employee: EmployeeOption): string {
  const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
  const role = typeof employee.role === 'string' ? employee.role : employee.role?.name ?? employee.role?.code;
  return [name || employee.employeeCode || 'Employee', role, employee.employeeCode && name ? employee.employeeCode : ''].filter(Boolean).join(' · ');
}
function employeeRoleCode(employee: EmployeeOption): string {
  return typeof employee.role === 'string' ? employee.role : employee.role?.code ?? '';
}

export default function Reports() {
  const [kind, setKind] = useState(reports[0][0]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [employeeScope, setEmployeeScope] = useState('cpId');
  const [states, setStates] = useState<GeographyOption[]>([]);
  const [districts, setDistricts] = useState<GeographyOption[]>([]);
  const [branches, setBranches] = useState<GeographyOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const expectedEmployeeRole = ({ cpId: 'CP', rmId: 'RM', dcId: 'DC', mhId: 'MH' } as const)[employeeScope as 'cpId' | 'rmId' | 'dcId' | 'mhId'];
  const scopedEmployees = employees.filter((employee) => employeeRoleCode(employee) === expectedEmployeeRole);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [geographyError, setGeographyError] = useState('');

  useEffect(() => {
    let active = true;
    void api.get<unknown>('/geography/states')
      .then((response) => { if (active) setStates(geographyOptions(response.data)); })
      .catch((cause) => { if (active) setGeographyError(cause instanceof Error ? cause.message : 'Could not load states'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void api.get<unknown>('/employees?page=1&limit=100')
      .then((response) => { if (active) setEmployees(employeeOptions(response.data)); })
      .catch((cause) => { if (active) setGeographyError(cause instanceof Error ? cause.message : 'Could not load employees'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setDistricts([]);
    setBranches([]);
    setDistrictId('');
    setBranchId('');
    if (stateId) {
      void api.get<unknown>(`/geography/states/${encodeURIComponent(stateId)}/districts`)
        .then((response) => { if (active) setDistricts(geographyOptions(response.data)); })
        .catch((cause) => { if (active) setGeographyError(cause instanceof Error ? cause.message : 'Could not load districts'); });
    }
    return () => { active = false; };
  }, [stateId]);

  useEffect(() => {
    let active = true;
    setBranches([]);
    if (districtId) {
      void api.get<unknown>(`/geography/districts/${encodeURIComponent(districtId)}/branches`)
        .then((response) => { if (active) setBranches(geographyOptions(response.data)); })
        .catch((cause) => { if (active) setGeographyError(cause instanceof Error ? cause.message : 'Could not load branches'); });
    }
    return () => { active = false; };
  }, [districtId]);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const key of ['dateFrom', 'dateTo', 'branchId', 'stateId', 'districtId', 'mhId', 'dcId', 'rmId', 'cpId', 'leadStatus', 'customerStatus']) {
      const value = String(form.get(key) ?? '').trim();
      if (value) query.set(key, value);
    }
    try {
      const response = await api.get<unknown>(`/reports/${kind}${query.size ? `?${query.toString()}` : ''}`);
      setResult(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Report could not be loaded');
    } finally { setBusy(false); }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(displayJson(result));
    } catch (cause) {
      setError(cause instanceof Error ? `Could not copy report: ${cause.message}` : 'Could not copy report');
    }
  }

  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">INSIGHTS & ANALYSIS</div><h1>Reports</h1><p>Filter analytics by date, geography, employee hierarchy and status.</p></div></div>
    <div className="report-layout">
      <form className="panel report-picker report-filter-form" onSubmit={(event) => void load(event)}>
        <div className="panel-heading"><div><h2>Choose a report</h2><p>Filters are validated against your access scope.</p></div><BarChart3 size={18}/></div>
        <label className="field-label" htmlFor="report-select">Report type</label>
        <select id="report-select" value={kind} onChange={(event) => { setKind(event.target.value); setResult(null); }}>
          {reports.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
        <label className="field-label">From date<input name="dateFrom" type="date"/></label>
        <label className="field-label">To date<input name="dateTo" type="date"/></label>
        <label className="field-label">State<select name="stateId" value={stateId} onChange={(event) => { setStateId(event.target.value); setDistrictId(''); }}><option value="">All states</option>{states.map((state) => <option key={state._id} value={state._id}>{state.name}</option>)}</select></label>
        <label className="field-label">District<select name="districtId" value={districtId} onChange={(event) => { setDistrictId(event.target.value); setBranchId(''); }} disabled={!stateId}><option value="">All districts</option>{districts.map((district) => <option key={district._id} value={district._id}>{district.name}</option>)}</select></label>
        <label className="field-label">Branch<select name="branchId" value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={!districtId}><option value="">All branches</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>
        {geographyError && <div className="notice-error" role="alert">{geographyError}</div>}
        <label className="field-label">Employee scope type<select value={employeeScope} onChange={(event) => setEmployeeScope(event.target.value)}><option value="cpId">Channel Partner</option><option value="rmId">Relationship Manager</option><option value="dcId">District Coordinator</option><option value="mhId">Marketing Head</option></select></label>
        <label className="field-label">Employee<select name={employeeScope} defaultValue=""><option value="">All employees</option>{scopedEmployees.map((employee) => <option key={employee._id} value={employee._id}>{employeeName(employee)}</option>)}</select></label>
        <label className="field-label">Lead status<select name="leadStatus" defaultValue=""><option value="">All statuses</option>{['PENDING', 'INTERESTED', 'NOT_INTERESTED', 'SITE_VISITED', 'NEED_FOLLOWUP', 'LOST', 'QUOTATION_SENT', 'CONVERTED'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="field-label">Customer status<select name="customerStatus" defaultValue=""><option value="">All statuses</option>{['ONBOARDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <button className="primary-btn report-run" disabled={busy}>{busy ? <RefreshCw className="spin" size={16}/> : <BarChart3 size={16}/>}Generate report</button>
      </form>
      <section className="panel report-result">
        <div className="panel-heading"><div><h2>{reports.find(([value]) => value === kind)?.[1]}</h2><p>Live data returned by the management API</p></div><button className="filter-btn" onClick={() => void copyResult()} disabled={!result}><Copy size={15}/>Copy data</button></div>
        {error && <div className="notice-error" role="alert">{error}</div>}
        {result ? <pre className="json-result">{displayJson(result)}</pre> : <div className="report-empty"><span><BarChart3 size={22}/></span><b>Your report will appear here</b><small>Choose a report and optional filters, then generate it.</small></div>}
      </section>
    </div>
  </div>;
}
