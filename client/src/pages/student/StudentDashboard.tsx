import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarClock, CheckCircle2, Clock3, PlayCircle, Target } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import type { Exam } from '../../types';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({ activeExams: 0, completed: 0, average: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [examRes, dashboardRes] = await Promise.all([api.get('/exams'), api.get('/dashboard')]);
      setExams(examRes.data.exams); setStats(dashboardRes.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const start = async (exam: Exam) => {
    try {
      if (exam.attempt?._id && exam.attempt.status === 'in_progress') return navigate(`/student/exam/${exam.attempt._id}`);
      const { data } = await api.post(`/attempts/start/${exam._id}`);
      navigate(`/student/exam/${data.attemptId}`);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const active = exams.filter((exam) => ['published', 'live'].includes(exam.status));
  const completed = exams.filter((exam) => exam.status === 'completed' || exam.attempt?.status === 'submitted');

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div><p className="eyebrow-text">Student workspace</p><h1>Good day, {user?.name.split(' ')[0]} 👋</h1><p>Stay focused, keep progressing, and give your best in every assessment.</p></div>
        <div className="banner-illustration"><Target size={66} /><span>Weekly goal</span><strong>4/5</strong></div>
      </section>
      {error && <div className="alert error-alert">{error}</div>}
      <section className="stats-grid">
        <StatCard label="Available exams" value={stats.activeExams} helper="Ready or upcoming" icon={BookOpen} />
        <StatCard label="Completed" value={stats.completed} helper="Submitted attempts" icon={CheckCircle2} tone="green" />
        <StatCard label="Average score" value={`${stats.average}%`} helper="Across published results" icon={Award} tone="amber" />
      </section>
      <section className="content-card">
        <div className="section-heading"><div><p className="eyebrow-text">Your assessments</p><h2>Active and upcoming exams</h2></div><CalendarClock size={22} /></div>
        {loading ? <div className="skeleton-list"><span /><span /><span /></div> : active.length === 0 ? (
          <div className="empty-state"><BookOpen size={38} /><h3>No active examinations</h3><p>Your assigned exams will appear here when a teacher publishes them.</p></div>
        ) : <div className="exam-card-grid">
          {active.map((exam) => {
            const submitted = exam.attempt?.status === 'submitted';
            return <article className="exam-card" key={exam._id}>
              <div className="exam-card-top"><span className="subject-chip">{exam.subject}</span><StatusBadge status={submitted ? 'submitted' : exam.status} /></div>
              <h3>{exam.title}</h3><p>{exam.description}</p>
              <div className="exam-meta"><span><Clock3 size={16} />{exam.durationMinutes} minutes</span><span><Award size={16} />{exam.totalMarks} marks</span></div>
              <div className="exam-date">Starts {new Date(exam.startAt).toLocaleString()}</div>
              <button className="primary-button" disabled={submitted} onClick={() => void start(exam)}>{submitted ? 'Submitted' : exam.attempt ? 'Resume exam' : 'Start exam'}{!submitted && <PlayCircle size={18} />}</button>
            </article>;
          })}
        </div>}
      </section>
      {completed.length > 0 && <section className="content-card compact-card"><div className="section-heading"><div><p className="eyebrow-text">History</p><h2>Recently completed</h2></div><button className="text-button" onClick={() => navigate('/student/results')}>View results <ArrowRight size={16} /></button></div></section>}
    </div>
  );
};
