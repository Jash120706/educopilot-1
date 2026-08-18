import React from 'react';
import {
  Sparkles,
  Target,
  Clock,
  Zap,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
  CheckCircle2,
} from 'lucide-react';

const EduCopilotImpactSidebar = () => {
  const impacts = [
    {
      id: 'readiness',
      icon: Target,
      title: 'Student Exam Readiness & Engagement',
      description:
        'Adaptive practice tests, automated study schedules, and 24/7 AI tutoring maximize student performance and active engagement.',
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      id: 'prep_time',
      icon: Clock,
      title: 'Reduced Professor Prep & Grading Time',
      description:
        'AI-generated lecture slides, automated assignment creation, and rubric-based grading save professors hours every week.',
      color: 'from-purple-500 to-pink-600',
      badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-600 text-white',
    },
    {
      id: 'feedback',
      icon: Zap,
      title: 'Faster Feedback',
      description:
        'Instant evaluation and step-by-step guidance for students without waiting for office hours or assignment grading cycles.',
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      id: 'personalized',
      icon: UserCheck,
      title: 'Personalized Learning Experience',
      description:
        'Tailored content recommendations, interactive doubt resolution, and isolated RAG vaults grounded strictly in course curriculum.',
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-600 text-white',
    },
  ];

  return (
    <div className="space-y-8 py-4 lg:py-6">
      {/* Brand Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600/10 via-red-700/10 to-slate-900/10 dark:from-red-600/20 dark:via-red-800/20 dark:to-slate-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wider shadow-sm">
          <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
          <span>EduCopilot • Mission Control & Tactical AI Suite</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Empowering Education with <span className="bg-gradient-to-r from-red-600 via-red-500 to-amber-500 bg-clip-text text-transparent">Tactical Role-Isolated AI</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-medium">
          EduCopilot unifies AI study planning, syllabus RAG doubt solving, automated test generation, and intelligent rubric grading under strict operational security guardrails.
        </p>
      </div>

      {/* Impact Section Header */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>EduCopilot's Core Impact</span>
        </h2>

        {/* 4 Impact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {impacts.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500/60 shadow-xs hover:shadow-md transition-all duration-200 space-y-2.5 overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shadow-sm shrink-0 font-bold group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default EduCopilotImpactSidebar;
