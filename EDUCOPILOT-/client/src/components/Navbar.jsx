import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, Sparkles, Menu, Info } from 'lucide-react';

const Navbar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const aboutPath = user?.role === 'professor' ? '/professor/about' : '/student/about';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all focus:outline-none ${
            sidebarOpen
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={sidebarOpen ? 'Collapse Navigation (Ctrl+B)' : 'Expand Navigation'}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo & Title (Navigates to Full-Page About EduCopilot) */}
        <Link
          to={aboutPath}
          className="flex items-center gap-2.5 px-2 py-1 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-left group"
          title="Click to view About EduCopilot full platform explanation"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-red-700 to-red-600 text-white font-bold shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform border border-red-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider uppercase text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              EDU<span className="text-red-600 dark:text-red-500">PILOT</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/80 dark:border-red-800/80">
              {user?.role === 'student' ? 'Operation Control' : 'Command Suite'}
            </span>
            <span className="hidden lg:inline-flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 group-hover:border-red-500/40 transition-colors">
              <Info className="w-3 h-3 mr-1 text-red-500" /> Mission Briefing
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* User Role Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
          <span className="text-slate-400">•</span>
          <span className="capitalize">{user?.role}</span>
        </div>

        {/* Theme Toggle (Sun/Moon) */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900"
          title="Sign out of your account"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
