import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, BookOpenCheck, ClipboardList, GraduationCap, LayoutDashboard,
  LogOut, Menu, Moon, ShieldCheck, Sun, Users, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const roleLabels = { student: 'Student', teacher: 'Teacher', super_admin: 'Super Admin' };

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const links = user.role === 'student'
    ? [
        { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/student/results', label: 'My results', icon: BarChart3 }
      ]
    : user.role === 'teacher'
      ? [
          { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/teacher/exams/new', label: 'Create exam', icon: BookOpenCheck }
        ]
      : [
          { to: '/admin', label: 'Overview', icon: ShieldCheck },
          { to: '/admin/exams', label: 'All exams', icon: ClipboardList },
          { to: '/admin/users', label: 'Users', icon: Users }
        ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><GraduationCap size={24} /></div>
          <div><strong>Elevate</strong><span>Exam Cloud</span></div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="profile-card">
          <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div>
        </div>
        <nav className="side-nav">
          <p className="nav-caption">Workspace</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
          {user.role !== 'student' && (
            <div className="nav-hint"><ClipboardList size={18} /><span>Exam controls and monitoring are available inside each exam.</span></div>
          )}
        </nav>
        <div className="sidebar-footer">
          <button onClick={toggle}><span>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
          <button onClick={logout}><LogOut size={18} />Sign out</button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="topbar-copy"><p>Learning Management System</p><span>Secure exams. Clear insights.</span></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={toggle}>{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
            <div className="online-pill"><span />System online</div>
          </div>
        </header>
        <div className="page-wrap"><Outlet /></div>
      </main>
    </div>
  );
};
