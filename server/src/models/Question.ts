import mongoose, { Schema } from 'mongoose';

const optionSchema = new Schema({
  optionId: { type: String, required: true },
  text: { type: String, required: true }
}, { _id: false });

const questionSchema = new Schema({
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  type: { type: String, enum: ['single', 'multiple'], default: 'single' },
  prompt: { type: String, required: true },
  options: { type: [optionSchema], validate: [(value: unknown[]) => value.length >= 2, 'At least two options are required'] },
  correctOptionIds: [{ type: String, required: true }],
  marks: { type: Number, default: 1, min: 0 },
  negativeMarks: { type: Number, default: 0, min: 0 },
  explanation: { type: String, default: '' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

questionSchema.index({ exam: 1, order: 1 });
export const Question = mongoose.model('Question', questionSchema);
