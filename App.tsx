import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import TraineeDashboard from './pages/TraineeDashboard';
import Layout from './components/Layout';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  // Initialize theme state from localStorage to avoid flash of light mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('bd_theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply theme class and persist to storage whenever isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('bd_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('bd_theme', 'light');
    }
  }, [isDarkMode]);

  // Check session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('bd_session');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }
  }, []);

  const toggleTheme = () => {
      setIsDarkMode(prev => !prev);
  };

  const handleLogin = (u: User) => {
      setUser(u);
      localStorage.setItem('bd_session', JSON.stringify(u));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('bd_session');
  };

  if (!user) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
        {user.role === 'admin' && <AdminDashboard user={user} />}
        {user.role === 'trainer' && <TrainerDashboard user={user} />}
        {user.role === 'trainee' && <TraineeDashboard user={user} />}
    </Layout>
  );
}