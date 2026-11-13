import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from '../lib/api';
import {useAuth} from '../state/auth';
import {defaultReminder,reminderPayload,reminderManagerName,REMINDER_ROLES,REMINDER_INTERVALS,type ReminderDraft,type ReminderSchedule,type ReminderManager,type ReminderRun} from '../lib/cp-reminders';
import SearchableSelect from '../components/SearchableSelect';
export default function CpReminders(){
  const {user}=useAuth(),role=typeof user?.role==='string'?user.role:user?.role?.code;
  const request=useRef(0),mutation=useRef(false);
  const [managers,setManagers]=useState<ReminderManager[]>([]),[rm,setRm]=useState(''),[canManage,setCanManage]=useState(false);
  const [draft,setDraft]=useState<ReminderDraft>(defaultReminder),[history,setHistory]=useState<ReminderRun[]>([]),[page,setPage]=useState(1),[pages,setPages]=useState(1);
  const [schedules,setSchedules]=useState<ReminderSchedule[]>([]),[editing,setEditing]=useState<string|null>(null),[schedulePage,setSchedulePage]=useState(1),[schedulePages,setSchedulePages]=useState(1);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[tick,setTick]=useState(0);
  useEffect(()=>{let active=true;void api.get<{managers:ReminderManager[];canManage:boolean}>('/cp-reminders/managers').then(r=>{if(active){setManagers(r.data.managers);setCanManage(r.data.canManage);setRm(current=>r.data.managers.some(person=>person._id===current)?current:r.data.managers[0]?._id??'');setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[tick]);
  const load=useCallback(async()=>{
    const current=++request.current;if(!rm)return;setLoading(true);setError('');
    try{const [config,runs]=await Promise.all([api.get<{items:ReminderSchedule[];meta:{totalPages:number}}>(`/cp-reminders?rmId=${rm}&page=${schedulePage}&limit=10`),api.get<{items:ReminderRun[];meta:{totalPages:number}}>(`/cp-reminders/${rm}/history?page=${page}&limit=10`)]);if(current!==request.current)return;setSchedules(config.data.items);setSchedulePages(config.data.meta.totalPages);if(schedulePage>Math.max(1,config.data.meta.totalPages))setSchedulePage(Math.max(1,config.data.meta.totalPages));setHistory(runs.data.items);setPages(runs.data.meta.totalPages);}
    catch(e){if(current===request.current)setError(e instanceof Error?e.message:'Unable to load schedule');}finally{if(current===request.current)setLoading(false);}
  },[rm,page,schedulePage]);
  useEffect(()=>{void load();return()=>{request.current++;};},[load,tick]);
  async function save(event:FormEvent){event.preventDefault();if(mutation.current||busy||!rm||editing===null)return;mutation.current=true;setBusy(true);setError('');setNotice('');try{if(editing)await api.patch(`/cp-reminders/schedules/${editing}`,reminderPayload(draft));else await api.post(`/cp-reminders/${rm}`,reminderPayload(draft));setEditing(null);setSchedulePage(1);setNotice(draft.enabled?'Notification schedule saved. Only active CPs in this RM’s downline will receive it.':'Notification schedule paused.');await load();}catch(e){setError(e instanceof Error?e.message:'Unable to save schedule');}finally{mutation.current=false;setBusy(false);}}
  async function remove(item:ReminderSchedule){
    if(mutation.current||busy)return;
    if(!window.confirm(`Delete "${item.title}"? Future notifications from this schedule will stop. Sent messages and history will remain.`))return;
    mutation.current=true;setBusy(true);setError('');setNotice('');
    try{await api.delete(`/cp-reminders/schedules/${item._id}`);if(editing===item._id)setEditing(null);setNotice('Notification schedule deleted.');await load();}catch(e){setError(e instanceof Error?e.message:'Unable to delete schedule');}finally{mutation.current=false;setBusy(false);}
  }
  if(!REMINDER_ROLES.includes(role??''))return <div className="page-wrap"><p>This page is available to RM and management.</p></div>;
  return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">CHANNEL PARTNER COMMUNICATION</div><h1>CP notifications</h1><p>Schedule an editable message for all active CPs under an RM. All times are in IST.</p></div><button className="secondary-btn" disabled={busy} onClick={()=>setTick(v=>v+1)}>Refresh</button></div>
    {error&&editing===null&&<div className="form-error" role="alert">{error}</div>}{notice&&<p role="status" className="success-note">{notice}</p>}
    <section className="panel calling-panel"><p>Messages appear in the CP bell inbox. Phone alerts also require mobile push setup and permission on the CP’s phone.</p><SearchableSelect label="RM" value={rm} options={managers.map(person=>({value:person._id,label:reminderManagerName(person)}))} placeholder="Select RM" emptyLabel="Select RM" disabled={busy} onChange={value=>{request.current++;setRm(value);setPage(1);setSchedulePage(1);setEditing(null);setSchedules([]);setHistory([]);setNotice('');}}/>
      {!managers.length&&!loading?<p>No active RMs are available in your permitted hierarchy.</p>:null}
      {rm&&<><div className="panel-heading"><h2>Notification schedules</h2>{canManage&&<button className="primary-btn" disabled={busy||loading} onClick={()=>{setEditing('');setDraft(defaultReminder());setError('');}}>Add notification</button>}</div>
      {schedules.map(item=><article key={item._id} className="panel calling-panel"><div className="panel-heading"><h3>{item.title}</h3><span>{!item.enabled?'Paused':item.endDate<defaultReminder().startDate?'Expired':'Enabled'}</span></div><p style={{whiteSpace:'pre-wrap'}}>{item.body}</p><p>{item.startDate} to {item.endDate} · Every {item.everyDays} day(s) · {item.time} IST{item.repeatMinutes?` · Every ${item.repeatMinutes} minutes until ${item.endTime}`:''}</p>{canManage&&<div className="heading-actions"><button className="secondary-btn" disabled={busy||loading} onClick={()=>{setEditing(item._id);setDraft(item);setError('');}}>Edit</button><button className="secondary-btn danger-btn" disabled={busy||loading} onClick={()=>void remove(item)}>Delete</button></div>}</article>)}
      {!schedules.length&&!loading&&<p>No schedules for this RM yet. Add a notification to choose its message, dates and time.</p>}
      <div className="calling-pagination"><button className="secondary-btn" disabled={schedulePage<=1||loading||busy} onClick={()=>setSchedulePage(v=>v-1)}>Previous schedules</button><span>Page {schedulePage}</span><button className="secondary-btn" disabled={schedulePage>=schedulePages||loading||busy} onClick={()=>setSchedulePage(v=>v+1)}>Next schedules</button></div></>}
      {rm&&editing!==null&&<div className="modal-backdrop"><form className="create-modal" role="dialog" aria-modal="true" aria-label="Notification schedule" onSubmit={event=>void save(event)}><h2>{editing?'Edit notification schedule':'New notification schedule'}</h2><p>For a single-day notification, set Run for to 1 day.</p>{error&&<div className="form-error" role="alert">{error}</div>}<fieldset className="calling-fieldset" disabled={busy||loading||!canManage}><div className="modal-fields">
        <label className="field-wide">Notification title<input required maxLength={100} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
        <label className="field-wide">Message<textarea required rows={4} maxLength={500} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/><small>{draft.body.length}/500 characters</small></label>
        <label>Start date<input type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
        <label>Run for (days)<input type="number" min={1} max={365} required value={draft.durationDays} onChange={e=>setDraft({...draft,durationDays:Number(e.target.value)})}/></label>
        <label>Send every (days)<input type="number" min={1} max={365} required value={draft.everyDays} onChange={e=>setDraft({...draft,everyDays:Number(e.target.value)})}/></label>
        <label>First send time (IST)<input type="time" required value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></label>
        <label>Frequency within the day<select value={draft.repeatMinutes} onChange={e=>setDraft({...draft,repeatMinutes:Number(e.target.value)})}>{REMINDER_INTERVALS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {draft.repeatMinutes>0&&<label>Last send time (IST)<input type="time" required min={draft.time} value={draft.endTime} onChange={e=>setDraft({...draft,endTime:e.target.value})}/></label>}
        <label><span><input type="checkbox" style={{width:'auto'}} checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/> Schedule enabled</span></label>
      </div>{canManage&&<button className="primary-btn">{busy?'Saving...':'Save notification schedule'}</button>}<button type="button" className="secondary-btn" disabled={busy} onClick={()=>setEditing(null)}>Cancel</button></fieldset></form></div>}
      {!canManage&&rm&&<p>You have read-only access to notification schedules.</p>}
    </section>
    {rm&&<section className="panel calling-panel"><h2>Notification history</h2>{history.map(run=><article key={run._id}><h3>{run.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{run.body}</p><p>{run.slot.replace('T',' ')} IST · {run.state} · {run.recipientCount} CP inboxes · {run.push.ACCEPTED??0} push tickets · {run.push.DELIVERED??0} push service handoffs · {run.push.FAILED??0} push failures</p></article>)}{!history.length&&<p>No scheduled messages have been sent yet.</p>}<div className="calling-pagination"><button className="secondary-btn" disabled={page<=1||loading} onClick={()=>setPage(v=>v-1)}>Newer</button><span>Page {page}</span><button className="secondary-btn" disabled={page>=pages||loading} onClick={()=>setPage(v=>v+1)}>Older</button></div></section>}
  </div>;
}
