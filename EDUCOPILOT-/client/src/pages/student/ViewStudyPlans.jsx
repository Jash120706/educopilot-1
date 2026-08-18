import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { exportStudyPlanToPDF } from '../../utils/exportUtils';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  BookOpen,
  Clock,
  Layers,
  Edit3,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
  Target,
  ArrowRight,
  Filter,
  Flame,
  Award,
  ChevronRight,
  ListTodo,
  FileDown,
} from 'lucide-react';

const ViewStudyPlans = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter for day cards
  const [dayFilter, setDayFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'high'

  // Edit Plan State
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlanDays, setEditedPlanDays] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/study-plans');
      setPlans(res.data);

      if (res.data.length > 0) {
        // If state passed from generator, select that plan, otherwise first plan
        const targetId = location.state?.selectedPlanId;
        const matchingPlan = targetId ? res.data.find((p) => p._id === targetId) : null;
        selectPlan(matchingPlan || res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch study plans:', err);
      setError('Failed to load study plans. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = (p) => {
    setActivePlan(p);
    setEditedPlanDays(p?.planDays || []);
    setIsEditing(false);
  };

  const handleDeletePlan = async (planId, planTopic, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete the study plan for "${planTopic || 'this topic'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(planId);
      await api.delete(`/student/study-plans/${planId}`);
      const updatedPlans = plans.filter((p) => p._id !== planId);
      setPlans(updatedPlans);
      setSuccessMsg('Study plan deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3500);

      if (activePlan?._id === planId) {
        if (updatedPlans.length > 0) {
          selectPlan(updatedPlans[0]);
        } else {
          setActivePlan(null);
          setEditedPlanDays([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete study plan:', err);
      setError(err.response?.data?.error || 'Failed to delete study plan.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleTask = async (dayIndex) => {
    if (!activePlan) return;
    try {
      const res = await api.patch(`/student/study-plans/${activePlan._id}/toggle-task`, {
        dayIndex,
      });
      selectPlan(res.data);
      setPlans(plans.map((p) => (p._id === res.data._id ? res.data : p)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleSavePlanEdits = async () => {
    if (!activePlan) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`/student/study-plans/${activePlan._id}`, {
        planDays: editedPlanDays,
      });
      setSuccessMsg('Plan changes successfully saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
      selectPlan(res.data);
      setPlans(plans.map((p) => (p._id === res.data._id ? res.data : p)));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save plan edits:', err);
      setError('Failed to update plan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyNotes = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
    }
  };

  // Calculations for active plan progress
  const totalDays = activePlan?.planDays?.length || 0;
  const completedDays = activePlan?.planDays?.filter((d) => d.completed).length || 0;
  const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const totalStudyMinutes = activePlan?.planDays?.reduce((acc, d) => acc + (d.recommendedStudyMinutes || 90), 0) || 0;
  const completedStudyMinutes = activePlan?.planDays?.filter((d) => d.completed).reduce((acc, d) => acc + (d.recommendedStudyMinutes || 90), 0) || 0;

  // Filtered day cards
  const filteredDays = activePlan?.planDays?.filter((d, idx) => {
    if (dayFilter === 'pending') return !d.completed;
    if (dayFilter === 'completed') return d.completed;
    if (dayFilter === 'high') return d.priority === 'High';
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading your visual study plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Interactive Study Tracker
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            <span>My Study Plans & Roadmaps</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track daily milestones, visualize exam preparation progress, and complete checklist tasks.
          </p>
        </div>

        <Link
          to="/student/study-plans/generate"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Generate New Plan</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-xs font-semibold text-green-800 dark:text-green-300 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {plans.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Study Plans Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You haven't generated any study schedules yet. Create your first personalized AI roadmap now!
            </p>
          </div>
          <Link
            to="/student/study-plans/generate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate First Study Plan</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Selector Carousel Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              <span>Select Active Plan ({plans.length})</span>
              <span className="text-[11px] text-blue-600 font-semibold">{plans.length} Roadmaps Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {plans.map((p) => {
                const isSelected = activePlan?._id === p._id;
                const pDays = p.planDays?.length || 0;
                const pDone = p.planDays?.filter((d) => d.completed).length || 0;
                const pPercent = pDays > 0 ? Math.round((pDone / pDays) * 100) : 0;
                const isDeletingThis = deletingId === p._id;

                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => selectPlan(p)}
                    className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/60 dark:to-slate-900 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 truncate max-w-[120px]">
                          {p.subject}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              pPercent === 100
                                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {pPercent}% Done
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            title="Delete Study Plan"
                            onClick={(e) => handleDeletePlan(p._id, p.topic, e)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleDeletePlan(p._id, p.topic, e);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                          >
                            {isDeletingThis ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                        {p.topic}
                      </h3>
                    </div>

                    <div className="mt-4 space-y-2">
                      {/* Mini progress bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${pPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{p.durationDays} Days Plan</span>
                        <span>{p.targetExamDate ? `Exam: ${p.targetExamDate}` : 'Self-Paced'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {activePlan && (
            <div className="space-y-6">
              {/* Active Plan Visual Overview & Progress Analytics Card */}
              <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {activePlan.subject}
                      </span>
                      {activePlan.targetExamDate && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-blue-600" />
                          Exam Target: {activePlan.targetExamDate}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {activePlan.topic}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportStudyPlanToPDF(activePlan)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 transition-colors shadow-2xs"
                      title="Download PDF Study Plan with EduCopilot Watermark"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Plan'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === activePlan._id}
                      onClick={(e) => handleDeletePlan(activePlan._id, activePlan.topic, e)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {deletingId === activePlan._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete Plan</span>
                    </button>
                  </div>
                </div>

                {/* Progress Chart / Metric Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Overall Completion Percentage */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-slate-900 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                      <span>Overall Progress</span>
                      <Award className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {progressPercent}%
                      </span>
                      <span className="text-xs font-semibold text-blue-600">
                        {completedDays} / {totalDays} Days
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Daily Tasks Milestone */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Tasks Milestone</span>
                      <ListTodo className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {completedDays}
                      </span>
                      <span className="text-xs text-slate-500">Days Finished</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {totalDays - completedDays} days remaining to review
                    </p>
                  </div>

                  {/* Estimated Study Hours */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Study Duration</span>
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {(completedStudyMinutes / 60).toFixed(1)}h
                      </span>
                      <span className="text-xs text-slate-500">
                        / {(totalStudyMinutes / 60).toFixed(1)}h total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Grounded syllabus study schedule
                    </p>
                  </div>

                  {/* Plan Pace Status */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Pace & Momentum</span>
                      <Flame className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {progressPercent === 100 ? 'Completed 🎉' : progressPercent > 0 ? 'In Progress 🚀' : 'Not Started ⏳'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {progressPercent === 100 ? 'Exam ready!' : 'Keep checking off tasks daily'}
                    </p>
                  </div>
                </div>

                {/* Topic Summary Badge */}
                {activePlan.topicSummary && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <strong className="font-bold">Executive Topic Synthesis:</strong> {activePlan.topicSummary}
                  </div>
                )}
              </div>

              {/* EDIT MODE */}
              {isEditing ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-blue-500/40 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-blue-600" />
                      <span>Edit Day-by-Day Milestone Roadmaps</span>
                    </h3>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={handleSavePlanEdits}
                      className="flex items-center gap-1.5 py-2 px-5 rounded-2xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-md shadow-green-500/20"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingEdit ? 'Saving...' : 'Save Plan Changes'}</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {editedPlanDays.map((d, idx) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={d.title}
                            onChange={(e) => {
                              const updated = [...editedPlanDays];
                              updated[idx].title = e.target.value;
                              setEditedPlanDays(updated);
                            }}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border rounded-xl font-bold dark:text-white"
                          />
                          <select
                            value={d.priority || 'High'}
                            onChange={(e) => {
                              const updated = [...editedPlanDays];
                              updated[idx].priority = e.target.value;
                              setEditedPlanDays(updated);
                            }}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border rounded-xl font-semibold dark:text-white"
                          >
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                          </select>
                          <input
                            type="number"
                            value={d.recommendedStudyMinutes || 90}
                            onChange={(e) => {
                              const updated = [...editedPlanDays];
                              updated[idx].recommendedStudyMinutes = Number(e.target.value);
                              setEditedPlanDays(updated);
                            }}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border rounded-xl font-semibold dark:text-white"
                            placeholder="Study Mins"
                          />
                        </div>
                        <input
                          type="text"
                          value={d.focus}
                          onChange={(e) => {
                            const updated = [...editedPlanDays];
                            updated[idx].focus = e.target.value;
                            setEditedPlanDays(updated);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border rounded-xl text-xs dark:text-white"
                          placeholder="Focus objective"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Card Style Visualization for Daily Tasks */
                <div className="space-y-4">
                  {/* Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <Filter className="w-4 h-4 text-blue-600" />
                      <span>Daily Task Cards ({filteredDays.length})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'All Days' },
                        { id: 'pending', label: 'Incomplete' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'high', label: 'High Priority' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDayFilter(tab.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            dayFilter === tab.id
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Style Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDays.map((d, origIdx) => {
                      // Find real index in activePlan.planDays
                      const realIndex = activePlan.planDays.findIndex((item) => item === d);
                      const isComplete = d.completed;

                      return (
                        <div
                          key={origIdx}
                          className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
                            isComplete
                              ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 shadow-2xs opacity-90'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md shadow-sm'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Card Top Pill Row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  Day {d.day || realIndex + 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(d.priority)}`}>
                                  {d.priority || 'High'} Priority
                                </span>
                              </div>

                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{d.recommendedStudyMinutes || 90} mins</span>
                              </span>
                            </div>

                            {/* Card Title & Focus */}
                            <div>
                              <h3
                                className={`text-base font-bold leading-snug ${
                                  isComplete
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {d.title}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                {d.focus}
                              </p>
                            </div>

                            {/* Tasks Checklist */}
                            {d.tasks && d.tasks.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  Actionable Tasks
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-4 list-disc">
                                  {d.tasks.map((task, ti) => (
                                    <li key={ti} className={isComplete ? 'line-through text-slate-400' : ''}>
                                      {task}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Interactive Toggle Button Footer */}
                          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400">
                              {d.scheduledDate ? `Scheduled: ${d.scheduledDate}` : 'Milestone'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleTask(realIndex >= 0 ? realIndex : origIdx)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isComplete
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 hover:bg-green-200'
                                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-600 hover:text-white shadow-2xs'
                              }`}
                            >
                              {isComplete ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Completed</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="w-4 h-4" />
                                  <span>Mark Day Complete</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* High-Yield Revision Notes / Cheat Sheet */}
              {activePlan.revisionNotes && (
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Revision Notes & Key High-Yield Cheat Sheet</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopyNotes(activePlan.revisionNotes)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied to Clipboard' : 'Copy Notes'}</span>
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed dark:text-slate-200 shadow-2xs">
                    <MarkdownRenderer content={activePlan.revisionNotes} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewStudyPlans;
