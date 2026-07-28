import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'teacher', 'student'], required: true, index: true },
  studentCode: { type: String, trim: true },
  batch: { type: String, trim: true, index: true },
  subjects: [{ type: String, trim: true }],
  active: { type: Boolean, default: true, index: true },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.index({ role: 1, batch: 1, active: 1 });

export type IUser = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model('User', userSchema);
