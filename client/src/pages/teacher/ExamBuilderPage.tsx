import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CirclePlus, FileCheck2, Settings2, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';

interface BuilderQuestion {
  prompt: string;
  options: string[];
  correct: number;
  marks: number;
  negativeMarks: number;
}

const blankQuestion = (): BuilderQuestion => ({ prompt: '', options: ['', '', '', ''], correct: 0, marks: 1, negativeMarks: 0 });

export const ExamBuilderPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({
    title: '', description: '', subject: '', course: 'B.Tech CSE', batch: 'CSE-2026-A', durationMinutes: 60,
    startAt: new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 25 * 60 * 60_000).toISOString().slice(0, 16),
    passPercentage: 40, negativeMarking: false, shuffleQuestions: true, shuffleOptions: true, showResultImmediately: true
  });
  const [questions, setQuestions] = useState<BuilderQuestion[]>([blankQuestion(), blankQuestion()]);
  const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + Number(q.marks || 0), 0), [questions]);

  const updateQuestion = (index: number, patch: Partial<BuilderQuestion>) => setQuestions((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const updateOption = (qIndex: number, oIndex: number, value: string) => setQuestions((items) => items.map((item, i) => i === qIndex ? { ...item, options: item.options.map((o, j) => j === oIndex ? value : o) } : item));

  const create = async () => {
    try {
      setLoading(true); setError('');
      const { data } = await api.post('/exams', { ...details, durationMinutes: Number(details.durationMinutes), passPercentage: Number(details.passPercentage), instructions: ['Read every question carefully.', 'Answers are saved automatically.', 'Submit before the timer expires.'] });
      const payload = questions.map((q) => ({
        prompt: q.prompt, type: 'single', options: q.options.map((text, i) => ({ optionId: `q-${crypto.randomUUID()}-${i}`, text })), marks: Number(q.marks), negativeMarks: Number(q.negativeMarks), correctOptionIds: [] as string[]
      }));
      payload.forEach((question, index) => { question.correctOptionIds = [question.options[questions[index].correct].optionId]; });
      await api.post(`/exams/${data.exam._id}/questions`, { questions: payload });
      await api.post(`/exams/${data.exam._id}/publish`);
      navigate(`/teacher/exams/${data.exam._id}/monitor`);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const canContinue = step === 1 ? details.title.length > 2 && details.subject.length > 1 && details.batch.length > 0 : questions.every((q) => q.prompt.length > 2 && q.options.every(Boolean));

  return <div className="builder-page">
    <button className="back-button" onClick={() => navigate('/teacher')}><ArrowLeft size={17} />Back to exams</button>
    <section className="page-title-row"><div><p className="eyebrow-text">Guided exam builder</p><h1>Create a new assessment</h1><p>Configure everything in three clear steps.</p></div><div className="draft-pill">Draft autosave</div></section>
    <div className="builder-steps">{[{ n: 1, label: 'Exam details' }, { n: 2, label: 'Questions' }, { n: 3, label: 'Review & publish' }].map((item) => <div key={item.n} className={`${step === item.n ? 'active' : ''} ${step > item.n ? 'done' : ''}`}><span>{step > item.n ? <Check size={16} /> : item.n}</span><p>{item.label}</p></div>)}</div>
    {error && <div className="alert error-alert">{error}</div>}
    <section className="content-card builder-card">
      {step === 1 && <div className="form-section"><div className="section-heading"><div><p className="eyebrow-text">Step 1</p><h2>Exam information</h2></div><Settings2 /></div><div className="form-grid">
        <label className="span-2">Exam title<input value={details.title} onChange={(e) => setDetails({ ...details, title: e.target.value })} placeholder="e.g. Data Structures Mid-Term" /></label>
        <label>Subject<input value={details.subject} onChange={(e) => setDetails({ ...details, subject: e.target.value })} placeholder="Data Structures" /></label>
        <label>Course<input value={details.course} onChange={(e) => setDetails({ ...details, course: e.target.value })} /></label>
        <label>Batch<input value={details.batch} onChange={(e) => setDetails({ ...details, batch: e.target.value })} /></label>
        <label>Duration (minutes)<input type="number" min="1" value={details.durationMinutes} onChange={(e) => setDetails({ ...details, durationMinutes: Number(e.target.value) })} /></label>
        <label>Start time<input type="datetime-local" value={details.startAt} onChange={(e) => setDetails({ ...details, startAt: e.target.value })} /></label>
        <label>End time<input type="datetime-local" value={details.endAt} onChange={(e) => setDetails({ ...details, endAt: e.target.value })} /></label>
        <label className="span-2">Description<textarea value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} placeholder="What does this assessment evaluate?" /></label>
      </div></div>}
      {step === 2 && <div className="form-section"><div className="section-heading"><div><p className="eyebrow-text">Step 2</p><h2>Build your question paper</h2></div><button className="secondary-button" onClick={() => setQuestions((q) => [...q, blankQuestion()])}><CirclePlus size={17} />Add question</button></div>
        <div className="question-builder-list">{questions.map((q, index) => <article className="question-builder" key={index}><div className="question-builder-head"><span>Question {index + 1}</span>{questions.length > 1 && <button className="icon-button danger-icon" onClick={() => setQuestions((items) => items.filter((_, i) => i !== index))}><Trash2 size={17} /></button>}</div>
          <label>Question<input value={q.prompt} onChange={(e) => updateQuestion(index, { prompt: e.target.value })} placeholder="Enter the question text" /></label>
          <div className="builder-options">{q.options.map((option, optionIndex) => <label key={optionIndex} className={q.correct === optionIndex ? 'correct-option' : ''}><input type="radio" name={`correct-${index}`} checked={q.correct === optionIndex} onChange={() => updateQuestion(index, { correct: optionIndex })} /><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(e) => updateOption(index, optionIndex, e.target.value)} placeholder={`Option ${optionIndex + 1}`} /></label>)}</div>
          <div className="inline-fields"><label>Marks<input type="number" min="0" value={q.marks} onChange={(e) => updateQuestion(index, { marks: Number(e.target.value) })} /></label><label>Negative marks<input type="number" min="0" step="0.25" value={q.negativeMarks} onChange={(e) => updateQuestion(index, { negativeMarks: Number(e.target.value) })} /></label></div>
        </article>)}</div>
      </div>}
      {step === 3 && <div className="review-grid"><div className="review-summary"><div className="section-heading"><div><p className="eyebrow-text">Step 3</p><h2>Ready to publish</h2></div><FileCheck2 /></div><div className="summary-list"><span><b>Title</b>{details.title}</span><span><b>Subject</b>{details.subject}</span><span><b>Batch</b>{details.batch}</span><span><b>Duration</b>{details.durationMinutes} minutes</span><span><b>Questions</b>{questions.length}</span><span><b>Total marks</b>{totalMarks}</span></div></div><div className="settings-panel"><h3>Exam behaviour</h3>{[
        ['shuffleQuestions', 'Shuffle question order'], ['shuffleOptions', 'Shuffle answer options'], ['negativeMarking', 'Enable negative marking'], ['showResultImmediately', 'Show results immediately']
      ].map(([key, label]) => <label className="switch-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(details[key as keyof typeof details])} onChange={(e) => setDetails({ ...details, [key]: e.target.checked })} /><i /></label>)}<label>Pass percentage<input type="number" min="0" max="100" value={details.passPercentage} onChange={(e) => setDetails({ ...details, passPercentage: Number(e.target.value) })} /></label></div></div>}
      <div className="builder-footer"><button className="secondary-button" disabled={step === 1} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={17} />Previous</button>{step < 3 ? <button className="primary-button" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>Continue<ArrowRight size={17} /></button> : <button className="primary-button" disabled={loading || !canContinue} onClick={() => void create()}>{loading ? 'Publishing…' : 'Publish examination'}<FileCheck2 size={17} /></button>}</div>
    </section>
  </div>;
};
