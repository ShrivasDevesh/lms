import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    const user = await User.findById(payload.sub).select('_id name email role batch active').lean();
    if (!user || !user.active) return res.status(401).json({ message: 'Account is unavailable' });
    req.user = user as NonNullable<Request['user']>;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
};

export const allow = (...roles: Array<'super_admin' | 'teacher' | 'student'>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    next();
  };
