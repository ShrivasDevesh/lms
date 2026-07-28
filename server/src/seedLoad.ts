import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';

const count = Number(process.env.LOAD_TEST_USERS ?? 1000);
const batch = process.env.LOAD_TEST_BATCH ?? 'CSE-2026-A';
const password = process.env.LOAD_TEST_PASSWORD ?? 'LoadTest@123';

const run = async () => {
  if (!Number.isInteger(count) || count < 1 || count > 10_000) {
    throw new Error('LOAD_TEST_USERS must be between 1 and 10000');
  }
  await mongoose.connect(config.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  const operations = Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      updateOne: {
        filter: { email: `load.student.${number}@lms.dev` },
        update: {
          $set: {
            name: `Load Student ${number}`,
            passwordHash,
            role: 'student' as const,
            studentCode: `LOAD-${String(number).padStart(4, '0')}`,
            batch,
            active: true
          }
        },
        upsert: true
      }
    };
  });
  const result = await User.bulkWrite(operations, { ordered: false });
  console.log(`Load-test users ready: ${count}`);
  console.log(`Batch: ${batch}`);
  console.log(`Upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
