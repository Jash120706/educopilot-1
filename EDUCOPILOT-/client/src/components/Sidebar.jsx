import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportChatbotModal from './SupportChatbotModal';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  FileCheck2,
  HelpCircle,
  History,
  FolderSync,
  Calendar,
  Layers,
  GraduationCap,
  Shield,
  ChevronLeft,
  PlusCircle,
  Mail,
  Bot,
  MessageSquare,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const studentLinks = [
    {
      to: '/student/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & daily momentum',
    },
    {
      to: '/student/study-plans',
      label: 'View Study Plans',
      icon: CalendarDays,
      description: 'Card visualization & tracker',
    },
    {
      to: '/student/study-plans/generate',
      label: 'Generate Study Plan',
      icon: Sparkles,
      description: 'AI roadmap generator',
    },
    {
      to: '/student/practice-tests',
      label: 'Practice Tests',
      icon: FileCheck2,
      description: 'Adaptive quizzes & mock tests',
    },
    {
      to: '/student/prof-exams',
      label: 'Prof Exams',
      icon: GraduationCap,
      description: 'Official exams & released grades',
    },
    {
      to: '/student/doubt-chat',
      label: 'Ask a Doubt',
      icon: HelpCircle,
      description: 'RAG syllabus grounded tutor',
    },
    {
      to: '/student/materials-rag',
      label: 'Course Knowledge (RAG)',
      icon: FolderSync,
      description: 'Upload notes & explore library',
    },
    {
      to: '/student/test-history',
      label: 'Test History',
      icon: History,
      description: 'Weak areas & diagnostics',
    },
    {
      to: '/student/about',
      label: 'About EduCopilot',
      icon: Sparkles,
      description: 'Platform overview & architecture',
    },
  ];

  const professorLinks = [
    {
      to: '/professor/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Courses & activity summary',
    },
    {
      to: '/professor/materials-rag',
      label: 'Course Materials (RAG)',
      icon: FolderSync,
      description: 'Upload syllabus & knowledge base',
    },
    {
      to: '/professor/schedules',
      label: 'View Lecture Schedules',
      icon: CalendarDays,
      description: 'Slot cards & prerequisite vault',
    },
    {
      to: '/professor/scheduling/generate',
      label: 'Generate Schedule',
      icon: Sparkles,
      description: 'AI syllabus slot sequencer',
    },
    {
      to: '/professor/material-prep',
      label: 'Material Prep',
      icon: Layers,
      description: 'Auto-draft slides & notes',
    },
    {
      to: '/professor/share-notes',
      label: 'Share Notes',
      icon: Mail,
      description: 'Distribute notes via Gmail to students',
    },
    {
      to: '/professor/grading',
      label: 'Assessment & Grading',
      icon: GraduationCap,
      description: 'AI rubric & student feedback',
    },
    {
      to: '/professor/create-test',
      label: 'Create & Manage Tests',
      icon: FileCheck2,
      description: 'Scoped tests & access codes',
    },
    {
      to: '/professor/about',
      label: 'About EduCopilot',
      icon: Sparkles,
      description: 'Platform overview & architecture',
    },
  ];

  const links = isStudent ? studentLinks : professorLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Section */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <span>{isStudent ? 'Mission Modules' : 'Tactical Suite'}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close sidebar navigation"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/student/study-plans'}
                onClick={() => {
                  if (window.innerWidth < 768) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-l-4 ${
                    isActive
                      ? 'bg-red-50 text-red-800 border-red-600 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500 shadow-xs font-bold'
                      : 'border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="leading-tight truncate">{link.label}</span>
                      <span
                        className={`text-[11px] font-normal leading-tight mt-0.5 truncate ${
                          isActive
                            ? 'text-red-700/80 dark:text-red-300/80'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {link.description}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Support AI Assistant & Data Privacy Card (Embedded at Sidebar Bottom) */}
        <div className="p-3 m-3 space-y-2 bg-gradient-to-br from-red-50/90 to-slate-100/90 dark:from-slate-800/90 dark:to-slate-900/90 rounded-2xl border border-red-200/80 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="w-full p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-600/25 flex items-center justify-between group active:scale-[0.98] border border-red-500/30"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-red-200 group-hover:scale-110 transition-transform" />
              <span>{isStudent ? 'Tactical AI Assistant' : 'Command AI Assistant'}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 uppercase tracking-wider text-white">
              24/7 AI
            </span>
          </button>

          <div className="flex items-center gap-1.5 text-[10.5px] leading-tight text-slate-600 dark:text-slate-400 px-1 pt-1 border-t border-blue-200/50 dark:border-slate-700/50">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-medium leading-tight">Strict Data Isolation & Policy Protection</span>
          </div>
        </div>

        {/* Support Chatbot Modal Drawer */}
        <SupportChatbotModal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />
      </aside>
    </>
  );
};

export default Sidebar;
