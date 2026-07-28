import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { Result } from '../models/Result.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

export const dashboardRouter = Router();
dashboardRouter.use(auth);

dashboardRouter.get('/', async (req, res) => {
  if (req.user!.role === 'student') {
    const [activeExams, completed, results] = await Promise.all([
      Exam.countDocuments({ batch: req.user!.batch, status: { $in: ['published', 'live'] } }),
      Attempt.countDocuments({ student: req.user!._id, status: 'submitted' }),
      Result.find({ student: req.user!._id, published: true }).sort({ createdAt: -1 }).limit(10).lean()
    ]);
    const average = results.length ? Number((results.reduce((sum, item) => sum + (item.percentage ?? 0), 0) / results.length).toFixed(1)) : 0;
    return res.json({ activeExams, completed, average, latestResult: results[0] ?? null });
  }

  if (req.user!.role === 'teacher') {
    const exams = await Exam.find({ createdBy: req.user!._id }).select('_id').lean();
    const ids = exams.map((exam) => exam._id);
    const [totalExams, liveExams, attempts, submissions, resultAgg] = await Promise.all([
      Exam.countDocuments({ createdBy: req.user!._id }),
      Exam.countDocuments({ createdBy: req.user!._id, status: 'live' }),
      Attempt.countDocuments({ exam: { $in: ids } }),
      Attempt.countDocuments({ exam: { $in: ids }, status: 'submitted' }),
      Result.aggregate([{ $match: { exam: { $in: ids } } }, { $group: { _id: null, average: { $avg: '$percentage' } } }])
    ]);
    return res.json({ totalExams, liveExams, attempts, submissions, average: Number((resultAgg[0]?.average ?? 0).toFixed(1)) });
  }

  const [students, teachers, exams, liveExams, attempts, recentLogs] = await Promise.all([
    User.countDocuments({ role: 'student', active: true }),
    User.countDocuments({ role: 'teacher', active: true }),
    Exam.countDocuments(),
    Exam.countDocuments({ status: 'live' }),
    Attempt.countDocuments(),
    AuditLog.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'name role').lean()
  ]);
  res.json({ students, teachers, exams, liveExams, attempts, recentLogs });
});
