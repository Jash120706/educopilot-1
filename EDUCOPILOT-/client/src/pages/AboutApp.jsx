import React from 'react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  BrainCircuit,
  CalendarDays,
  FileCheck2,
  HelpCircle,
  FolderSync,
  Layers,
  ShieldCheck,
  Database,
  Cpu,
  Lock,
  CheckCircle2,
  Award,
  Zap,
  Clock,
} from 'lucide-react';

const AboutApp = () => {
  const capabilities = [
    {
      icon: CalendarDays,
      title: 'Grounded Study Roadmaps',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/60',
      description:
        'Converts course syllabi and topics into optimized day-by-day learning schedules with priority weights (High/Medium/Low), daily study time estimates, and actionable task checklists.',
    },
    {
      icon: FileCheck2,
      title: 'Adaptive Practice Tests & Diagnostics',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
      description:
        'Generates dynamic quizzes (MCQ, True/False, Fill in Blank, Short Answer) with live countdown timers, instant scoring, question-by-question explanations, and weak-area alerts.',
    },
    {
      icon: HelpCircle,
      title: 'Course Doubt Clarification (RAG)',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      description:
        'Interactive AI tutor providing syllabus-grounded explanations with exact source citations, relevance scores, high-yield takeaways, and recommended follow-up questions.',
    },
    {
      icon: FolderSync,
      title: 'Course Knowledge Base (RAG)',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      description:
        'Multi-format document ingestion pipeline (PDF, Markdown, OCR text) that chunks documents into semantic vectors with subject scoping for precise retrieval.',
    },
    {
      icon: Layers,
      title: 'Lecture Scheduler & Material Prep',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/60',
      description:
        'AI sequencing engine that analyzes course topics, maps pedagogical prerequisites, drafts slide decks with speaker notes, and structures lecture outlines.',
    },
    {
      icon: GraduationCap,
      title: 'Rubric-Based AI Assessment',
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/60',
      description:
        'Evaluates student short-answer submissions using customizable grading rubrics, providing score breakdowns, constructive feedback, and improvement guidance.',
    },
  ];

  const securityFeatures = [
    {
      icon: Database,
      title: 'Per-User MongoDB Scoping',
      desc: 'All collections (Study Plans, Test Attempts, Doubts, Lecture Schedules, Materials) strictly filter records by authenticated userId or professorId.',
    },
    {
      icon: Lock,
      title: 'Cryptographic JWT Role Guards',
      desc: 'Every API request verifies signed JWT headers. Client-supplied IDs are never trusted, ensuring complete separation between student and professor suites.',
    },
    {
      icon: Cpu,
      title: 'LLM + RAG Intelligence Engine',
      desc: 'Powered by high-throughput LLaMA 3.3 70B with an automated contextual fallback heuristic engine ensuring 100% platform uptime and reliable answers.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fadeIn pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white shadow-xl shadow-blue-500/15">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Dual-Persona GenAI Education Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            About Edu<span className="text-blue-300">Copilot</span>
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-medium">
            EduCopilot is a full-stack educational intelligence platform that bridges curriculum textbooks and active learning. Using grounded Retrieval-Augmented Generation (RAG), it delivers personalized study schedules, adaptive practice diagnostics, instant doubt tutoring, and automated assessment.
          </p>
        </div>
      </div>

      {/* Core Platform Capabilities Section */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Core Platform Capabilities
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore the specialized modules designed for interactive student prep and teaching orchestration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl ${item.bgColor} flex items-center justify-center ${item.color} shadow-xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strict Architecture & Security Section */}
      <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Zero-Leak Data Isolation & Architecture
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Built on strict multi-tenant security principles to ensure academic integrity and data privacy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {securityFeatures.map((sec, i) => {
            const SecIcon = sec.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <SecIcon className="w-4 h-4 text-blue-600" />
                  <span>{sec.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {sec.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AboutApp;
