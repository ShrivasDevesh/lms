import type { IUser } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'batch' | 'studentCode' | 'subjects' | 'active'>;
    }
  }
}

export {};
