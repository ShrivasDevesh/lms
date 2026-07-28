import type { Request } from 'express';
import { Exam } from '../models/Exam.js';

export const canManageExam = async (req: Request, examId: string) => {
  const exam = await Exam.findById(examId);
  if (!exam || !req.user) return null;
  if (req.user.role === 'super_admin') return exam;
  if (req.user.role === 'teacher' && exam.createdBy.toString() === req.user._id.toString()) return exam;
  return null;
};
