import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, allow } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { logAudit } from '../utils.js';

export const usersRouter = Router();
usersRouter.use(auth, allow('super_admin'));

usersRouter.get('/', async (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const query = role ? { role } : {};
  const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['super_admin', 'teacher', 'student']),
  studentCode: z.string().optional(),
  batch: z.string().optional(),
  subjects: z.array(z.string()).optional()
});

usersRouter.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid user data' });
  const exists = await User.exists({ email: parsed.data.email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'A user with this email already exists' });

  const user = await User.create({
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    passwordHash: await bcrypt.hash(parsed.data.password, 12)
  });
  await logAudit(req, 'user.created', 'User', user._id, { role: user.role });
  res.status(201).json({ user: { ...user.toObject(), passwordHash: undefined } });
});

usersRouter.patch('/:id/status', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { active: Boolean(req.body.active) }, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  await logAudit(req, 'user.status_changed', 'User', user._id, { active: user.active });
  res.json({ user });
});
