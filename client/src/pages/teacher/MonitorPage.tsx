import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock4, Download, MoreHorizontal, Play, Radio, RefreshCw, Square, UserCheck, Users, WifiOff } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import type { Attempt, Exam, Result, User } from '../../types';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface Candidate extends User { attempt?: Attempt; result?: Result }
interface MonitorData { exam: Exam; summary: { assigned: number; online: number; started: number; submitted: number; disconnected: number; notStarted: number; questionCount: number }; candidates: Candidate[] }

export const MonitorPage = () => {
  const { examId } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [data, setData] = useState<MonitorData | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { try { const response = await api.get(`/exams/${examId}/monitor`); setData(response.data); } catch (err) { setError(getErrorMessage(err)); } }, [examId]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);

  const action = async (path: string, body?: unknown) => { try { setLoading(true); await api.post(path, body); await load(); } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); } };
  const extend = async (candidate: Candidate) => { const minutes = Number(window.prompt(`Extend time for ${candidate.name} by how many minutes?`, '10')); if (!minutes || !candidate.attempt) return; try { await api.patch(`/attempts/${candidate.attempt._id}/extend`, { minutes }); await load(); } catch (err) { setError(getErrorMessage(err)); } };

  if (!data) return <div className="page-loading">Loading live examination data…</div>;
  const { exam, summary, candidates } = data;
  return <div className="page-stack">
    <button className="back-button" onClick={() => navigate(user?.role === 'super_admin' ? '/admin/exams' : '/teacher')}><ArrowLeft size={17} />Back to exams</button>
    <section className="monitor-hero"><div><div className="live-heading"><StatusBadge status={exam.status} /><span>Auto-refreshes every 5 seconds</span></div><h1>{exam.title}</h1><p>{exam.subject} • {exam.batch} • {exam.durationMinutes} minutes</p></div><div className="monitor-controls">{exam.status !== 'live' && <button className="primary-button" disabled={loading} onClick={() => void action(`/exams/${exam._id}/live`, { startNow: true })}><Play size={17} />Start now</button>}{exam.status === 'live' && <button className="danger-button" disabled={loading} onClick={() => void action(`/exams/${exam._id}/end`)}><Square size={16} />End exam</button>}<button className="secondary-button" onClick={() => void load()}><RefreshCw size={17} />Refresh</button></div></section>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="stats-grid monitor-stats"><StatCard label="Assigned" value={summary.assigned} icon={Users} /><StatCard label="Online now" value={summary.online} icon={Radio} tone="green" /><StatCard label="Submitted" value={summary.submitted} icon={UserCheck} tone="violet" /><StatCard label="Disconnected" value={summary.disconnected} icon={WifiOff} tone="red" /></section>
    <section className="content-card">
      <div className="section-heading"><div><p className="eyebrow-text">Live candidates</p><h2>Candidate activity</h2></div><button className="secondary-button"><Download size={17} />Export report</button></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Status</th><th>Progress</th><th>Last activity</th><th>Warnings</th><th /></tr></thead><tbody>{candidates.map((candidate) => {
        const status = candidate.attempt?.status ?? 'not_started'; const progress = candidate.attempt ? Math.round((candidate.attempt.answeredCount / Math.max(1, summary.questionCount)) * 100) : 0;
        return <tr key={candidate._id ?? candidate.id}><td><div className="table-user"><div className="avatar small">{candidate.name.slice(0, 2).toUpperCase()}</div><span><strong>{candidate.name}</strong><small>{candidate.studentCode ?? candidate.email}</small></span></div></td><td><StatusBadge status={status} /></td><td><div className="table-progress"><span><i style={{ width: `${Math.min(100, progress)}%` }} /></span><b>{candidate.attempt?.answeredCount ?? 0} answered</b></div></td><td>{candidate.attempt ? new Date(candidate.attempt.updatedAt).toLocaleTimeString() : '—'}</td><td>{candidate.attempt?.warningCount ?? 0}</td><td><div className="table-actions">{candidate.attempt?.status === 'in_progress' && <><button onClick={() => void extend(candidate)}><Clock4 size={15} />Extend</button><button onClick={() => void action(`/attempts/${candidate.attempt!._id}/force-submit`)}>Submit</button></>}<button className="icon-button"><MoreHorizontal size={17} /></button></div></td></tr>;
      })}</tbody></table></div>
    </section>
  </div>;
};
