import mongoose, { Schema } from 'mongoose';

const examSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subject: { type: String, required: true, trim: true, index: true },
  course: { type: String, required: true, trim: true },
  batch: { type: String, required: true, trim: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 480 },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'published', 'live', 'completed', 'cancelled'], default: 'draft', index: true },
  instructions: [{ type: String }],
  totalMarks: { type: Number, default: 0 },
  passPercentage: { type: Number, default: 40, min: 0, max: 100 },
  negativeMarking: { type: Boolean, default: false },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: true },
  showResultImmediately: { type: Boolean, default: true },
  allowedAttempts: { type: Number, default: 1, min: 1, max: 5 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

examSchema.index({ batch: 1, status: 1, startAt: 1 });
examSchema.index({ createdBy: 1, status: 1, startAt: -1 });

export const Exam = mongoose.model('Exam', examSchema);
