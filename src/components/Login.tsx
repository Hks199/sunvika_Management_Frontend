import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../state/auth';
import { emailSchema, passwordSchema } from '../lib/validation';
import { api } from '../lib/api';
import sunvikaLogo from '../asset/SUNVIKA_Logo.png';

type Mode = 'login' | 'forgot' | 'set' | 'reset';
const tokenPattern = /^[A-Za-z0-9_-]{40,100}$/;
export default function Login() {
  const { user, signIn } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [params] = useSearchParams();
  const mode: Mode = location.pathname === '/forgot-password' ? 'forgot' : location.pathname === '/set-password' ? 'set' : location.pathname === '/reset-password' ? 'reset' : 'login';
  const [resetToken, setResetToken] = useState(() => params.get('token') || '');
  useEffect(() => { if (mode === 'set' || mode === 'reset') window.history.replaceState({}, document.title, window.location.pathname); }, [mode]);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  if (user && mode === 'login') return <Navigate to="/" replace />;
  const titles: Record<Mode, string> = { login: 'Sign in to your workspace', forgot: 'Reset your password', set: 'Set your password', reset: 'Choose a new password' };
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'login') {
        const parsed = emailSchema.safeParse(email); if (!parsed.success) throw new Error('Enter a valid work email address.');
        if (!password || password.length > 128) throw new Error('Enter your password.');
        await signIn(parsed.data.toLowerCase(), password); navigate('/', { replace: true }); return;
      }
      if (mode === 'forgot') {
        const parsed = emailSchema.safeParse(email); if (!parsed.success) throw new Error('Enter a valid work email address.');
        const result = await api.post('/auth/forgot-password', { email: parsed.data.toLowerCase() }); setNotice(result.message || 'If the account exists, password reset instructions will be sent.'); return;
      }
      const token = resetToken; if (!tokenPattern.test(token)) throw new Error('This password link is missing or invalid. Open the complete link from your email.');
      const parsed = passwordSchema.safeParse(password); if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Choose a stronger password.');
      if (password !== confirm) throw new Error('Passwords do not match.');
      const endpoint = mode === 'set' ? '/auth/set-password' : '/auth/reset-password';
      const result = await api.post(endpoint, { token, password }); setResetToken(''); setPassword(''); setConfirm(''); setNotice(result.message || 'Password updated. You can sign in now.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete this request.'); }
    finally { setBusy(false); }
  }
  const passwordFlow = mode === 'set' || mode === 'reset';
  return <main className="login-page"><section className="login-story"><div className="brand"><img className="brand-logo" src={sunvikaLogo} alt="Sunvika"/></div><div className="story-copy"><div className="eyebrow light">SUNVIKA MANAGEMENT</div><h1>Good work<br/><em>moves us forward.</em></h1><p>Your business, your team, and every customer relationship — together in one place.</p></div><div className="story-foot">BUILT FOR THE WAY YOU WORK <span>© 2026 SUNVIKA</span></div></section><section className="login-panel"><div className="login-wrap"><div className="mobile-brand brand"><img className="brand-logo" src={sunvikaLogo} alt="Sunvika"/></div><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : mode === 'forgot' ? 'ACCOUNT RECOVERY' : 'SECURE PASSWORD SETUP'}</div><h2>{titles[mode]}</h2><p className="muted">{mode === 'login' ? 'Enter your work credentials to continue.' : mode === 'forgot' ? 'We’ll send instructions if an account matches that address.' : 'Use at least 12 characters with uppercase, lowercase, and a number.'}</p><form onSubmit={submit} className="login-form" noValidate>{(mode === 'login' || mode === 'forgot')&&<><label htmlFor="email">Work email</label><div className="input-icon"><Mail size={17}/><input id="email" type="email" autoComplete="username" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/></div></>}{(mode==='login'||passwordFlow)&&<><label htmlFor="password">{mode === 'login' ? 'Password' : 'New password'}</label><div className="input-icon"><LockKeyhole size={17}/><input id="password" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Enter your password':'12+ characters'} required/><button className="show-password" type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></>}{passwordFlow&&<><label htmlFor="confirm">Confirm new password</label><div className="input-icon"><LockKeyhole size={17}/><input id="confirm" type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" required/></div></>}{error&&<div className="form-error" role="alert">{error}</div>}{notice&&<div className="success-note" role="status">{notice}</div>}<button className="primary-btn login-submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':mode==='forgot'?'Send recovery email':'Save password'}<ArrowRight size={17}/></button></form>{mode==='login'?<Link className="auth-link" to="/forgot-password">Forgot password?</Link>:<Link className="auth-link" to="/login">Back to sign in</Link>}<div className="secure-note"><LockKeyhole size={14}/> Secure, encrypted access</div></div><div className="login-support">Having trouble signing in? Contact your system administrator.</div></section></main>
}
