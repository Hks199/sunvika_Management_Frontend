import { Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Shell from './components/Shell';
import { Protected } from './components/Protected';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Sessions from './pages/Sessions';
import Geography from './pages/Geography';
import Roles from './pages/Roles';
import CallingLists from './pages/CallingLists';
function NotFound(){return <div className="not-found"><div className="eyebrow">404 · PAGE NOT FOUND</div><h1>That page wandered off.</h1><a className="primary-btn" href="/">Back to overview</a></div>}
export default function App(){return <Routes><Route path="/login" element={<Login/>}/><Route path="/forgot-password" element={<Login/>}/><Route path="/set-password" element={<Login/>}/><Route path="/reset-password" element={<Login/>}/><Route element={<Protected/>}><Route element={<Shell/>}><Route index element={<Dashboard/>}/><Route path="leads" element={<Records type="leads"/>}/><Route path="visits" element={<Records type="visits"/>}/><Route path="customers" element={<Records type="customers"/>}/><Route path="quotations" element={<Records type="quotations"/>}/><Route path="amc" element={<Records type="amc"/>}/><Route path="calling-lists" element={<CallingLists/>}/><Route path="channel-partners" element={<Records type="channel-partners"/>}/><Route path="employees" element={<Records type="employees"/>}/><Route path="geography" element={<Geography/>}/><Route path="roles" element={<Roles/>}/><Route path="audit" element={<Records type="audit"/>}/><Route path="reports" element={<Reports/>}/><Route path="sessions" element={<Sessions/>}/></Route></Route><Route path="*" element={<NotFound/>}/></Routes>}
