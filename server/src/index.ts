import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

const start = async () => {
  await mongoose.connect(config.MONGODB_URI, { maxPoolSize: 100, minPoolSize: 5, serverSelectionTimeoutMS: 10_000 });
  console.log('MongoDB connected');
  app.listen(config.PORT, () => console.log(`LMS API running on http://localhost:${config.PORT}`));
};

start().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
