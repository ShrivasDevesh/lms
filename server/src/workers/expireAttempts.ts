import mongoose from 'mongoose';
import { config } from '../config.js';
import { Attempt } from '../models/Attempt.js';
import { submitAttempt } from '../services/submission.js';

const POLL_MS = 5_000;
const BATCH_SIZE = 25;
let running = false;

const processExpiredAttempts = async () => {
  if (running) return;
  running = true;
  try {
    const attempts = await Attempt.find({
      status: 'in_progress',
      expiresAt: { $lte: new Date() }
    }).select('_id').sort({ expiresAt: 1 }).limit(BATCH_SIZE).lean();

    await Promise.allSettled(attempts.map((attempt) => submitAttempt(attempt._id.toString())));
    if (attempts.length > 0) console.log(`Auto-submitted ${attempts.length} expired attempt(s)`);
  } catch (error) {
    console.error('Expiry worker error:', error);
  } finally {
    running = false;
  }
};

const start = async () => {
  await mongoose.connect(config.MONGODB_URI, { maxPoolSize: 25, minPoolSize: 2 });
  console.log('Expiry worker connected');
  await processExpiredAttempts();
  setInterval(() => void processExpiredAttempts(), POLL_MS);
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
