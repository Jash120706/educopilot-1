import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  FileCheck2,
  HelpCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  FolderSync,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading personalized workspace...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalPlans: 0,
    totalTests: 0,
    totalDoubts: 0,
    avgScore: 0,
    weakAreas: [],
    strengths: [],
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg shadow-blue-500/15">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Learning Copilot Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Your personalized study schedule and adaptive test diagnostics are grounded in your course materials.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/student/study-plans/generate"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-xs sm:text-sm hover:bg-blue-50 transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Generate Study Plan</span>
            </Link>
            <Link
              to="/student/practice-tests"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Take Practice Quiz</span>
            </Link>
            <Link
              to="/student/doubt-chat"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Ask a Doubt</span>
            </Link>
            <Link
              to="/student/materials-rag"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <FolderSync className="w-4 h-4" />
              <span>Course Library (RAG)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Score */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mastery Score
            </span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.avgScore}%
            </span>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              {stats.totalTests > 0 ? 'Across evaluated tests' : 'No tests yet'}
            </span>
          </div>
        </div>

        {/* Metric 2: Active Plans */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Study Plans
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalPlans}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Created</span>
          </div>
        </div>

        {/* Metric 3: Tests Completed */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tests Completed
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalTests}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Adaptive attempts</span>
          </div>
        </div>

        {/* Metric 4: Doubts Answered */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Doubts Resolved
            </span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalDoubts}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">With RAG citations</span>
          </div>
        </div>
      </div>

      {/* Weak Areas Banner */}
      {stats.weakAreas && stats.weakAreas.length > 0 && (
        <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200">
                Diagnostic Weak Area Alert
              </h3>
              <p className="text-xs text-orange-800/80 dark:text-orange-300/80 mt-0.5">
                AI diagnostic noticed opportunities for improvement in:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stats.weakAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[11px] font-semibold text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-2xs"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Link
            to="/student/practice-tests"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-sm shadow-orange-600/20"
          >
            <span>Targeted Practice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 2-Column Section: Active Study Plans & Recent Practice Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Recent Study Plans */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Active Study Plans
              </h2>
            </div>
            <Link
              to="/student/study-plans"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {data?.recentPlans?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No study plans created yet. Click "Create Study Plan" to start!
              </div>
            ) : (
              data?.recentPlans?.map((plan) => (
                <div
                  key={plan._id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {plan.subject}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {plan.topic}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300">
                      {plan.progressPercent}% Complete
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${plan.progressPercent}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{plan.planDays?.length} Days Plan</span>
                    <span>Target: {plan.targetExamDate || 'Self-Paced'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Recent Practice Tests */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Test Attempts
              </h2>
            </div>
            <Link
              to="/student/test-history"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Full History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {data?.recentTests?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No practice tests taken yet. Generate a test to measure your understanding!
              </div>
            ) : (
              data?.recentTests?.slice(0, 3).map((test) => (
                <div
                  key={test._id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {test.subject}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                        {test.difficulty}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {test.topic}
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(test.completedAt).toLocaleDateString()} • {test.totalQuestions} Questions
                    </p>
                  </div>

                   <div className="text-right">
                    {test.isReleased === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                        Pending
                      </span>
                    ) : (
                      <>
                        <div
                          className={`text-lg font-black ${
                            test.percentage >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : test.percentage >= 50
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {test.score}/{test.totalQuestions}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {test.percentage}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
