import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bookmark, Check, ChevronLeft, ChevronRight, Clock3, Cloud, CloudOff, Flag, Send } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import type { Attempt, Exam, SafeQuestion } from '../../types';

interface AnswerState { selectedOptionIds: string[]; markedForReview: boolean; savedAt?: string }

export const ExamPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/attempts/${attemptId}`);
        setExam(data.exam); setAttempt(data.attempt); setQuestions(data.questions);
        const map: Record<string, AnswerState> = {};
        data.answers.forEach((answer: any) => { map[answer.question] = { selectedOptionIds: answer.selectedOptionIds, markedForReview: answer.markedForReview, savedAt: answer.savedAt }; });
        setAnswers(map);
        setSecondsLeft(Math.max(0, Math.floor((new Date(data.attempt.expiresAt).getTime() - Date.now()) / 1000)));
      } catch (err) { setError(getErrorMessage(err)); }
    };
    void load();
  }, [attemptId]);

  const submit = useCallback(async (automatic = false) => {
    if (!attemptId || submittedRef.current) return;
    if (!automatic) {
      const unanswered = questions.filter((q) => !(answers[q.id]?.selectedOptionIds.length)).length;
      if (!window.confirm(`Submit your exam now? ${unanswered} question${unanswered === 1 ? '' : 's'} unanswered.`)) return;
    }
    try {
      submittedRef.current = true; setSubmitting(true); setError('');
      await api.post(`/attempts/${attemptId}/submit`);
      navigate('/student/results', { replace: true });
    } catch (err) {
      submittedRef.current = false; setError(getErrorMessage(err));
    } finally { setSubmitting(false); }
  }, [answers, attemptId, navigate, questions]);

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) void submit(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, submit]);

  useEffect(() => {
    if (!attemptId) return;
    const heartbeat = window.setInterval(() => { void api.post(`/attempts/${attemptId}/heartbeat`).catch(() => undefined); }, 20_000);
    const onVisibility = () => { if (document.hidden) void api.post(`/attempts/${attemptId}/heartbeat`, { warning: true }).catch(() => undefined); };
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.clearInterval(heartbeat); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [attemptId]);

  const save = async (questionId: string, state: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [questionId]: state }));
    try {
      setSaving(true); setError('');
      const { data } = await api.put(`/attempts/${attemptId}/answers/${questionId}`, state);
      setAnswers((prev) => ({ ...prev, [questionId]: { ...state, savedAt: data.savedAt } }));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const selectOption = (question: SafeQuestion, optionId: string) => {
    const existing = answers[question.id] ?? { selectedOptionIds: [], markedForReview: false };
    const selected = question.type === 'single'
      ? [optionId]
      : existing.selectedOptionIds.includes(optionId)
        ? existing.selectedOptionIds.filter((id) => id !== optionId)
        : [...existing.selectedOptionIds, optionId];
    void save(question.id, { ...existing, selectedOptionIds: selected });
  };

  const currentQuestion = questions[current];
  const progress = questions.length ? Math.round((Object.values(answers).filter((a) => a.selectedOptionIds.length > 0).length / questions.length) * 100) : 0;
  const formattedTime = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600); const m = Math.floor((secondsLeft % 3600) / 60); const s = secondsLeft % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }, [secondsLeft]);

  if (!exam || !attempt || !currentQuestion) return <div className="exam-loading">{error || 'Preparing your secure examination…'}</div>;

  return (
    <div className="exam-shell">
      <header className="exam-header">
        <div><span className="subject-chip">{exam.subject}</span><h1>{exam.title}</h1></div>
        <div className="exam-header-status"><div className={`save-state ${online ? '' : 'offline'}`}>{online ? <Cloud size={17} /> : <CloudOff size={17} />}{online ? (saving ? 'Saving…' : 'Saved securely') : 'Offline'}</div><div className={`timer-box ${secondsLeft < 300 ? 'timer-danger' : ''}`}><Clock3 size={19} /><span>{formattedTime}</span></div></div>
      </header>
      <div className="exam-progress"><span style={{ width: `${progress}%` }} /></div>
      {error && <div className="alert error-alert exam-alert">{error}</div>}
      <div className="exam-layout">
        <main className="question-panel">
          <div className="question-heading"><div><span>Question {current + 1} of {questions.length}</span><strong>{currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}</strong></div><button className={answers[currentQuestion.id]?.markedForReview ? 'review-active' : ''} onClick={() => void save(currentQuestion.id, { selectedOptionIds: answers[currentQuestion.id]?.selectedOptionIds ?? [], markedForReview: !answers[currentQuestion.id]?.markedForReview })}><Bookmark size={17} />Mark for review</button></div>
          <h2>{currentQuestion.prompt}</h2>
          {currentQuestion.type === 'multiple' && <p className="multiple-note">Select all correct options.</p>}
          <div className="option-list">
            {currentQuestion.options.map((option, index) => {
              const selected = answers[currentQuestion.id]?.selectedOptionIds.includes(option.optionId);
              return <button key={option.optionId} className={`answer-option ${selected ? 'selected' : ''}`} onClick={() => selectOption(currentQuestion, option.optionId)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option.text}</span>{selected && <Check size={19} />}</button>;
            })}
          </div>
          <div className="question-actions"><button className="secondary-button" disabled={current === 0} onClick={() => setCurrent((v) => v - 1)}><ChevronLeft size={18} />Previous</button><button className="primary-button" onClick={() => current === questions.length - 1 ? void submit() : setCurrent((v) => v + 1)}>{current === questions.length - 1 ? <>Submit exam<Send size={17} /></> : <>Save & next<ChevronRight size={18} /></>}</button></div>
        </main>
        <aside className="question-navigator">
          <div className="navigator-heading"><h3>Question navigator</h3><span>{progress}% complete</span></div>
          <div className="question-grid">
            {questions.map((question, index) => {
              const answer = answers[question.id];
              const state = answer?.markedForReview ? 'review' : answer?.selectedOptionIds.length ? 'answered' : 'unanswered';
              return <button key={question.id} className={`${state} ${index === current ? 'current' : ''}`} onClick={() => setCurrent(index)}>{index + 1}{answer?.markedForReview && <Flag size={10} />}</button>;
            })}
          </div>
          <div className="legend"><span><i className="answered" />Answered</span><span><i className="review" />Review</span><span><i className="unanswered" />Unanswered</span></div>
          <div className="exam-warning"><AlertTriangle size={18} /><p>Leaving full-screen or switching tabs is recorded in the exam audit log.</p></div>
          <button className="danger-button" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting…' : 'Finish examination'}</button>
        </aside>
      </div>
    </div>
  );
};
