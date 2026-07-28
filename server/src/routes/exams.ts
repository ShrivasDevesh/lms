import { Router } from 'express';
import { z } from 'zod';
import { auth, allow } from '../middleware/auth.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';
import { Result } from '../models/Result.js';
import { canManageExam } from '../services/examAccess.js';
import { logAudit } from '../utils.js';

export const examsRouter = Router();
examsRouter.use(auth);

examsRouter.get('/', async (req, res) => {
  if (!req.user) return res.status(401).end();
  if (req.user.role === 'student') {
    const exams = await Exam.find({
      $or: [{ batch: req.user.batch }, { assignedStudents: req.user._id }],
      status: { $in: ['published', 'live', 'completed'] }
    }).sort({ startAt: 1 }).lean();
    const attempts = await Attempt.find({ student: req.user._id, exam: { $in: exams.map((exam) => exam._id) } }).lean();
    const attemptByExam = new Map(attempts.map((attempt) => [attempt.exam.toString(), attempt]));
    return res.json({ exams: exams.map((exam) => ({ ...exam, attempt: attemptByExam.get(exam._id.toString()) })) });
  }

  const query = req.user.role === 'teacher' ? { createdBy: req.user._id } : {};
  const exams = await Exam.find(query).populate('createdBy', 'name email role').sort({ createdAt: -1 }).lean();
  const ids = exams.map((exam) => exam._id);
  const grouped = await Attempt.aggregate([
    { $match: { exam: { $in: ids } } },
    { $group: { _id: { exam: '$exam', status: '$status' }, count: { $sum: 1 } } }
  ]);
  const metrics = new Map<string, Record<string, number>>();
  for (const item of grouped) {
    const key = item._id.exam.toString();
    metrics.set(key, { ...(metrics.get(key) ?? {}), [item._id.status]: item.count });
  }
  res.json({ exams: exams.map((exam) => ({ ...exam, metrics: metrics.get(exam._id.toString()) ?? {} })) });
});

const examSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(''),
  subject: z.string().min(2),
  course: z.string().min(2),
  batch: z.string().min(1),
  durationMinutes: z.coerce.number().min(1).max(480),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  passPercentage: z.coerce.number().min(0).max(100).default(40),
  negativeMarking: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  showResultImmediately: z.boolean().default(true),
  instructions: z.array(z.string()).optional().default([])
});

examsRouter.post('/', allow('teacher', 'super_admin'), async (req, res) => {
  const parsed = examSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid exam data' });
  if (parsed.data.endAt <= parsed.data.startAt) return res.status(400).json({ message: 'End time must be after start time' });
  const exam = await Exam.create({ ...parsed.data, createdBy: req.user!._id });
  await logAudit(req, 'exam.created', 'Exam', exam._id);
  res.status(201).json({ exam });
});

examsRouter.get('/:id', async (req, res) => {
  const exam = await Exam.findById(req.params.id).lean();
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  if (req.user?.role !== 'student') {
    const questions = await Question.find({ exam: exam._id }).sort({ order: 1 }).lean();
    return res.json({ exam, questions });
  }
  const assigned = exam.batch === req.user.batch || exam.assignedStudents.some((id) => id.toString() === req.user!._id.toString());
  if (!assigned) return res.status(403).json({ message: 'This exam is not assigned to you' });
  res.json({ exam });
});

const questionSchema = z.object({
  prompt: z.string().min(3),
  type: z.enum(['single', 'multiple']).default('single'),
  options: z.array(z.object({ optionId: z.string().min(1), text: z.string().min(1) })).min(2),
  correctOptionIds: z.array(z.string()).min(1),
  marks: z.coerce.number().min(0).default(1),
  negativeMarks: z.coerce.number().min(0).default(0),
  explanation: z.string().optional().default('')
});

examsRouter.post('/:id/questions', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  if (exam.status !== 'draft') return res.status(409).json({ message: 'Questions can only be edited while the exam is a draft' });
  const parsed = z.array(questionSchema).min(1).safeParse(req.body.questions);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid questions' });

  await Question.deleteMany({ exam: exam._id });
  const questions = await Question.insertMany(parsed.data.map((question, order) => ({ ...question, exam: exam._id, order })));
  exam.totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  await exam.save();
  await logAudit(req, 'exam.questions_replaced', 'Exam', exam._id, { count: questions.length });
  res.status(201).json({ questions, totalMarks: exam.totalMarks });
});

examsRouter.post('/:id/publish', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  const questionCount = await Question.countDocuments({ exam: exam._id });
  if (questionCount === 0) return res.status(409).json({ message: 'Add at least one question before publishing' });
  exam.status = 'published';
  await exam.save();
  await logAudit(req, 'exam.published', 'Exam', exam._id);
  res.json({ exam });
});

examsRouter.post('/:id/live', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  exam.status = 'live';
  if (req.body.startNow) exam.startAt = new Date();
  await exam.save();
  await logAudit(req, 'exam.started', 'Exam', exam._id);
  res.json({ exam });
});

examsRouter.post('/:id/end', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  exam.status = 'completed';
  exam.endAt = new Date();
  await exam.save();
  await logAudit(req, 'exam.ended', 'Exam', exam._id);
  res.json({ exam });
});

examsRouter.get('/:id/monitor', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  const [students, questionCount] = await Promise.all([User.find({ role: 'student', $or: [{ batch: exam.batch }, { _id: { $in: exam.assignedStudents } }] })
    .select('name email studentCode batch').lean(), Question.countDocuments({ exam: exam._id })]);
  const attempts = await Attempt.find({ exam: exam._id }).lean();
  const results = await Result.find({ exam: exam._id }).lean();
  const attemptMap = new Map(attempts.map((attempt) => [attempt.student.toString(), attempt]));
  const resultMap = new Map(results.map((result) => [result.student.toString(), result]));
  const candidates = students.map((student) => ({
    ...student,
    attempt: attemptMap.get(student._id.toString()),
    result: resultMap.get(student._id.toString())
  }));
  const now = Date.now();
  const onlineWindow = 45_000;
  res.json({
    exam,
    summary: {
      assigned: students.length,
      online: attempts.filter((attempt) => attempt.status === 'in_progress' && now - new Date(attempt.updatedAt).getTime() < onlineWindow).length,
      started: attempts.length,
      submitted: attempts.filter((attempt) => attempt.status === 'submitted').length,
      disconnected: attempts.filter((attempt) => attempt.status === 'in_progress' && now - new Date(attempt.updatedAt).getTime() >= onlineWindow).length,
      notStarted: Math.max(0, students.length - attempts.length),
      questionCount
    },
    candidates
  });
});
