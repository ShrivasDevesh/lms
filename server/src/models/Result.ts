import mongoose, { Schema } from 'mongoose';

const resultSchema = new Schema({
  attempt: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true, unique: true },
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  totalQuestions: Number,
  attemptedQuestions: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  unansweredQuestions: Number,
  totalMarks: Number,
  obtainedMarks: Number,
  percentage: Number,
  status: { type: String, enum: ['pass', 'fail'], index: true },
  rank: Number,
  percentile: Number,
  published: { type: Boolean, default: true, index: true }
}, { timestamps: true });

resultSchema.index({ exam: 1, obtainedMarks: -1, createdAt: 1 });
resultSchema.index({ student: 1, createdAt: -1 });
export const Result = mongoose.model('Result', resultSchema);
