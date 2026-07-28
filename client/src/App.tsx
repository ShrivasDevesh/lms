import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ExamPage } from './pages/student/ExamPage';
import { ResultsPage } from './pages/student/ResultsPage';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { ExamBuilderPage } from './pages/teacher/ExamBuilderPage';
import { MonitorPage } from './pages/teacher/MonitorPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersPage } from './pages/admin/UsersPage';
import { AdminExamsPage } from './pages/admin/AdminExamsPage';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'student' ? '/student' : user.role === 'teacher' ? '/teacher' : '/admin'} replace />;
};

export const App = () => <Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<ProtectedRoute roles={['student']} />}><Route path="/student" element={<StudentDashboard />} /><Route path="/student/results" element={<ResultsPage />} /></Route>
      <Route element={<ProtectedRoute roles={['teacher']} />}><Route path="/teacher" element={<TeacherDashboard />} /><Route path="/teacher/exams/new" element={<ExamBuilderPage />} /><Route path="/teacher/exams/:examId/monitor" element={<MonitorPage />} /></Route>
      <Route element={<ProtectedRoute roles={['super_admin']} />}><Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/exams" element={<AdminExamsPage />} /><Route path="/admin/exams/:examId/monitor" element={<MonitorPage />} /><Route path="/admin/users" element={<UsersPage />} /></Route>
    </Route>
    <Route element={<ProtectedRoute roles={['student']} />}><Route path="/student/exam/:attemptId" element={<ExamPage />} /></Route>
  </Route>
  <Route path="*" element={<HomeRedirect />} />
</Routes>;
