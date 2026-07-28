import { useEffect, useState } from 'react';
import { Award, Download, FileText, Medal, Target, TrendingUp } from 'lucide-react';
import { api, downloadPdf, getErrorMessage } from '../../lib/api';
import type { Result } from '../../types';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';

export const ResultsPage = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');
  useEffect(() => { api.get('/results/mine').then(({ data }) => setResults(data.results)).catch((e) => setError(getErrorMessage(e))); }, []);
  const avg = results.length ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1) : '0';
  const best = results.length ? Math.max(...results.map((r) => r.percentage)) : 0;

  const download = async (result: Result) => {
    try { setDownloading(result._id); await downloadPdf(result._id, `${result.exam.title}-result.pdf`); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setDownloading(''); }
  };

  return <div className="page-stack">
    <section className="page-title-row"><div><p className="eyebrow-text">Performance center</p><h1>My results</h1><p>Track improvement and download official result sheets.</p></div><div className="title-icon"><Medal size={26} /></div></section>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="stats-grid"><StatCard label="Average score" value={`${avg}%`} icon={TrendingUp} /><StatCard label="Best score" value={`${best}%`} icon={Award} tone="amber" /><StatCard label="Published results" value={results.length} icon={FileText} tone="green" /></section>
    <section className="content-card">
      <div className="section-heading"><div><p className="eyebrow-text">Exam history</p><h2>Result sheets</h2></div><Target size={22} /></div>
      {results.length === 0 ? <div className="empty-state"><FileText size={38} /><h3>No published results</h3><p>Your results will appear after submission and teacher publication.</p></div> : <div className="result-list">{results.map((result) => <article className="result-row" key={result._id}>
        <div className={`result-score ${result.status}`}><strong>{result.percentage}%</strong><span>{result.obtainedMarks}/{result.totalMarks}</span></div>
        <div className="result-main"><div><h3>{result.exam.title}</h3><p>{result.exam.subject} • {new Date(result.createdAt).toLocaleDateString()}</p></div><div className="result-chips"><StatusBadge status={result.status} />{result.rank && <span className="rank-chip">Rank #{result.rank}</span>}</div></div>
        <div className="result-analysis"><span><b>{result.correctAnswers}</b> correct</span><span><b>{result.incorrectAnswers}</b> incorrect</span><span><b>{result.unansweredQuestions}</b> unanswered</span></div>
        <button className="secondary-button" disabled={downloading === result._id} onClick={() => void download(result)}><Download size={17} />{downloading === result._id ? 'Preparing…' : 'Download PDF'}</button>
      </article>)}</div>}
    </section>
  </div>;
};
