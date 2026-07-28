import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BookOpenCheck, ClipboardCheck, Eye, Plus, Radio, Users } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import type { Exam } from '../../types';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({ totalExams: 0, liveExams: 0, attempts: 0, submissions: 0, average: 0 });
  const [error, setError] = useState('');
  const load = async () => {
    try { const [e, d] = await Promise.all([api.get('/exams'), api.get('/dashboard')]); setExams(e.data.exams); setStats(d.data); }
    catch (err) { setError(getErrorMessage(err)); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="page-stack">
    <section className="page-title-row"><div><p className="eyebrow-text">Teacher workspace</p><h1>Exam command center</h1><p>Create assessments, monitor candidates and publish meaningful results.</p></div><button className="primary-button" onClick={() => navigate('/teacher/exams/new')}><Plus size={18} />Create exam</button></section>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="stats-grid"><StatCard label="Total exams" value={stats.totalExams} icon={BookOpenCheck} /><StatCard label="Live now" value={stats.liveExams} icon={Radio} tone="red" /><StatCard label="Candidate attempts" value={stats.attempts} icon={Users} tone="green" /><StatCard label="Average score" value={`${stats.average}%`} icon={Activity} tone="amber" /></section>
    <section className="content-card">
      <div className="section-heading"><div><p className="eyebrow-text">Assessment library</p><h2>Your examinations</h2></div><ClipboardCheck size={22} /></div>
      {exams.length === 0 ? <div className="empty-state"><BookOpenCheck size={38} /><h3>Create your first exam</h3><p>Use the guided builder to configure questions, schedule, rules and student batch.</p><button className="primary-button" onClick={() => navigate('/teacher/exams/new')}>Create exam</button></div> : <div className="teacher-exam-list">{exams.map((exam) => <article className="teacher-exam-row" key={exam._id}>
        <div className="exam-icon"><BookOpenCheck size={22} /></div><div className="teacher-exam-main"><div><h3>{exam.title}</h3><p>{exam.subject} • {exam.batch} • {exam.durationMinutes} minutes</p></div><StatusBadge status={exam.status} /></div>
        <div className="mini-metrics"><span><b>{exam.metrics?.in_progress ?? 0}</b> active</span><span><b>{exam.metrics?.submitted ?? 0}</b> submitted</span><span><b>{exam.totalMarks}</b> marks</span></div>
        <div className="row-actions"><button className="icon-text-button" onClick={() => navigate(`/teacher/exams/${exam._id}/monitor`)}><Eye size={17} />Monitor</button><button className="icon-button" onClick={() => navigate(`/teacher/exams/${exam._id}/monitor`)}><ArrowRight size={18} /></button></div>
      </article>)}</div>}
    </section>
  </div>;
};
