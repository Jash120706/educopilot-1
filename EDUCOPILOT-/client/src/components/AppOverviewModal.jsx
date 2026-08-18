import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Users,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  BrainCircuit,
  Calendar,
  Layers,
  FileCheck2,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';

const AppOverviewModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const personas = [
    {
      role: 'student',
      title: 'Student Persona',
      subtitle: 'Active Learning & Exam Mastery',
      avatarBg: 'bg-blue-600',
      icon: GraduationCap,
      description: 'Provides students with personalized, grounded study assistance without manual schedule overhead.',
      features: [
        'Personalized day-by-day study roadmaps with interactive task tracking',
        'Adaptive MCQ diagnostics with real-time timers & question explanation breakdown',
        'RAG syllabus doubt solver with page-level textbook citations',
        'Strictly isolated private study notes, roadmaps, and diagnostic histories',
      ],
    },
    {
      role: 'professor',
      title: 'Professor Suite',
      subtitle: 'Course Orchestration & AI Assessment',
      avatarBg: 'bg-purple-600',
      icon: BookOpen,
      description: 'Empowers educators to manage course knowledge, organize lectures, and automate rubric grading.',
      features: [
        'Course Syllabus & Textbook RAG Ingestion (PDF / Markdown / Text chunking)',
        'AI Lecture Sequencer with pedagogical prerequisite graphs and scheduling',
        'Auto-drafting slide decks with speaker notes & comprehensive lecture outlines',
        'Rubric-based individualized short-answer evaluation with constructive feedback',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white dark:from-slate-900 dark:to-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Edu<span className="text-blue-600">Copilot</span>
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  System Architecture & Overview
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dual-Persona GenAI Education Platform with RAG & Strict Data Isolation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Personas & Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Data Isolation & Security</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white space-y-2 shadow-lg shadow-blue-500/10">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Welcome to EduCopilot</span>
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  EduCopilot bridges the gap between students and professors using fine-tuned Retrieval-Augmented Generation (RAG). Every piece of advice, study roadmap, practice quiz, and grading rubric is strictly grounded in genuine course textbooks and syllabus files.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Student Workspace Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Student Workspace</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Active Learning & Exam Mastery</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span><strong>Personalized Roadmaps:</strong> Day-by-day task checklist with study duration tracking.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span><strong>AI Adaptive Quizzes:</strong> Timed MCQ tests with instant scoring and explanation.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span><strong>RAG Doubt Solver:</strong> Grounded answers with exact syllabus citations.</span>
                    </li>
                  </ul>
                </div>

                {/* Professor Suite Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Professor Suite</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Course Orchestration & AI Grading</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                      <span><strong>RAG Ingestion Engine:</strong> Upload PDF/Docx syllabi chunked into semantic vectors.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                      <span><strong>Lecture Scheduler:</strong> Pedagogical sequencing with prerequisite detection.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                      <span><strong>Automated Assessment:</strong> Rubric-based short answer evaluation with constructive marks.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                EduCopilot supports dedicated persona-based workspaces with strict role-based permission scoping:
              </p>

              <div className="grid grid-cols-1 gap-4">
                {personas.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${p.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{p.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.subtitle}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">{p.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {p.features.map((feat, fi) => (
                          <div key={fi} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DATA ISOLATION & ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Strict Zero-Leak Multi-Tenant Architecture</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Every API query strictly parses and cryptographically validates the JWT bearer token. Database operations filter by <code>req.user._id</code> or <code>req.user.role</code>. Student A (Alex) cannot query, view, or modify records belonging to Student B (Sophia).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>MongoDB Scoping</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Separate collections with indexed <code>userId</code> and <code>professorId</code> foreign keys.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>LLM + RAG Pipeline</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Groq LLaMA 3.3 70B Versatile + intelligent fallback heuristic engine for 100% uptime.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>JWT Role Guards</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Backend middleware verifies user roles before allowing access to professor or student endpoints.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            EduCopilot v1.0 • Ready for Production Demo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Got it, continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppOverviewModal;
