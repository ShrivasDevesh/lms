import mongoose, { Schema } from 'mongoose';

const answerSchema = new Schema({
  attempt: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true, index: true },
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptionIds: [{ type: String }],
  markedForReview: { type: Boolean, default: false },
  isAnswered: { type: Boolean, default: false, index: true },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

answerSchema.index({ attempt: 1, question: 1 }, { unique: true });
answerSchema.index({ attempt: 1, isAnswered: 1 });
export const Answer = mongoose.model('Answer', answerSchema);
