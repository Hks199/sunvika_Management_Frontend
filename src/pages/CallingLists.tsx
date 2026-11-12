import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Eye, FileSpreadsheet, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import CandidateCallStatus from '../components/CandidateCallStatus';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';
import { EXCEL_TYPE, MAX_EXCEL_SIZE, candidateDraft, cpPayload, personName, totalCalling, callStatusLabel, type CallingList, type CallingPreview, type Candidate, type CpDraft, type Person } from '../lib/calling-lists';

type Place = { _id: string; name: string };
const message = (error: unknown) => error instanceof Error ? error.message : 'The request failed. Please retry.';

function CpForm({ listId, candidate, headers, manager, onClose, onSaved }: { listId: string; candidate: Candidate; headers: string[]; manager: string; onClose: () => void; onSaved: (sent: boolean) => void }) {
  const [draft, setDraft] = useState<CpDraft>(() => candidateDraft(headers, candidate.values));
  const [states, setStates] = useState<Place[]>([]), [districts, setDistricts] = useState<Place[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => { let active = true; void api.get<Place[]>('/geography/states').then(r => { if (active) setStates(r.data); }).catch(e => { if (active) setError(message(e)); }); return () => { active = false; }; }, [reload]);
  useEffect(() => { let active = true; setDistricts([]); if (draft.state) void api.get<Place[]>(`/geography/states/${encodeURIComponent(draft.state)}/districts`).then(r => { if (active) setDistricts(r.data); }).catch(e => { if (active) setError(message(e)); }); return () => { active = false; }; }, [draft.state, reload]);
  function update(key: keyof CpDraft, value: string) { setDraft(previous => ({ ...previous, [key]: value, ...(key === 'state' ? { district: '' } : {}) })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.post<{ invitationSent: boolean }>(`/calling-lists/${listId}/candidates/${candidate._id}/create-cp`, cpPayload(draft)); onSaved(result.data.invitationSent); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><form className="create-modal" onSubmit={event => void submit(event)} aria-label="Create channel partner">
    <div className="modal-heading"><div><div className="eyebrow">CANDIDATE ROW {candidate.rowNumber}</div><h2>Create CP account</h2></div><button type="button" className="icon-button" aria-label="Close CP form" disabled={busy} onClick={onClose}><X size={20}/></button></div>
    <p>Review the candidate details. This CP will report to {manager}. An invitation will be sent to their email.</p><p>Use the candidate’s own email and mobile number. Each must be unique across active employees and channel partners. An existing CP should use their current account.</p>
    <fieldset disabled={busy} className="calling-fieldset"><div className="modal-fields">
      {([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['mobileNumber', 'Mobile number'], ['addressLine', 'Address'], ['city', 'City'], ['pincode', 'Postal code']] as const).map(([key, label]) => <label key={key}>{label}<input type={key === 'email' ? 'email' : key === 'mobileNumber' ? 'tel' : 'text'} required={!['city', 'pincode'].includes(key)} maxLength={key === 'addressLine' ? 300 : key === 'email' ? 254 : key === 'mobileNumber' ? 16 : key === 'pincode' ? 12 : 80} value={draft[key]} onChange={e => update(key, e.target.value)}/></label>)}
      <label>State<select required value={draft.state} onChange={e => update('state', e.target.value)}><option value="">Choose state</option>{states.map(state => <option value={state._id} key={state._id}>{state.name}</option>)}</select></label>
      <label>District<select required disabled={!draft.state} value={draft.district} onChange={e => update('district', e.target.value)}><option value="">Choose district</option>{districts.map(district => <option value={district._id} key={district._id}>{district.name}</option>)}</select></label>
    </div></fieldset>
    {error && <div className="form-error" role="alert">{error} <button type="button" className="filter-btn" onClick={() => setReload(value => value + 1)}>Reload locations</button></div>}
    <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Creating…' : 'Create CP & send invitation'}</button></div>
  </form></div>;
}

export default function CallingLists() {
  const { user } = useAuth();
  const role = typeof user?.role === 'string' ? user.role : user?.role?.code;
  const canManage = role === 'MD' || role === 'MIS', canFilter = canManage || role === 'CP_HEAD', canWork = role !== 'CP_HEAD', allowed = canFilter || role === 'RM';
  const [lists, setLists] = useState<CallingList[]>([]), [managers, setManagers] = useState<Person[]>([]);
  const [filterManagers,setFilterManagers]=useState<Person[]>([]),[filterRmId,setFilterRmId]=useState(''),[dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState('');
  const listRequest=useRef(0);
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [title, setTitle] = useState(''), [file, setFile] = useState<File | null>(null), [assignedTo, setAssignedTo] = useState('');
  const [selected, setSelected] = useState<CallingList | null>(null), [preview, setPreview] = useState<CallingPreview | null>(null), [previewPage, setPreviewPage] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false), [previewReload, setPreviewReload] = useState(0), [candidate, setCandidate] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState<{ row: Candidate; listId: string } | null>(null), [deleteError, setDeleteError] = useState('');
  const [statusTarget, setStatusTarget] = useState<{ row: Candidate; listId: string } | null>(null);
  const deletionInFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null), previewRequest = useRef(0);
  const load = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    const request=++listRequest.current;setLoading(true);setError('');
    try {
      if(canFilter&&dateFrom&&dateTo&&dateFrom>dateTo)throw new Error('Uploaded to must be on or after uploaded from.');
      const query=new URLSearchParams({page:String(page),limit:'20'});
      if(canFilter){if(filterRmId)query.set('rmId',filterRmId);if(dateFrom)query.set('dateFrom',dateFrom);if(dateTo)query.set('dateTo',dateTo);}
      const [result, rms, filterOptions] = await Promise.all([api.get<{ data: CallingList[]; total: number }>(`/calling-lists?${query}`), canManage ? api.get<Person[]>('/calling-lists/managers') : Promise.resolve(null),canFilter?api.get<Person[]>('/calling-lists/filter-options'):Promise.resolve(null)]);
      if(request!==listRequest.current)return;
      setLists(result.data.data);setTotal(result.data.total);if(rms)setManagers(rms.data);
      if(filterOptions)setFilterManagers(previous=>{const selected=previous.find(rm=>rm._id===filterRmId);return selected&&!filterOptions.data.some(rm=>rm._id===filterRmId)?[selected,...filterOptions.data]:filterOptions.data;});
    } catch (e) { if(request===listRequest.current){setError(message(e));setLists([]);setTotal(0);} } finally { if(request===listRequest.current)setLoading(false); }
  }, [allowed, canManage, canFilter, page, filterRmId, dateFrom, dateTo]);
  useEffect(() => { void load();return()=>{listRequest.current++;}; }, [load]);
  function resetPreview(){setPage(1);setSelected(null);setCandidate(null);}

  useEffect(() => {
    const request = ++previewRequest.current; setPreview(null);
    if (!selected) return;
    setPreviewLoading(true);
    void api.get<CallingPreview>(`/calling-lists/${selected._id}/preview?page=${previewPage}&limit=25`).then(r => { if (request === previewRequest.current) setPreview(r.data); }).catch(e => { if (request === previewRequest.current) setError(message(e)); }).finally(() => { if (request === previewRequest.current) setPreviewLoading(false); });
    return () => { previewRequest.current++; };
  }, [selected, previewPage, previewReload]);
  async function downloadTemplate() {
    setBusy(true); setError('');
    try {
      const result = await api.get<{ fileName: string; base64: string }>('/calling-lists/template');
      const bytes = Uint8Array.from(atob(result.data.base64), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: EXCEL_TYPE }));
      const link = document.createElement('a');
      link.href = url; link.download = result.data.fileName;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function upload(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    if (!file || !/\.xlsx$/i.test(file.name) || file.size < 22 || file.size > MAX_EXCEL_SIZE) { setError('Choose an .xlsx workbook up to 5 MB.'); return; }
    setBusy(true);
    try {
      const reservation = await api.post<{ _id: string }>('/calling-lists', { title: title.trim(), fileName: file.name, size: file.size, ...(assignedTo ? { assignedTo } : {}) });
      await api.put(`/calling-lists/${reservation.data._id}/file`, file, EXCEL_TYPE);
      setTitle(''); setFile(null); setAssignedTo(''); if (input.current) input.current.value = '';
      setNotice('Excel calling list uploaded successfully.'); await load();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function assign(list: CallingList, rmId: string) {
    setBusy(true); setError(''); setNotice('');
    try { await api.patch(`/calling-lists/${list._id}/assignment`, { assignedTo: rmId || null }); setSelected(null); setCandidate(null); setNotice(rmId ? 'Calling list assigned to the selected RM.' : 'Assignment removed.'); await load(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function download(list: CallingList) {
    setBusy(true); setError('');
    try { const result = await api.get<{ url: string }>(`/calling-lists/${list._id}/download-url`); const link = document.createElement('a'); link.href = result.data.url; link.download = list.fileName; link.rel = 'noreferrer'; document.body.appendChild(link); link.click(); link.remove(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function deleteCandidate() {
    if (!deleting || deletionInFlight.current) return;
    const target = deleting; deletionInFlight.current = true; setBusy(true); setDeleteError(''); setNotice('');
    try {
      const response = await api.delete<{ rowCount: number }>(`/calling-lists/${target.listId}/candidates/${target.row._id}?confirm=true`);
      const rowCount = response.data.rowCount;
      setLists(current => current.map(list => list._id === target.listId ? { ...list, rowCount } : list));
      setSelected(current => current?._id === target.listId ? { ...current, rowCount } : current);
      setPreviewPage(current => Math.min(current, Math.max(1, Math.ceil(rowCount / 25))));
      setPreviewReload(value => value + 1); setCandidate(null); setDeleting(null); setNotice('Candidate permanently deleted from the database.'); await load();
    } catch (cause) { setDeleteError(message(cause)); }
    finally { deletionInFlight.current = false; setBusy(false); }
  }
  const progress = lists.find(list => list._id === selected?._id);
  if (!allowed) return <div className="panel calling-panel"><h1>CP calling lists</h1><p>Available to MD, MIS, CP Head and assigned Relationship Managers.</p></div>;
  return <div className="page-wrap calling-lists"><div className="page-heading"><div><div className="eyebrow">CHANNEL PARTNER DEVELOPMENT</div><h1>CP calling lists</h1><p>{canManage ? 'Upload candidate workbooks and assign them to an active RM.' : role === 'CP_HEAD' ? 'Review calling lists assigned to RMs in your team.' : 'Preview your assigned candidates and create channel partner accounts.'}</p></div><div className="heading-actions"><button className="secondary-btn" disabled={loading || busy} onClick={() => { setError(''); setPreviewReload(value => value + 1); void load(); }}><RefreshCw size={15}/> Refresh</button></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-note" role="status">{notice}</div>}
    {canManage && <form className="panel calling-panel" onSubmit={event => void upload(event)}><h2><Upload size={18}/> Upload candidate list</h2><button type="button" className="secondary-btn" disabled={busy} onClick={() => void downloadTemplate()}><Download size={15}/> Download blank Excel template</button><p>Download the blank template, fill one candidate per row below the headers, save, and upload it here.</p><p>One .xlsx worksheet, up to 5 MB, 50 columns and 10,000 candidates. Put column headers in the first row. Suggested columns: First name, Last name, Email, Mobile number, Address, City, Pincode. Missing account details can be completed when creating a CP.</p><fieldset disabled={busy} className="calling-fieldset"><div className="modal-fields"><label>List title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="November CP candidates"/></label><label>Assign to RM<select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}><option value="">Assign later</option>{managers.map(rm => <option value={rm._id} key={rm._id}>{personName(rm)} · {rm.employeeCode}</option>)}</select></label><label className="field-wide">Excel workbook<input ref={input} type="file" accept=".xlsx" required onChange={e => setFile(e.target.files?.[0] ?? null)}/></label></div><div className="modal-actions"><button className="primary-btn" disabled={!file || !title.trim()}>{busy ? 'Uploading…' : 'Upload Excel list'}</button></div></fieldset></form>}
    <div className="panel calling-panel"><h2><FileSpreadsheet size={18}/> {canFilter ? 'Calling lists' : 'My assigned lists'} <small>({total})</small></h2>{canFilter&&<div className="record-filters calling-list-filters"><SearchableSelect label="RM" value={filterRmId} options={filterManagers.map(rm=>({value:rm._id,label:`${personName(rm)} ${rm.employeeCode??''}${rm.isActive===false?' (inactive)':''}`}))} placeholder="All assigned RMs - search by name" disabled={busy} onChange={value=>{setFilterRmId(value);resetPreview();}}/><label>Uploaded from<input type="date" value={dateFrom} disabled={busy} max={dateTo||undefined} onChange={event=>{setDateFrom(event.target.value);resetPreview();}}/></label><label>Uploaded to<input type="date" value={dateTo} disabled={busy} min={dateFrom||undefined} onChange={event=>{setDateTo(event.target.value);resetPreview();}}/></label><button className="secondary-btn" disabled={busy||(!filterRmId&&!dateFrom&&!dateTo)} onClick={()=>{setFilterRmId('');setDateFrom('');setDateTo('');resetPreview();}}>Clear filters</button></div>}{loading ? <p role="status">Loading calling lists…</p> : !lists.length ? <p>{canFilter ? 'No calling lists match the selected filters.' : 'No calling lists are assigned to you yet.'}</p> : <div className="calling-table-scroll"><table className="calling-table calling-summary-table"><thead><tr><th>List</th><th>Uploaded by</th><th>Assigned RM</th><th>Total uploaded</th><th>Total calling</th><th>Converted to CP</th><th>Not called</th><th>Interested</th><th>Needs follow-up</th><th>Actions</th></tr></thead><tbody>{lists.map(list => <tr key={list._id}><td><b>{list.title}</b><small>{list.fileName}</small></td><td>{personName(list.uploadedBy)}</td><td>{canManage ? <select aria-label={`Assigned RM for ${list.title}`} value={list.assignedTo?._id ?? ''} disabled={busy} onChange={e => void assign(list, e.target.value)}><option value="">Unassigned</option>{list.assignedTo && !managers.some(rm => rm._id === list.assignedTo?._id) && <option value={list.assignedTo._id}>{personName(list.assignedTo)} (inactive)</option>}{managers.map(rm => <option value={rm._id} key={rm._id}>{personName(rm)}</option>)}</select> : personName(list.assignedTo)}</td><td><span className="calling-count calling-count-total" title={list.originalRowCount === null ? "Original upload count is temporarily unavailable" : "Candidates in the original uploaded Excel file"}>{list.originalRowCount ?? "—"}</span>{Boolean(list.deletedCount) && <small>{list.deletedCount} deleted</small>}</td><td className="calling-total-cell"><span className="calling-count calling-count-calling" title="Deleted + converted to CP + interested + needs follow-up">{totalCalling(list) ?? "—"}</span></td><td><span className="calling-count calling-count-converted">{list.convertedCount}</span></td><td><span className="calling-count calling-count-remaining">{list.notCalledCount ?? 0}</span></td><td><span className="calling-count calling-count-interested">{list.interestedCount ?? 0}</span></td><td><span className="calling-count calling-count-followup">{list.followUpCount ?? 0}</span></td><td><div className="operation-toolbar"><button className="filter-btn" disabled={busy} onClick={() => { setSelected(list); setPreviewPage(1); setPreviewReload(value => value + 1); setError(''); }}><Eye size={14}/> Preview</button><button className="filter-btn" disabled={busy} onClick={() => void download(list)}><Download size={14}/> Download</button></div></td></tr>)}</tbody></table></div>}<div className="calling-pagination"><button className="secondary-btn" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button className="secondary-btn" disabled={page * 20 >= total || loading} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    {selected && <section className="panel calling-panel" aria-label="Excel preview"><div className="panel-heading"><div><h2>{selected.title}</h2><p>All uploaded columns · {selected.rowCount} candidate rows</p></div><button className="icon-button" aria-label="Close preview" onClick={() => setSelected(null)}><X size={18}/></button></div>{progress && <div className="calling-progress-strip"><span><b>{progress.interestedCount ?? 0}</b> Interested</span><span><b>{progress.followUpCount ?? 0}</b> Needs follow-up</span></div>}{previewLoading ? <p role="status">Loading preview…</p> : preview ? <><div className="calling-table-scroll"><table className="calling-table"><thead><tr><th>Row</th><th>Calling status</th>{preview.headers.map((header, i) => <th key={i}>{header}</th>)}{(role === 'MD' || role === 'RM') && <th>CP account</th>}{canWork&&<th>Delete</th>}</tr></thead><tbody>{preview.rows.map(row => <tr key={row._id}><td>{row.rowNumber}</td><td className="candidate-status-cell"><span className="candidate-call-badge" data-status={row.employee ? "CONVERTED" : row.callStatus ?? "NOT_CALLED"}>{callStatusLabel(row)}</span>{canWork && !row.employee && <button className="filter-btn" disabled={busy} onClick={() => setStatusTarget({ row, listId: selected._id })}>Record call</button>}{!row.employee && row.callStatus === "NEEDS_FOLLOWUP" && row.nextFollowUpAt && <small>Follow up: {new Date(row.nextFollowUpAt).toLocaleString("en-IN")}</small>}{row.callNote && <small>{row.callNote}</small>}</td>{row.values.map((value, i) => <td key={i}>{value || '—'}</td>)}{(role === 'MD' || role === 'RM') && <td>{row.employee ? <span className="cp-created-badge">CP created</span> : <button className="filter-btn" disabled={!selected.assignedTo || busy} onClick={() => setCandidate(row)}>Create CP</button>}</td>}{canWork&&<td><button className="filter-btn candidate-delete" aria-label={`Permanently delete candidate row ${row.rowNumber}`} disabled={busy} onClick={() => { setDeleteError(''); setDeleting({ row, listId: selected._id }); }}><Trash2 size={14}/>Delete</button></td>}</tr>)}</tbody></table></div>{!preview.rows.length && <p>No candidates remain in this list.</p>}{!selected.assignedTo && role === 'MD' && <p>Assign this list to an RM before creating CP accounts.</p>}<div className="calling-pagination"><button className="secondary-btn" disabled={previewPage === 1} onClick={() => setPreviewPage(value => value - 1)}>Previous rows</button><span>{preview.total ? (previewPage - 1) * 25 + 1 : 0}–{Math.min(previewPage * 25, preview.total)} of {preview.total}</span><button className="secondary-btn" disabled={previewPage * 25 >= preview.total} onClick={() => setPreviewPage(value => value + 1)}>Next rows</button></div></> : <button className="secondary-btn" onClick={() => setPreviewReload(value => value + 1)}>Retry preview</button>}</section>}
    {statusTarget && <CandidateCallStatus key={statusTarget.row._id} listId={statusTarget.listId} candidate={statusTarget.row} onClose={() => setStatusTarget(null)} onSaved={() => { setStatusTarget(null); setPreviewReload(value => value + 1); void load(); setNotice("Calling status saved."); }}/>}
    {deleting && <div className="modal-backdrop"><section className="create-modal candidate-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="candidate-delete-title" aria-describedby="candidate-delete-description"><div className="modal-heading"><div><div className="eyebrow">PERMANENT DELETE</div><h2 id="candidate-delete-title">Delete candidate row {deleting.row.rowNumber}?</h2></div></div><p id="candidate-delete-description">This permanently removes the candidate from the database and preview. This cannot be undone. The original uploaded Excel file{deleting.row.employee ? ' and the existing CP account are' : ' is'} kept.</p>{deleteError && <div className="form-error" role="alert">{deleteError}</div>}<div className="modal-actions"><button className="secondary-btn" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="primary-btn candidate-delete-confirm" disabled={busy} onClick={() => void deleteCandidate()}>{busy ? 'Deleting...' : 'Delete permanently'}</button></div></section></div>}
    {candidate && selected && preview && <CpForm key={candidate._id} listId={selected._id} candidate={candidate} headers={preview.headers} manager={personName(selected.assignedTo)} onClose={() => setCandidate(null)} onSaved={sent => { setCandidate(null); void load(); setPreviewReload(value => value + 1); setNotice(sent ? 'CP account created and invitation sent.' : 'CP account created. Invitation was not delivered; use Employees to resend it.'); }}/>}
  </div>;
}
