import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';
import { Exam } from './models/Exam.js';
import { Question } from './models/Question.js';
import { Attempt } from './models/Attempt.js';
import { Answer } from './models/Answer.js';
import { Result } from './models/Result.js';
import { AuditLog } from './models/AuditLog.js';

const seed = async () => {
  await mongoose.connect(config.MONGODB_URI);
  await Promise.all([
    User.deleteMany({}), Exam.deleteMany({}), Question.deleteMany({}), Attempt.deleteMany({}),
    Answer.deleteMany({}), Result.deleteMany({}), AuditLog.deleteMany({})
  ]);
  const [admin, teacher, student] = await User.create([
    { name: 'Platform Admin', email: 'admin@lms.dev', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'super_admin', active: true },
    { name: 'Ananya Sharma', email: 'teacher@lms.dev', passwordHash: await bcrypt.hash('Teacher@123', 12), role: 'teacher', subjects: ['Java', 'Data Structures'], active: true },
    { name: 'Dev Student', email: 'student@lms.dev', passwordHash: await bcrypt.hash('Student@123', 12), role: 'student', studentCode: 'STU-1001', batch: 'CSE-2026-A', active: true }
  ]);
  const startAt = new Date(Date.now() - 15 * 60_000);
  const endAt = new Date(Date.now() + 24 * 60 * 60_000);
  const exam = await Exam.create({
    title: 'Java Fundamentals Assessment',
    description: 'Evaluate core Java syntax, OOP and collections knowledge.',
    subject: 'Java Programming',
    course: 'B.Tech CSE',
    batch: 'CSE-2026-A',
    durationMinutes: 45,
    startAt,
    endAt,
    status: 'live',
    instructions: ['The exam contains single-choice questions.', 'Answers are saved automatically.', 'Do not refresh unless your connection drops.'],
    totalMarks: 10,
    passPercentage: 40,
    negativeMarking: false,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: true,
    createdBy: teacher._id
  });
  await Question.insertMany([
    {
      exam: exam._id, order: 0, prompt: 'Which keyword is used to inherit a class in Java?', type: 'single', marks: 2,
      options: [{ optionId: 'a', text: 'implements' }, { optionId: 'b', text: 'extends' }, { optionId: 'c', text: 'inherits' }, { optionId: 'd', text: 'super' }],
      correctOptionIds: ['b'], explanation: 'The extends keyword creates class inheritance.'
    },
    {
      exam: exam._id, order: 1, prompt: 'Which collection does not allow duplicate values?', type: 'single', marks: 2,
      options: [{ optionId: 'a', text: 'List' }, { optionId: 'b', text: 'ArrayList' }, { optionId: 'c', text: 'Set' }, { optionId: 'd', text: 'Queue' }],
      correctOptionIds: ['c']
    },
    {
      exam: exam._id, order: 2, prompt: 'What is the default value of an instance boolean variable?', type: 'single', marks: 2,
      options: [{ optionId: 'a', text: 'true' }, { optionId: 'b', text: 'false' }, { optionId: 'c', text: 'null' }, { optionId: 'd', text: '0' }],
      correctOptionIds: ['b']
    },
    {
      exam: exam._id, order: 3, prompt: 'Which method is the entry point of a Java application?', type: 'single', marks: 2,
      options: [{ optionId: 'a', text: 'start()' }, { optionId: 'b', text: 'run()' }, { optionId: 'c', text: 'main()' }, { optionId: 'd', text: 'init()' }],
      correctOptionIds: ['c']
    },
    {
      exam: exam._id, order: 4, prompt: 'Which access modifier gives the widest visibility?', type: 'single', marks: 2,
      options: [{ optionId: 'a', text: 'private' }, { optionId: 'b', text: 'protected' }, { optionId: 'c', text: 'default' }, { optionId: 'd', text: 'public' }],
      correctOptionIds: ['d']
    }
  ]);
  console.log('Seed complete');
  console.log('Admin: admin@lms.dev / Admin@123');
  console.log('Teacher: teacher@lms.dev / Teacher@123');
  console.log('Student: student@lms.dev / Student@123');
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
