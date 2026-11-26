import Profile from './pages/Profile';
import CallingLocationSettings from './components/CallingLocationSettings';
import HoldCustomers from './pages/HoldCustomers';
import QuotationSettings from './components/QuotationSettings';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './state/auth';
import Login from './components/Login';
import Shell from './components/Shell';
import { Protected } from './components/Protected';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Sessions from './pages/Sessions';
import Geography from './pages/Geography';
import Roles from './pages/Roles';
import CallingReports from './pages/CallingReports';
import StateCandidates from './pages/StateCandidates';
import CallingLists from './pages/CallingLists';
import Announcements from './pages/Announcements';
import Queries from './pages/Queries';
import CpReminders from './pages/CpReminders';
function CpPageGuard(){const {user}=useAuth();const role=typeof user?.role==='string'?user.role:user?.role?.code;return role==='CP'?<Navigate to="/" replace/>:<Outlet/>;}
function ReportsAuditGuard(){const {user}=useAuth();const role=typeof user?.role==='string'?user.role:user?.role?.code;return role==='RM'?<Navigate to="/" replace/>:<Outlet/>;}
function MdPageGuard(){const {user}=useAuth();const role=typeof user?.role==='string'?user.role:user?.role?.code;return role==='MD'?<Outlet/>:<Navigate to="/" replace/>;}
function NotFound(){return <div className="not-found"><div className="eyebrow">404 · PAGE NOT FOUND</div><h1>That page wandered off.</h1><a className="primary-btn" href="/">Back to overview</a></div>}
export default function App(){return <Routes><Route path="/login" element={<Login/>}/><Route path="/forgot-password" element={<Login/>}/><Route path="/set-password" element={<Login/>}/><Route path="/reset-password" element={<Login/>}/><Route element={<Protected/>}><Route element={<Shell/>}><Route index element={<Dashboard/>}/><Route path="profile" element={<Profile/>}/><Route path="leads" element={<Records type="leads"/>}/><Route path="visits" element={<Records type="visits"/>}/><Route path="customers" element={<Records type="customers"/>}/><Route path="hold-customers" element={<HoldCustomers/>}/><Route path="document-review" element={<HoldCustomers review/>}/><Route path="quotations" element={<Records type="quotations"/>}/><Route path="announcements" element={<Announcements/>}/><Route path="cp-notifications" element={<CpReminders/>}/><Route path="queries" element={<Queries/>}/><Route path="calling-reports" element={<CallingReports/>}/><Route path="state-candidates" element={<StateCandidates/>}/><Route path="calling-lists" element={<CallingLists/>}/><Route element={<MdPageGuard/>}><Route path="rm-calling-location" element={<CallingLocationSettings/>}/></Route><Route path="geography" element={<Geography/>}/><Route path="quotation-settings" element={<QuotationSettings/>}/><Route path="roles" element={<Roles/>}/><Route element={<CpPageGuard/>}><Route element={<ReportsAuditGuard/>}><Route path="amc" element={<Records type="amc"/>}/></Route><Route path="channel-partners" element={<Records type="channel-partners"/>}/><Route path="employees" element={<Records type="employees"/>}/><Route element={<ReportsAuditGuard/>}><Route path="audit" element={<Records type="audit"/>}/><Route path="reports" element={<Reports/>}/></Route></Route><Route path="sessions" element={<Sessions/>}/></Route></Route><Route path="*" element={<NotFound/>}/></Routes>}
