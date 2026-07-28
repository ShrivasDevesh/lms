import { useEffect, useState } from 'react';
import { Activity, BookOpenCheck, Radio, ShieldCheck, UserCog, Users } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { StatCard } from '../../components/StatCard';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, teachers: 0, exams: 0, liveExams: 0, attempts: 0, recentLogs: [] as any[] });
  const [error, setError] = useState('');
  useEffect(() => { api.get('/dashboard').then(({ data }) => setStats(data)).catch((err) => setError(getErrorMessage(err))); }, []);
  return <div className="page-stack">
    <section className="page-title-row"><div><p className="eyebrow-text">Platform administration</p><h1>System overview</h1><p>Manage people, monitor examinations and keep the platform healthy.</p></div><div className="title-icon"><ShieldCheck size={27} /></div></section>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="stats-grid"><StatCard label="Active students" value={stats.students} icon={Users} /><StatCard label="Teachers" value={stats.teachers} icon={UserCog} tone="green" /><StatCard label="Total exams" value={stats.exams} icon={BookOpenCheck} tone="amber" /><StatCard label="Live exams" value={stats.liveExams} icon={Radio} tone="red" /></section>
    <div className="admin-grid"><section className="content-card"><div className="section-heading"><div><p className="eyebrow-text">Platform health</p><h2>Operational snapshot</h2></div><Activity size={22} /></div><div className="health-card"><div className="health-score"><span>99.9%</span><small>API availability</small></div><div className="health-bars"><p><span>Database connection pool</span><b>Healthy</b></p><i><em style={{ width: '34%' }} /></i><p><span>Total candidate attempts</span><b>{stats.attempts}</b></p><i><em style={{ width: '62%' }} /></i><p><span>Background report queue</span><b>Ready</b></p><i><em style={{ width: '18%' }} /></i></div></div></section>
    <section className="content-card"><div className="section-heading"><div><p className="eyebrow-text">Audit feed</p><h2>Recent activity</h2></div></div><div className="audit-list">{stats.recentLogs.length === 0 ? <p className="muted">No activity yet.</p> : stats.recentLogs.map((log) => <div key={log._id}><span className="audit-dot" /><p><strong>{log.actor?.name ?? 'System'}</strong> {String(log.action).replaceAll('.', ' ')}</p><time>{new Date(log.createdAt).toLocaleString()}</time></div>)}</div></section></div>
  </div>;
};
