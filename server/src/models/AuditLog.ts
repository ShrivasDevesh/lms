import mongoose, { Schema } from 'mongoose';

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  metadata: { type: Schema.Types.Mixed },
  ip: String
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
