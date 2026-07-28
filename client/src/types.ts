export type Role = 'super_admin' | 'teacher' | 'student';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  batch?: string;
  studentCode?: string;
  active?: boolean;
  subjects?: string[];
}

export interface Exam {
  _id: string;
  title: string;
  description: string;
  subject: string;
  course: string;
  batch: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  status: 'draft' | 'published' | 'live' | 'completed' | 'cancelled';
  totalMarks: number;
  passPercentage: number;
  instructions: string[];
  showResultImmediately: boolean;
  attempt?: Attempt;
  metrics?: Record<string, number>;
}

export interface Attempt {
  _id: string;
  exam: string;
  status: 'in_progress' | 'submitting' | 'submitted' | 'expired' | 'cancelled';
  startedAt: string;
  expiresAt: string;
  answeredCount: number;
  lastSavedAt?: string;
  warningCount: number;
  updatedAt: string;
}

export interface QuestionOption { optionId: string; text: string }
export interface SafeQuestion {
  id: string;
  number: number;
  type: 'single' | 'multiple';
  prompt: string;
  marks: number;
  options: QuestionOption[];
}

export interface Result {
  _id: string;
  exam: Exam;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  status: 'pass' | 'fail';
  rank?: number;
  percentile?: number;
  createdAt: string;
  student?: User;
}
