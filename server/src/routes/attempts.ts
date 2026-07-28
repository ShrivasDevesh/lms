import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { auth, allow } from '../middleware/auth.js';
import { Answer } from '../models/Answer.js';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { canManageExam } from '../services/examAccess.js';
import { submitAttempt } from '../services/submission.js';
import { logAudit, shuffle } from '../utils.js';

export const attemptsRouter = Router();
attemptsRouter.use(auth);

attemptsRouter.post('/start/:examId', allow('student'), async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  const assigned = exam.batch === req.user!.batch || exam.assignedStudents.some((id) => id.toString() === req.user!._id.toString());
  if (!assigned) return res.status(403).json({ message: 'This exam is not assigned to you' });
  if (!['published', 'live'].includes(exam.status)) return res.status(409).json({ message: 'This exam is not currently available' });
  const now = new Date();
  if (now < exam.startAt && exam.status !== 'live') return res.status(409).json({ message: 'The exam has not started yet' });
  if (now > exam.endAt) return res.status(409).json({ message: 'The exam window has ended' });

  let attempt = await Attempt.findOne({ exam: exam._id, student: req.user!._id });
  if (!attempt) {
    const questions = await Question.find({ exam: exam._id }).sort({ order: 1 }).lean();
    const ordered = exam.shuffleQuestions ? shuffle(questions) : questions;
    const questionSnapshots = ordered.map((question) => ({
      questionId: question._id,
      optionOrder: (exam.shuffleOptions ? shuffle(question.options) : question.options).map((option) => option.optionId)
    }));
    const naturalExpiry = new Date(now.getTime() + exam.durationMinutes * 60_000);
    const expiresAt = naturalExpiry < exam.endAt ? naturalExpiry : exam.endAt;
    attempt = await Attempt.create({
      exam: exam._id,
      student: req.user!._id,
      startedAt: now,
      expiresAt,
      questionSnapshots,
      clientMeta: { userAgent: req.headers['user-agent'], ip: req.ip }
    });
  }
  res.json({ attemptId: attempt._id, status: attempt.status });
});

attemptsRouter.get('/:id', allow('student'), async (req, res) => {
  const attempt = await Attempt.findOne({ _id: req.params.id, student: req.user!._id }).lean();
  if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
  const exam = await Exam.findById(attempt.exam).lean();
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  const questionIds = attempt.questionSnapshots.map((item) => item.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
  const safeQuestions = attempt.questionSnapshots.map((snapshot, index) => {
    const question = questionMap.get(snapshot.questionId.toString());
    if (!question) return null;
    const optionMap = new Map(question.options.map((option) => [option.optionId, option]));
    return {
      id: question._id,
      number: index + 1,
      type: question.type,
      prompt: question.prompt,
      marks: question.marks,
      options: snapshot.optionOrder.map((id) => optionMap.get(id)).filter(Boolean)
    };
  }).filter(Boolean);
  const answers = await Answer.find({ attempt: attempt._id }).select('question selectedOptionIds markedForReview savedAt').lean();
  res.json({ exam, attempt, questions: safeQuestions, answers });
});

const answerSchema = z.object({ selectedOptionIds: z.array(z.string()).max(20), markedForReview: z.boolean().default(false) });

attemptsRouter.put('/:id/answers/:questionId', allow('student'), async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid answer' });
  const attempt = await Attempt.findOne({ _id: req.params.id, student: req.user!._id });
  if (!attempt || attempt.status !== 'in_progress') return res.status(409).json({ message: 'Attempt is not active' });
  if (new Date() > attempt.expiresAt) return res.status(409).json({ message: 'Time has expired. Submit the exam.' });
  const isQuestionInAttempt = attempt.questionSnapshots.some((item) => item.questionId.toString() === req.params.questionId);
  if (!isQuestionInAttempt) return res.status(400).json({ message: 'Question does not belong to this attempt' });

  const answer = await Answer.findOneAndUpdate(
    { attempt: attempt._id, question: req.params.questionId },
    {
      $set: {
        exam: attempt.exam,
        student: attempt.student,
        selectedOptionIds: parsed.data.selectedOptionIds,
        markedForReview: parsed.data.markedForReview,
        isAnswered: parsed.data.selectedOptionIds.length > 0,
        savedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const answeredCount = await Answer.countDocuments({ attempt: attempt._id, isAnswered: true });
  await Attempt.updateOne({ _id: attempt._id }, { $set: { answeredCount, lastSavedAt: new Date() } });
  res.json({ answer, answeredCount, savedAt: answer.savedAt });
});

attemptsRouter.post('/:id/heartbeat', allow('student'), async (req, res) => {
  const update: Record<string, unknown> = { $set: { updatedAt: new Date() } };
  if (req.body.warning) update.$inc = { warningCount: 1 };
  await Attempt.updateOne({ _id: req.params.id, student: req.user!._id, status: 'in_progress' }, update);
  res.status(204).end();
});

attemptsRouter.post('/:id/submit', allow('student'), async (req, res) => {
  const owned = await Attempt.exists({ _id: req.params.id, student: req.user!._id });
  if (!owned) return res.status(404).json({ message: 'Attempt not found' });
  try {
    const result = await submitAttempt(req.params.id);
    res.json({ result });
  } catch (error) {
    res.status(409).json({ message: error instanceof Error ? error.message : 'Unable to submit exam' });
  }
});

attemptsRouter.patch('/:id/extend', allow('teacher', 'super_admin'), async (req, res) => {
  const minutes = z.coerce.number().min(1).max(180).safeParse(req.body.minutes);
  if (!minutes.success) return res.status(400).json({ message: 'Enter extension minutes between 1 and 180' });
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
  const exam = await canManageExam(req, attempt.exam.toString());
  if (!exam) return res.status(403).json({ message: 'Access denied' });
  attempt.expiresAt = new Date(attempt.expiresAt.getTime() + minutes.data * 60_000);
  await attempt.save();
  await logAudit(req, 'attempt.extended', 'Attempt', attempt._id, { minutes: minutes.data });
  res.json({ attempt });
});

attemptsRouter.post('/:id/force-submit', allow('teacher', 'super_admin'), async (req, res) => {
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
  const exam = await canManageExam(req, attempt.exam.toString());
  if (!exam) return res.status(403).json({ message: 'Access denied' });
  const result = await submitAttempt(attempt._id.toString());
  await logAudit(req, 'attempt.force_submitted', 'Attempt', attempt._id);
  res.json({ result });
});
