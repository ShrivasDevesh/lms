import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Eye, Radio, Search, ShieldCheck } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import type { Exam, User } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface AdminExam extends Exam { createdBy?: User }

export const AdminExamsPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/exams').then(({ data }) => setExams(data.exams)).catch((err) => setError(getErrorMessage(err)));
  }, []);

  const filtered = exams.filter((exam) => `${exam.title} ${exam.subject} ${exam.batch} ${exam.createdBy?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="page-stack">
    <section className="page-title-row"><div><p className="eyebrow-text">Super admin oversight</p><h1>All examinations</h1><p>Inspect and control examinations created by every teacher.</p></div><div className="title-icon"><ShieldCheck size={26} /></div></section>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="content-card">
      <div className="section-heading"><div><p className="eyebrow-text">Platform exam registry</p><h2>Teacher examinations</h2></div><div className="search-box"><Search size={17} /><input placeholder="Search exams" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Exam</th><th>Teacher</th><th>Batch</th><th>Status</th><th>Attempts</th><th /></tr></thead><tbody>{filtered.map((exam) => <tr key={exam._id}>
        <td><div className="table-user"><div className="exam-icon"><BookOpenCheck size={18} /></div><span><strong>{exam.title}</strong><small>{exam.subject} • {exam.durationMinutes} minutes</small></span></div></td>
        <td>{exam.createdBy?.name ?? 'Platform admin'}</td><td>{exam.batch}</td><td><StatusBadge status={exam.status} /></td><td>{(exam.metrics?.in_progress ?? 0) + (exam.metrics?.submitted ?? 0)}</td>
        <td><button className="icon-text-button" onClick={() => navigate(`/admin/exams/${exam._id}/monitor`)}>{exam.status === 'live' ? <Radio size={16} /> : <Eye size={16} />}Control</button></td>
      </tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><BookOpenCheck size={36} /><h3>No exams found</h3><p>Teacher-created exams will appear here.</p></div>}</div>
    </section>
  </div>;
};
