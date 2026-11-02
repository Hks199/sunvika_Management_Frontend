import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';

type Row = Record<string, unknown> & { _id: string; name: string };
type Level = 'states' | 'districts' | 'branches';

function list(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: Row[] }).data;
  }
  return [];
}

export default function Geography() {
  const { user } = useAuth();
  const roleCode = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const canAddGeography = roleCode === 'MD' || roleCode === 'BDO';
  const [level, setLevel] = useState<Level>('states');
  const [states, setStates] = useState<Row[]>([]);
  const [districts, setDistricts] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Row[]>([]);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [parentStateId, setParentStateId] = useState('');
  const [parentDistrictId, setParentDistrictId] = useState('');
  const [parentDistricts, setParentDistricts] = useState<Row[]>([]);
  const [parentDistrictsLoading, setParentDistrictsLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStates = useCallback(async () => {
    const result = await api.get<unknown>('/geography/states');
    const data = list(result.data);
    setStates(data);
    setStateId((current) => current && data.some((row) => row._id === current) ? current : data[0]?._id ?? '');
  }, []);

  const loadDistricts = useCallback(async (id: string) => {
    if (!id) { setDistricts([]); setDistrictId(''); return; }
    const result = await api.get<unknown>(`/geography/states/${encodeURIComponent(id)}/districts`);
    const data = list(result.data);
    setDistricts(data);
    setDistrictId((current) => current && data.some((row) => row._id === current) ? current : data[0]?._id ?? '');
  }, []);

  const loadBranches = useCallback(async (id: string) => {
    if (!id) { setBranches([]); return; }
    const result = await api.get<unknown>(`/geography/districts/${encodeURIComponent(id)}/branches`);
    setBranches(list(result.data));
  }, []);

  useEffect(() => {
    void loadStates().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load states'));
  }, [loadStates]);
  useEffect(() => {
    void loadDistricts(stateId).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load districts'));
  }, [loadDistricts, stateId]);
  useEffect(() => {
    void loadBranches(districtId).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load branches'));
  }, [districtId, loadBranches]);
  useEffect(() => {
    let active = true;
    setParentDistricts([]);
    setParentDistrictsLoading(Boolean(parentStateId));
    if (parentStateId) {
      void api.get<unknown>(`/geography/states/${encodeURIComponent(parentStateId)}/districts`)
        .then((result) => {
          if (active) {
            setParentDistricts(list(result.data));
            setParentDistrictsLoading(false);
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : 'Unable to load districts');
            setParentDistrictsLoading(false);
          }
        });
    }
    return () => { active = false; };
  }, [parentStateId]);
  useEffect(() => {
    setRows(level === 'states' ? states : level === 'districts' ? districts : branches);
  }, [branches, districts, level, states]);

  const refresh = useCallback(async () => {
    setError('');
    try {
      if (level === 'states') await loadStates();
      if (level === 'districts') await loadDistricts(stateId);
      if (level === 'branches') await loadBranches(districtId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to refresh geography');
    }
  }, [districtId, level, loadBranches, loadDistricts, loadStates, stateId]);

  function openCreate(target: Level) {
    setLevel(target);
    setEditing(null);
    setParentStateId(stateId || states[0]?._id || '');
    setParentDistrictId(target === 'branches' ? districtId : '');
    setCreating(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload: Record<string, unknown> = { ...values, isActive: values.isActive === 'true' };
    if (!editing && level === 'districts') payload.state = parentStateId;
    if (!editing && level === 'branches') { payload.state = parentStateId; payload.district = parentDistrictId; }
    const collection = level === 'states' ? 'states' : level === 'districts' ? 'districts' : 'branches';
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editing) await api.patch(`/geography/${collection}/${encodeURIComponent(editing._id)}`, payload);
      else await api.post(`/geography/${collection}`, payload);
      setNotice(editing ? 'Geography record updated.' : 'Geography record created.');
      setCreating(false);
      setEditing(null);
      if (level === 'states') await loadStates();
      if (level === 'districts') {
        setStateId(parentStateId);
        await loadDistricts(parentStateId);
      }
      if (level === 'branches') {
        setStateId(parentStateId);
        setDistrictId(parentDistrictId);
        await loadBranches(parentDistrictId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save geography record');
    } finally { setBusy(false); }
  }

  const title = level === 'states' ? 'States' : level === 'districts' ? 'Districts' : 'Branches';
  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">ORGANIZATION SETUP</div><h1>Geography</h1><p>Manage states, districts and branches used across the organization.</p></div>{canAddGeography && <div className="heading-actions geography-actions"><button className="secondary-btn" onClick={() => openCreate('states')}><Plus size={15}/>Add state</button><button className="secondary-btn" onClick={() => openCreate('districts')} disabled={!states.length}><Plus size={15}/>Add district</button><button className="primary-btn" onClick={() => openCreate('branches')} disabled={!states.length}><Plus size={16}/>Add branch</button></div>}</div>
    <section className="panel records-panel">
      <div className="records-toolbar"><div className="toolbar-actions">
        <select aria-label="Geography level" value={level} onChange={(event) => setLevel(event.target.value as Level)}><option value="states">States</option><option value="districts">Districts</option><option value="branches">Branches</option></select>
        {level !== 'states' && <select aria-label="State" value={stateId} onChange={(event) => { setStateId(event.target.value); setDistrictId(''); }}><option value="">Choose state</option>{states.map((state) => <option key={state._id} value={state._id}>{state.name}</option>)}</select>}
        {level === 'branches' && <select aria-label="District" value={districtId} onChange={(event) => setDistrictId(event.target.value)}><option value="">Choose district</option>{districts.map((district) => <option key={district._id} value={district._id}>{district.name}</option>)}</select>}
      </div><button className="filter-btn" onClick={() => void refresh()} disabled={busy}><RefreshCw size={15}/>Refresh</button></div>
      {error && <div className="notice-error" role="alert">{error}</div>}
      {notice && <div className="success-note" role="status">{notice}</div>}
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Active</th><th>Actions</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row._id}><td>{row.name}</td><td>{String(row.code ?? '—')}</td><td>{row.isActive === false ? 'No' : 'Yes'}</td><td><button className="icon-button" aria-label={`Edit ${row.name}`} onClick={() => { setEditing(row); setCreating(true); }}><Pencil size={15}/></button></td></tr>)}
        {!rows.length && <tr><td className="table-state" colSpan={4}>{level === 'states' || stateId ? `No ${title.toLowerCase()} found.` : 'Choose a parent location to view records.'}</td></tr>}
      </tbody></table></div>
    </section>
    {creating && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreating(false); setEditing(null); } }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="geography-form-title">
      <div className="modal-heading"><div><div className="eyebrow">ORGANIZATION SETUP</div><h2 id="geography-form-title">{editing ? 'Edit' : 'Add'} {level.slice(0, -1)}</h2></div><button className="icon-button" onClick={() => { setCreating(false); setEditing(null); }} aria-label="Close">×</button></div>
      <form onSubmit={(event) => void submit(event)}><div className="modal-fields">
        <label>Name<input name="name" required minLength={2} maxLength={100} defaultValue={String(editing?.name ?? '')}/></label>
        {(level === 'states' || level === 'branches') && <label>Code<input name="code" required={level === 'branches'} maxLength={level === 'states' ? 12 : 30} defaultValue={String(editing?.code ?? '')}/></label>}
        {!editing && level !== 'states' && <label>State<select required value={parentStateId} onChange={(event) => { setParentStateId(event.target.value); setParentDistrictId(''); }}><option value="">Choose state</option>{states.map((state) => <option key={state._id} value={state._id}>{state.name}</option>)}</select></label>}
        {!editing && level === 'branches' && <label>District<select required value={parentDistrictId} onChange={(event) => setParentDistrictId(event.target.value)} disabled={!parentStateId || parentDistrictsLoading}><option value="">{parentDistrictsLoading ? 'Loading districts…' : parentStateId ? 'Choose district' : 'Choose state first'}</option>{parentDistricts.map((district) => <option key={district._id} value={district._id}>{district.name}</option>)}</select>{parentStateId && !parentDistrictsLoading && parentDistricts.length === 0 && <small>No active districts for this state. Add a district first.</small>}</label>}
        {level === 'branches' && <label className="field-wide">Address<input name="address" maxLength={500} defaultValue={String(editing?.address ?? '')}/></label>}
        <label>Active<select name="isActive" defaultValue={String(editing?.isActive !== false)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form>
    </section></div>}
  </div>;
}
