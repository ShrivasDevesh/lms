import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password' });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase(), active: true });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }

  user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.JWT_SECRET, { expiresIn: '12h' });
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, batch: user.batch, studentCode: user.studentCode }
  });
});

authRouter.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});
