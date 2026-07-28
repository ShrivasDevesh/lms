import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { examsRouter } from './routes/exams.js';
import { attemptsRouter } from './routes/attempts.js';
import { resultsRouter } from './routes/results.js';
import { dashboardRouter } from './routes/dashboard.js';

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/exams', examsRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/results', resultsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(500).json({ message });
});
