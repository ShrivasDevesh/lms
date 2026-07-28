import mongoose, { Schema } from 'mongoose';

const snapshotSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  optionOrder: [{ type: String }]
}, { _id: false });

const attemptSchema = new Schema({
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['in_progress', 'submitting', 'submitted', 'expired', 'cancelled'], default: 'in_progress', index: true },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true },
  submittedAt: Date,
  questionSnapshots: { type: [snapshotSchema], default: [] },
  answeredCount: { type: Number, default: 0 },
  lastSavedAt: Date,
  warningCount: { type: Number, default: 0 },
  disconnectCount: { type: Number, default: 0 },
  clientMeta: {
    userAgent: String,
    ip: String
  }
}, { timestamps: true });

attemptSchema.index({ exam: 1, student: 1 }, { unique: true });
attemptSchema.index({ exam: 1, status: 1, updatedAt: -1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
