import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, CircleAlert, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import { displayValue } from '../lib/display';
import CreateDialog from '../components/CreateDialog';
import RecordDetails from '../components/RecordDetails';
import EmployeeCreateDialog from '../components/EmployeeCreateDialog';
import { useAuth } from '../state/auth';
type Row = Record<string, unknown>;
type GeographyOption = { _id: string; name: string };
type Config = { title:string; eyebrow:string; description:string; endpoint:string; columns:string[]; createPath?:string; query?:string };
const configs:Record<string,Config>={
 leads:{title:'Leads',eyebrow:'CUSTOMER PIPELINE',description:'Track enquiries, follow-ups, and every opportunity in your accessible pipeline.',endpoint:'/leads',columns:['leadCode','customerName','mobileNumber','status','assignedTo','createdAt'],createPath:'/leads'},
 visits:{title:'Site visits',eyebrow:'FIELD ACTIVITY',description:'Review field visits, outcomes, and customer follow-ups.',endpoint:'/visits',columns:['lead','visitedBy','visitDate','remark','nextVisitDate','createdAt'],createPath:'/visits'},
 customers:{title:'Customers',eyebrow:'RELATIONSHIP MANAGEMENT',description:'A clear view of customer profiles and ongoing relationships.',endpoint:'/customers',columns:['customerCode','customerName','mobileNumber','status','createdAt']},
 quotations:{title:'Quotations',eyebrow:'SALES DOCUMENTS',description:'Review generated customer quotations and manage secure sharing links.',endpoint:'/quotations',columns:['quotationNumber','lead','status','quotationDate']},
 amc:{title:'AMC contracts',eyebrow:'CUSTOMER CARE',description:'Track active maintenance agreements, service schedules, and renewals.',endpoint:'/amc',columns:['contractNumber','customer','startDate','expiryDate','status','renewalStatus'],createPath:'/amc'},
 employees:{title:'Employees',eyebrow:'YOUR ORGANIZATION',description:'Manage accessible team members and reporting relationships.',endpoint:'/employees',columns:['employeeCode','firstName','lastName','email','role','isActive'],createPath:'/employees'},
 geography:{title:'Geography',eyebrow:'ORGANIZATION SETUP',description:'Browse active states, districts, and branches available to your team.',endpoint:'/geography/states',columns:['name','code','status','createdAt']},
 roles:{title:'Roles & permissions',eyebrow:'ACCESS CONTROL',description:'Review configured roles and capabilities. Changes are restricted to the Managing Director.',endpoint:'/roles',columns:['name','code','category','parentRole','isActive']},
 audit:{title:'Audit log',eyebrow:'SECURITY & COMPLIANCE',description:'Review recorded management actions available to your account.',endpoint:'/audit-logs',columns:['action','actor','resource','createdAt']},
};
function unwrap(data:unknown):{rows:Row[];total:number}{if(Array.isArray(data))return {rows:data as Row[],total:data.length};if(data&&typeof data==='object'){const d=data as Record<string,unknown>;const arr=(d.items??d.results??d.rows??d.data??d.records??d.employees);if(Array.isArray(arr)){const meta=(d.meta&&typeof d.meta==='object'?d.meta:{}) as Record<string,unknown>;return {rows:arr as Row[],total:Number(meta.total??d.total??arr.length)}}}return {rows:[],total:0}}
function display(value:unknown):string {if(typeof value==='string'&&/^\d{4}-\d\d-\d\d/.test(value)){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}return displayValue(value)}
function titleCase(value:string){return value.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}
function geographyOptions(value:unknown):GeographyOption[]{if(Array.isArray(value))return value as GeographyOption[];if(value&&typeof value==='object'&&'data'in value&&Array.isArray((value as {data:unknown}).data))return (value as {data:GeographyOption[]}).data;return []}
export default function Records({type}:{type:string}){
 const config=configs[type];const {user}=useAuth();const roleCode=typeof user?.role==='object'?user.role?.code:user?.role;const [rows,setRows]=useState<Row[]>([]);const [total,setTotal]=useState(0);const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [mode,setMode]=useState('all');const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [creating,setCreating]=useState(false);const [selectedId,setSelectedId]=useState('');
 const [states,setStates]=useState<GeographyOption[]>([]);const [districts,setDistricts]=useState<GeographyOption[]>([]);const [branches,setBranches]=useState<GeographyOption[]>([]);const [stateId,setStateId]=useState('');const [districtId,setDistrictId]=useState('');const [branchId,setBranchId]=useState('');const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');const [employeeName,setEmployeeName]=useState('');const [geographyError,setGeographyError]=useState('');
 const supportsFilters=['leads','visits','quotations','customers'].includes(type);
 useEffect(()=>{setMode('all');setPage(1);setSearch('');setStateId('');setDistrictId('');setBranchId('');setDateFrom('');setDateTo('');setEmployeeName('')},[type]);
 useEffect(()=>{if(!supportsFilters)return;let active=true;void api.get<unknown>('/geography/states').then(r=>{if(active)setStates(geographyOptions(r.data))}).catch(e=>{if(active)setGeographyError(e instanceof Error?e.message:'Could not load states')});return()=>{active=false}},[supportsFilters]);
 useEffect(()=>{let active=true;setDistricts([]);setBranches([]);setDistrictId('');setBranchId('');if(stateId)void api.get<unknown>(`/geography/states/${encodeURIComponent(stateId)}/districts`).then(r=>{if(active)setDistricts(geographyOptions(r.data))}).catch(e=>{if(active)setGeographyError(e instanceof Error?e.message:'Could not load districts')});return()=>{active=false}},[stateId]);
 useEffect(()=>{let active=true;setBranches([]);setBranchId('');if(districtId)void api.get<unknown>(`/geography/districts/${encodeURIComponent(districtId)}/branches`).then(r=>{if(active)setBranches(geographyOptions(r.data))}).catch(e=>{if(active)setGeographyError(e instanceof Error?e.message:'Could not load branches')});return()=>{active=false}},[districtId]);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const q=new URLSearchParams({page:String(page),limit:'20'});let endpoint=config.endpoint;if(search.trim()&&(type==='leads'||type==='customers'))q.set('search',search.trim());if(supportsFilters){if(branchId)q.set('branchId',branchId);if(dateFrom)q.set('dateFrom',dateFrom);if(dateTo)q.set('dateTo',dateTo);if(employeeName.trim()&&roleCode!=='CP')q.set('employeeName',employeeName.trim())}if(mode==='follow-ups')endpoint=`/${type}/follow-ups`;if(mode==='overdue')endpoint=`/${type}/follow-ups/overdue`;if(mode==='renewals'){endpoint='/amc/renewals/upcoming';q.set('days','60')}if(mode==='schedules'){endpoint='/amc/schedules/upcoming';q.set('days','60')}if(mode==='downline')endpoint='/employees/downline';const result=await api.get<unknown>(`${endpoint}?${q.toString()}`);const parsed=unwrap(result.data);setRows(parsed.rows);setTotal(parsed.total);}catch(e){setError(e instanceof Error?e.message:'Unable to load records');setRows([])}finally{setLoading(false)}},[config,page,search,type,mode,supportsFilters,branchId,dateFrom,dateTo,employeeName,roleCode]);
 useEffect(()=>{const t=setTimeout(()=>void load(),250);return()=>clearTimeout(t)},[load]);
 const start=rows.length?(page-1)*20+1:0;const end=(page-1)*20+rows.length;const columns=useMemo(()=>mode==='follow-ups'||mode==='overdue'?type==='leads'?['leadCode','customerName','mobileNumber','status','nextFollowUpDate','assignedTo']:['lead','visitDate','nextVisitDate','remark','visitedBy']:mode==='schedules'?['scheduledAt','contract','assignedEmployee','status','notes']:config.columns,[config,mode,type]);
 return (
  <div className="page-wrap">
   <div className="page-heading">
    <div><div className="eyebrow">{config.eyebrow}</div><h1>{config.title}</h1><p>{config.description}</p></div>
    <div className="heading-actions">
     {config.createPath&&<button className="primary-btn" onClick={()=>setCreating(true)}><Plus size={16}/>New {type==='amc'?'contract':type==='leads'?'lead':type==='visits'?'visit':'employee'}</button>}
    </div>
   </div>
   <section className="panel records-panel">
    <div className="records-toolbar">
     {(type==='leads'||type==='customers')?<div className="search-field"><Search size={16}/><input aria-label={`Search ${config.title}`} placeholder={`Search ${config.title.toLowerCase()}…`} value={search} maxLength={100} onChange={e=>{setPage(1);setSearch(e.target.value)}}/><kbd>⌘ K</kbd></div>:<div/>}
     <div className="toolbar-actions">
      {(type==='leads'||type==='visits'||type==='amc'||type==='employees')&&<select aria-label="Record view" value={mode} onChange={e=>{setMode(e.target.value);setPage(1)}}><option value="all">All {config.title.toLowerCase()}</option>{type==='leads'&&<><option value="follow-ups">Upcoming follow-ups</option><option value="overdue">Overdue follow-ups</option></>}{type==='visits'&&<><option value="follow-ups">Upcoming follow-ups</option><option value="overdue">Overdue follow-ups</option></>}{type==='amc'&&<><option value="renewals">Upcoming renewals</option><option value="schedules">Upcoming service</option></>}{type==='employees'&&<option value="downline">My downline</option>}</select>}
      <button className="filter-btn" onClick={()=>void load()}><SlidersHorizontal size={15}/> Refresh</button>
     </div>
    </div>
    {supportsFilters&&<div className="record-filters">
      <label>State<select aria-label="Filter by state" value={stateId} onChange={e=>{setStateId(e.target.value);setPage(1)}}><option value="">All states</option>{states.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
      <label>District<select aria-label="Filter by district" value={districtId} onChange={e=>{setDistrictId(e.target.value);setPage(1)}} disabled={!stateId}><option value="">All districts</option>{districts.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
      <label>Branch<select aria-label="Filter by branch" value={branchId} onChange={e=>{setBranchId(e.target.value);setPage(1)}} disabled={!districtId}><option value="">All branches</option>{branches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
      <label>From date<input aria-label="Filter from date" type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1)}}/></label>
      <label>To date<input aria-label="Filter to date" type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1)}}/></label>
      {roleCode!=='CP'&&<label className="record-employee-filter">Employee/team (includes downline)<input aria-label="Filter by employee name, including their downline" placeholder="Name or employee code" maxLength={100} value={employeeName} onChange={e=>{setEmployeeName(e.target.value);setPage(1)}}/></label>}
      <button type="button" className="filter-btn" onClick={()=>{setStateId('');setDistrictId('');setBranchId('');setDateFrom('');setDateTo('');setEmployeeName('');setPage(1)}}>Clear filters</button>
      {geographyError&&<span className="notice-error" role="alert">{geographyError}</span>}
    </div>}
    {error&&<div className="inline-error"><CircleAlert size={16}/><span>{error}</span><button onClick={()=>setError('')}>Dismiss</button></div>}
    <div className="table-scroll"><table><thead><tr>{columns.map(c=><th key={c}>{titleCase(c)}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>
     {loading?<tr><td colSpan={columns.length+1} className="table-state"><RefreshCw className="spin" size={20}/> Loading {config.title.toLowerCase()}…</td></tr>:rows.length?rows.map((row,index)=><tr key={String(row._id??row.id??index)}>{columns.map(c=><td key={c}>{c.toLowerCase().includes('status')?<span className={`status-pill ${(display(row[c]).toLowerCase().includes('active')||display(row[c]).toLowerCase().includes('interested'))?'status-good':''}`}>{display(row[c])}</span>:<span className={c==='customerName'?'person-cell':''}>{display(row[c])}</span>}</td>)}<td className="row-action">{['leads','visits','customers','quotations','amc','employees'].includes(type)&&<button className="icon-button" aria-label={`View ${config.title} record`} onClick={()=>setSelectedId(String(mode==='schedules'&&row.contract&&typeof row.contract==='object'?(row.contract as Row)._id:row._id??row.id??''))}><ArrowUpRight size={16}/></button>}</td></tr>):<tr><td colSpan={columns.length+1} className="table-state"><div className="empty-icon"><Search size={20}/></div><b>{error?'No records to display':'Nothing here yet'}</b><span>{search?'Try another search term.':'Records will appear here when available to your account.'}</span></td></tr>}
    </tbody></table></div>
    <div className="table-footer"><span>Showing <b>{start}–{end}</b> of <b>{total}</b></span><div className="pagination"><button className="page-button" disabled={page<=1||loading} onClick={()=>setPage(v=>Math.max(1,v-1))} aria-label="Previous page"><ChevronLeft size={16}/></button><span>Page <b>{page}</b></span><button className="page-button" disabled={rows.length<20||loading} onClick={()=>setPage(v=>v+1)} aria-label="Next page"><ChevronRight size={16}/></button></div></div>
   </section>
   {creating&&(type==='employees'?<EmployeeCreateDialog onClose={()=>setCreating(false)} onSaved={()=>void load()}/>:<CreateDialog kind={type} onClose={()=>setCreating(false)} onSaved={()=>void load()}/>)}
   {selectedId&&<RecordDetails type={type} id={selectedId} onClose={()=>setSelectedId('')}/>}
  </div>
 );
}
