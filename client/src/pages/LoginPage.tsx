import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';

const demos = [
  { label: 'Student', email: 'student@lms.dev', password: 'Student@123' },
  { label: 'Teacher', email: 'teacher@lms.dev', password: 'Teacher@123' },
  { label: 'Admin', email: 'admin@lms.dev', password: 'Admin@123' }
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('student@lms.dev');
  const [password, setPassword] = useState('Student@123');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true); setError('');
      const user = await login(email, password);
      navigate(user.role === 'student' ? '/student' : user.role === 'teacher' ? '/teacher' : '/admin');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <section className="login-showcase">
        <div className="showcase-glow glow-one" /><div className="showcase-glow glow-two" />
        <div className="login-brand"><div className="brand-mark"><BookOpenCheck size={24} /></div><span>Elevate LMS</span></div>
        <div className="showcase-content">
          <div className="eyebrow"><Sparkles size={16} /> Built for high-stakes learning</div>
          <h1>One platform for better learning and smarter examinations.</h1>
          <p>Run secure online exams, monitor candidates in real time, and turn every result into actionable insight.</p>
          <div className="feature-grid">
            <div><ShieldCheck /><span><strong>Secure by design</strong>Server-controlled exam sessions</span></div>
            <div><Users /><span><strong>Ready to scale</strong>Architecture for 1,000 candidates</span></div>
            <div><CheckCircle2 /><span><strong>Instant insight</strong>Reports and downloadable PDFs</span></div>
          </div>
        </div>
        <p className="showcase-footer">© 2026 Elevate Exam Cloud</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand"><div className="brand-mark"><BookOpenCheck size={22} /></div><strong>Elevate LMS</strong></div>
          <div className="login-heading"><span className="mini-icon"><LockKeyhole size={20} /></span><h2>Welcome back</h2><p>Sign in to continue to your workspace.</p></div>
          <form onSubmit={submit}>
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label>Password<div className="password-field"><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /><button type="button" onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button login-button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}<ArrowRight size={18} /></button>
          </form>
          <div className="demo-divider"><span>Demo access</span></div>
          <div className="demo-buttons">
            {demos.map((demo) => <button key={demo.label} onClick={() => { setEmail(demo.email); setPassword(demo.password); }}>{demo.label}</button>)}
          </div>
          <p className="login-help">Use a demo account after running the seed command.</p>
        </div>
      </section>
    </div>
  );
};
