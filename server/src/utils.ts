import type { Request } from 'express';
import { AuditLog } from './models/AuditLog.js';

export const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
};

export const logAudit = async (req: Request, action: string, entityType: string, entityId?: unknown, metadata?: unknown) => {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      action,
      entityType,
      entityId,
      metadata,
      ip: req.ip
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};
