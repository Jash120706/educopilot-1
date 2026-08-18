import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  FolderSync,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  CheckCircle2,
} from 'lucide-react';

const ProfessorDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professor/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load professor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading professor workspace...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalSchedules: 0,
    totalMaterials: 0,
    totalGradings: 0,
    indexedDocsChunks: 0,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white shadow-lg shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Faculty AI Copilot Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Professor {user?.name} 🎓
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-200/90 leading-relaxed">
            Automate lecture scheduling, generate syllabus-grounded slide decks, and conduct individualized AI-assisted grading.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/professor/materials-rag"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 active:scale-95"
            >
              <FolderSync className="w-4 h-4" />
              <span>Upload Syllabus & RAG</span>
            </Link>
            <Link
              to="/professor/scheduling"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Lecture Scheduler</span>
            </Link>
            <Link
              to="/professor/material-prep"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>Prep Slides & Notes</span>
            </Link>
            <Link
              to="/professor/grading"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs sm:text-sm transition-all active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Grade Submissions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Lecture Schedules */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lecture Plans
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalSchedules}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">AI Sequenced</span>
          </div>
        </div>

        {/* Metric 2: Material Decks */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Drafted Materials
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalMaterials}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Slides & Notes</span>
          </div>
        </div>

        {/* Metric 3: AI Gradings */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Evaluated Submissions
            </span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalGradings}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Rubric Items</span>
          </div>
        </div>

        {/* Metric 4: RAG Chunks */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Indexed Chunks
            </span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <FolderSync className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.indexedDocsChunks}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">RAG Vector Vault</span>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Recent Lecture Plans & Prepared Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Recent Lecture Plans */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Lecture Sequences
              </h2>
            </div>
            <Link
              to="/professor/schedules"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {data?.recentSchedules?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No lecture plans scheduled yet. Sequence your topics with AI assistance!
              </div>
            ) : (
              data?.recentSchedules?.map((sched) => (
                <div
                  key={sched._id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {sched.courseCode} • {sched.subject}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {sched.title || `${sched.subject} Lecture Plan`}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {sched.plan?.length || sched.numPeriods || 5} Periods
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Duration: {sched.minutesPerPeriod || 60}m per period</span>
                    <span>Deadline: {sched.deadline || 'Flexible'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Recent Materials */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Prepared Slide Decks & Notes
              </h2>
            </div>
            <Link
              to="/professor/material-prep"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Prepare More <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {data?.recentMaterials?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No lecture materials generated yet. Click "Prepare More" to draft slide outlines!
              </div>
            ) : (
              data?.recentMaterials?.slice(0, 3).map((mat) => (
                <div
                  key={mat._id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {mat.type} • {mat.subject}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {mat.title || mat.topic}
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {mat.type === 'slides'
                        ? `${mat.content?.slides?.length || 0} Slides Deck`
                        : mat.type === 'assignment'
                        ? `${mat.content?.assignments?.length || 0} Questions Rubric`
                        : mat.type === 'practice_questions'
                        ? `${mat.content?.practiceQuestions?.length || 0} Practice Questions`
                        : 'Structured Lecture Notes'}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Draft Ready
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
