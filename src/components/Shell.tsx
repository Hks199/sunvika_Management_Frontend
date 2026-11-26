import { useEffect, useState } from 'react';
import CallingAvailability from './CallingAvailability';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, BriefcaseBusiness, Building2, ChevronDown, CircleHelp, ClipboardList, ContactRound, FileText, LayoutDashboard, Menu, Settings2, ShieldCheck, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '../state/auth';
import { ThemeToggle } from '../theme';
import { api } from '../lib/api';
import AnnouncementBar from './AnnouncementBar';
import { ANNOUNCEMENT_PUBLISHERS } from '../lib/announcements';
import NotificationBell from './NotificationBell';
import { QUERY_ROLES } from '../lib/queries';
import sunvikaLogo from '../asset/SUNVIKA_Logo.png';
const sections = [
  { title:'WORKSPACE', links:[['Overview','/',LayoutDashboard],['Leads','/leads',ContactRound],['Site visits','/visits',ClipboardList],['Customers','/customers',Users],['Hold customers','/hold-customers',Users],['New customers','/document-review',ShieldCheck],['Quotations','/quotations',FileText],['AMC contracts','/amc',Wrench]] },
  { title:'ORGANIZATION', links:[['Announcements','/announcements',ClipboardList],['CP notifications','/cp-notifications',ClipboardList],['Queries','/queries',ClipboardList],['Calling reports','/calling-reports',BarChart3],['CP calling lists','/calling-lists',ClipboardList],['Candidate sheets','/state-candidates',ClipboardList],['Employees','/employees',BriefcaseBusiness],['Channel Partners','/channel-partners',Users],['Geography','/geography',Building2],['Reports','/reports',BarChart3]] },
  { title:'ADMINISTRATION', links:[['Quotation settings','/quotation-settings',Settings2],['Roles & permissions','/roles',ShieldCheck],['Audit log','/audit',Activity],['Sessions','/sessions',Settings2]] },
] as const;
export default function Shell() {
  const { user, signOut } = useAuth(); const navigate = useNavigate(); const [mobileOpen,setMobileOpen]=useState(false); const [profileOpen,setProfileOpen]=useState(false);
  const [apiOnline,setApiOnline]=useState<boolean|null>(null);
  const [rmActive,setRmActive]=useState(false);
  const isRm=(typeof user?.role==='string'?user.role:user?.role?.code)==='RM';
  const [profileImageUrl,setProfileImageUrl]=useState('');
  const [profileImageVersion,setProfileImageVersion]=useState(0);
  useEffect(()=>{const refresh=()=>setProfileImageVersion(v=>v+1);window.addEventListener('profile-image-updated',refresh);return()=>window.removeEventListener('profile-image-updated',refresh)},[]);
  useEffect(()=>{let active=true;void api.get<unknown>('/health').then(()=>{if(active)setApiOnline(true)}).catch(()=>{if(active)setApiOnline(false)});return()=>{active=false}},[]);
  useEffect(()=>{
    const employeeId=user?.id??user?._id;
    let active=true;
    let refreshTimer: ReturnType<typeof setTimeout>;
    setProfileImageUrl('');
    if(!employeeId)return()=>{active=false};
    const loadProfileImage=async()=>{
      try{
        const response=await api.get<{url?:string}>('/employees/me/profile-image-url');
        if(active)setProfileImageUrl(response.data?.url??'');
      }catch{
        if(active)setProfileImageUrl('');
      }finally{
        if(active)refreshTimer=setTimeout(()=>void loadProfileImage(),240000);
      }
    };
    void loadProfileImage();
    return()=>{active=false;clearTimeout(refreshTimer)};
  },[user?.id,user?._id,profileImageVersion]);
  const fullName = [user?.firstName,user?.lastName].filter(Boolean).join(' ') || user?.name || 'Team member';
  const initial = fullName.slice(0,1).toUpperCase();
  async function logout(){await signOut();navigate('/login',{replace:true});}
  return <div className="app-shell"><aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}><div className="sidebar-brand"><img className="brand-logo" src={sunvikaLogo} alt="Sunvika"/><button className="mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X size={19}/></button></div><div className="workspace-switch"><div className="workspace-symbol">S</div><div><b>Sunvika Group</b><small>Management workspace</small></div><ChevronDown size={15}/></div><nav aria-label="Main navigation">{sections.map(section=><div className="nav-section" key={section.title}><div className="nav-heading">{section.title}</div>{section.links.filter(([,path])=>['/reports','/audit','/amc'].includes(path)&&(typeof user?.role==='string'?user.role:user?.role?.code)==='RM'?false:['/employees','/channel-partners','/amc','/reports','/audit'].includes(path)&&(typeof user?.role==='string'?user.role:user?.role?.code)==='CP'?false:path==='/state-candidates'?['MD','MIS','CP_HEAD'].includes(typeof user?.role==='string'?user.role:user?.role?.code??''):path==='/document-review'?['MD','CP_HEAD','RM','MIS'].includes(typeof user?.role==='string'?user.role:user?.role?.code??''):path==='/hold-customers'?(typeof user?.role==='string'?user.role:user?.role?.code)==='CP':(path==='/calling-reports'||path==='/cp-notifications')?['MD','MIS','CP_HEAD','RM'].includes(typeof user?.role==='string'?user.role:user?.role?.code??''):path==='/announcements'?ANNOUNCEMENT_PUBLISHERS.includes(typeof user?.role==='string'?user.role:user?.role?.code??''):(path==='/roles'||path==='/quotation-settings')?(typeof user?.role==='string'?user.role:user?.role?.code)==='MD':path==='/queries'?QUERY_ROLES.includes(typeof user?.role==='string'?user.role:user?.role?.code??''):path!=='/calling-lists'||['MD','MIS','CP_HEAD','RM'].includes(typeof user?.role==='string'?user.role:user?.role?.code??'')).map(([label,path,Icon])=><NavLink onClick={()=>setMobileOpen(false)} end={path==='/'} to={path} className={({isActive})=>`nav-link ${isActive?'active':''}`} key={path}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</div>)}</nav><div className="sidebar-bottom"><div className="help-card"><CircleHelp size={17}/><span>Need a hand?<small>View workspace guide</small></span><ChevronDown size={14}/></div><div className="sidebar-user"><div className="avatar">{profileImageUrl ? <img src={profileImageUrl} alt={`${fullName} profile`} onError={() => setProfileImageUrl('')} /> : initial}</div><div className="user-meta"><b>{fullName}</b><small>{typeof user?.role==='string'?user.role:user?.role?.name||user?.role?.code||'Workspace member'}</small></div><button onClick={()=>setProfileOpen(!profileOpen)} className="icon-button" aria-label="Profile menu"><ChevronDown size={17}/></button>{profileOpen&&<div className="profile-menu"><button onClick={()=>{setProfileOpen(false);navigate('/profile')}}>My profile</button><button onClick={()=>navigate('/sessions')}>Manage sessions</button><button onClick={logout}>Sign out</button></div>}</div></div></aside><div className="main-column"><div className="workspace-header"><header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><b>Management</b></div><div className="topbar-right"><div className={`api-status ${apiOnline===false?'api-offline':''}`} title={apiOnline===null?'Checking API availability':apiOnline?'API is reachable':'API unavailable'}><span className="status-dot"/>{apiOnline===null?'Checking API…':apiOnline?'API connected':'API unavailable'}</div>{(!isRm||rmActive)&&<NotificationBell/>}<ThemeToggle/><div className="top-avatar">{initial}</div></div></header>{(!isRm||rmActive)&&<AnnouncementBar/>}</div><main className="content">{isRm&&<CallingAvailability onChange={setRmActive}/>} {(!isRm||rmActive)&&<Outlet/>}</main><footer className="app-footer"><span>© 2026 Sunvika Management</span><span><ShieldCheck size={13}/> Protected workspace</span></footer></div>{mobileOpen&&<button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close menu"/>}</div>
}
