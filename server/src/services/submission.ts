import mongoose from 'mongoose';
import { Answer } from '../models/Answer.js';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { Result } from '../models/Result.js';
import { sameSet } from '../utils.js';

export const submitAttempt = async (attemptId: string) => {
  const existingResult = await Result.findOne({ attempt: attemptId });
  if (existingResult) return existingResult;

  const attempt = await Attempt.findOneAndUpdate(
    { _id: attemptId, status: 'in_progress' },
    { $set: { status: 'submitting' } },
    { new: true }
  );

  if (!attempt) {
    const retryResult = await Result.findOne({ attempt: attemptId });
    if (retryResult) return retryResult;
    throw new Error('Attempt is already being submitted or is unavailable');
  }

  try {
    const [exam, questions, answers] = await Promise.all([
      Exam.findById(attempt.exam),
      Question.find({ exam: attempt.exam }).lean(),
      Answer.find({ attempt: attempt._id }).lean()
    ]);
    if (!exam) throw new Error('Exam not found');

    const answerMap = new Map(answers.map((answer) => [answer.question.toString(), answer]));
    let obtainedMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let attemptedQuestions = 0;

    for (const question of questions) {
      const answer = answerMap.get(question._id.toString());
      const selected = answer?.selectedOptionIds ?? [];
      if (selected.length === 0) continue;
      attemptedQuestions += 1;
      if (sameSet(selected, question.correctOptionIds)) {
        correctAnswers += 1;
        obtainedMarks += question.marks;
      } else {
        incorrectAnswers += 1;
        if (exam.negativeMarking) obtainedMarks -= question.negativeMarks;
      }
    }

    obtainedMarks = Math.max(0, Number(obtainedMarks.toFixed(2)));
    const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
    const result = await Result.create({
      attempt: attempt._id,
      exam: attempt.exam,
      student: attempt.student,
      totalQuestions: questions.length,
      attemptedQuestions,
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions: questions.length - attemptedQuestions,
      totalMarks,
      obtainedMarks,
      percentage,
      status: percentage >= exam.passPercentage ? 'pass' : 'fail',
      published: exam.showResultImmediately
    });

    await Attempt.updateOne({ _id: attempt._id }, { $set: { status: 'submitted', submittedAt: new Date(), answeredCount: attemptedQuestions } });

    const higherScores = await Result.countDocuments({ exam: attempt.exam, obtainedMarks: { $gt: obtainedMarks } });
    const totalCandidates = await Result.countDocuments({ exam: attempt.exam });
    result.rank = higherScores + 1;
    result.percentile = totalCandidates > 0 ? Number((((totalCandidates - higherScores) / totalCandidates) * 100).toFixed(2)) : 100;
    await result.save();
    return result;
  } catch (error) {
    await Attempt.updateOne({ _id: new mongoose.Types.ObjectId(attemptId), status: 'submitting' }, { $set: { status: 'in_progress' } });
    throw error;
  }
};
