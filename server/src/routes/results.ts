import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { Exam } from '../models/Exam.js';
import { Result } from '../models/Result.js';
import { User } from '../models/User.js';
import { canManageExam } from '../services/examAccess.js';
import { streamResultPdf } from '../services/pdf.js';

export const resultsRouter = Router();
resultsRouter.use(auth);

resultsRouter.get('/mine', allow('student'), async (req, res) => {
  const results = await Result.find({ student: req.user!._id, published: true })
    .populate('exam', 'title subject course batch startAt durationMinutes')
    .sort({ createdAt: -1 }).lean();
  res.json({ results });
});

resultsRouter.get('/exam/:examId', allow('teacher', 'super_admin'), async (req, res) => {
  const exam = await canManageExam(req, String(req.params.examId));
  if (!exam) return res.status(404).json({ message: 'Exam not found or access denied' });
  const results = await Result.find({ exam: exam._id }).populate('student', 'name email studentCode batch').sort({ obtainedMarks: -1 }).lean();
  res.json({ exam, results });
});

resultsRouter.get('/:id/pdf', async (req, res) => {
  const result = await Result.findById(req.params.id).lean();
  if (!result) return res.status(404).json({ message: 'Result not found' });
  if (req.user!.role === 'student' && result.student.toString() !== req.user!._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const [student, exam] = await Promise.all([User.findById(result.student).lean(), Exam.findById(result.exam).lean()]);
  if (!student || !exam) return res.status(404).json({ message: 'Result data is incomplete' });
  if (req.user!.role === 'teacher' && exam.createdBy.toString() !== req.user!._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }
  streamResultPdf({ result, student, exam }, res);
});
