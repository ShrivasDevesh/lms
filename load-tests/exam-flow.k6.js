import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    candidates: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 250 },
        { duration: '3m', target: 1000 },
        { duration: '10m', target: 1000 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750'],
    checks: ['rate>0.99']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';
const PASSWORD = __ENV.STUDENT_PASSWORD || 'LoadTest@123';
const EXAM_ID = __ENV.EXAM_ID;

export default function () {
  const studentNumber = (__VU % 1000) + 1;
  const login = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `load.student.${studentNumber}@lms.dev`,
    password: PASSWORD
  }), { headers: { 'Content-Type': 'application/json' } });

  check(login, { 'login succeeds': (response) => response.status === 200 });
  if (login.status !== 200 || !EXAM_ID) return;

  const token = login.json('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const started = http.post(`${BASE_URL}/attempts/start/${EXAM_ID}`, null, { headers });
  check(started, { 'exam starts': (response) => response.status === 200 });
  if (started.status !== 200) return;

  const attemptId = started.json('attemptId');
  const attempt = http.get(`${BASE_URL}/attempts/${attemptId}`, { headers });
  check(attempt, { 'attempt loads': (response) => response.status === 200 });
  const questions = attempt.json('questions') || [];

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const option = question.options?.[0]?.optionId;
    if (!option) continue;
    const saved = http.put(`${BASE_URL}/attempts/${attemptId}/answers/${question.id}`, JSON.stringify({
      selectedOptionIds: [option],
      markedForReview: false
    }), { headers });
    check(saved, { 'answer autosaves': (response) => response.status === 200 });
    sleep(0.5 + Math.random());
  }

  const submitted = http.post(`${BASE_URL}/attempts/${attemptId}/submit`, null, { headers });
  check(submitted, { 'exam submits': (response) => response.status === 200 });
}
