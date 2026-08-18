import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileUp,
  Edit3,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  Flame,
} from 'lucide-react';

const StudyPlans = () => {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dynamic Course List State
  const [coursesList, setCoursesList] = useState([]);

  // Form State
  const [subjectCode, setSubjectCode] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('Distributed Consensus & Raft Protocol');
  const [targetExamDate, setTargetExamDate] = useState('2026-09-15');
  const [durationDays, setDurationDays] = useState(7);
  const [rawNotes, setRawNotes] = useState('');

  // Uploaded Files
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [timetableFile, setTimetableFile] = useState(null);
  const [studyMaterialFile, setStudyMaterialFile] = useState(null);

  // Edit Plan Modal / State
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlanDays, setEditedPlanDays] = useState([]);

  useEffect(() => {
    fetchCourses();
    fetchPlans();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/student/courses');
      setCoursesList(res.data);
      if (res.data.length > 0) {
        setSubjectCode(res.data[0].subjectCode);
        setSubject(res.data[0].subject);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/study-plans');
      setPlans(res.data);
      if (res.data.length > 0) {
        selectPlan(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load study plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = (plan) => {
    setActivePlan(plan);
    setEditedPlanDays(plan.planDays || []);
    setIsEditing(false);
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('subjectCode', subjectCode || '');
      formData.append('topic', topic);
      formData.append('targetExamDate', targetExamDate);
      formData.append('durationDays', durationDays);
      formData.append('rawNotes', rawNotes);

      if (syllabusFile) formData.append('syllabusFile', syllabusFile);
      if (timetableFile) formData.append('timetableFile', timetableFile);
      if (studyMaterialFile) formData.append('studyMaterialFile', studyMaterialFile);

      const res = await api.post('/student/study-plans/generate-from-materials', formData);

      setPlans([res.data, ...plans]);
      selectPlan(res.data);
      setSuccessMsg('Personalized study plan created and added to your dashboard!');
      setSyllabusFile(null);
      setTimetableFile(null);
      setStudyMaterialFile(null);
    } catch (err) {
      console.error('Failed to generate study plan:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate study plan.');
    } finally {
      setGenerating(false);
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
      setSuccessMsg('Plan changes saved to your dashboard!');
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

  const handleDeletePlan = async (planId, planTopic, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete the study plan for "${planTopic || 'this topic'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
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
        return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <CalendarDays className="w-7 h-7 text-blue-600" />
          <span>Personalized Study Planner & Roadmaps</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Upload your syllabus, timetable, course outline, or study materials. AI generates an optimized day-by-day roadmap with priority tiers, scheduled dates, and recommended daily study time.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3 text-xs text-green-800 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Uploads */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Study Schedule
              </h2>
            </div>

            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Duration (Days)
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value={3}>3 Days (Crash Prep)</option>
                    <option value={5}>5 Days (Intensive)</option>
                    <option value={7}>7 Days (1 Week Standard)</option>
                    <option value={14}>14 Days (2 Weeks Deep)</option>
                    <option value={30}>30 Days (Full Semester)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Topic / Exam Objective
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Distributed State Replication & Raft Consensus"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Target Exam Date
                </label>
                <input
                  type="date"
                  value={targetExamDate}
                  onChange={(e) => setTargetExamDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              {/* Upload Syllabus / Timetable / Material Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Upload Syllabus / Timetable (PDF / Text)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-center p-2.5 border border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                    <FileUp className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
                    <span className="truncate">{syllabusFile ? syllabusFile.name : 'Attach Syllabus (PDF)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={(e) => setSyllabusFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center p-2.5 border border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                    <CalendarDays className="w-3.5 h-3.5 mr-1 text-green-600 shrink-0" />
                    <span className="truncate">{timetableFile ? timetableFile.name : 'Attach Timetable'}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.xlsx,.csv,.png,.jpg"
                      onChange={(e) => setTimetableFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Or Paste Outline / Notes Excerpt
                </label>
                <textarea
                  rows={2}
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Paste syllabus modules, topics list, or target chapters..."
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing Personalized Schedule...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Add to Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Plans List */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Your Active Study Plans ({plans.length})</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No study plans created yet.</div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {plans.map((p) => {
                  const isSelected = activePlan?._id === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => selectPlan(p)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="overflow-hidden space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {p.subject}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {p.progressPercent || 0}% Done
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{p.topic}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{p.durationDays}D</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Plan Detail & Editable Modal */}
        <div className="lg:col-span-7 space-y-6">
          {activePlan ? (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
              {/* Plan Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {activePlan.subject}
                    </span>
                    {activePlan.targetExamDate && (
                      <span className="text-xs font-bold text-slate-500">
                        Exam: {activePlan.targetExamDate}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {activePlan.topic}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Plan'}</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Roadmap Progress</span>
                  <span className="text-blue-600 font-bold">{activePlan.progressPercent || 0}% Complete</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
                    style={{ width: `${activePlan.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Topic Summary */}
              {activePlan.topicSummary && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <strong>High-Yield Overview:</strong> {activePlan.topicSummary}
                </div>
              )}

              {/* EDIT MODE */}
              {isEditing ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-blue-500/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span>Edit Daily Roadmap</span>
                    </h3>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={handleSavePlanEdits}
                      className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-md shadow-green-500/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingEdit ? 'Saving...' : 'Save to Dashboard'}</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {editedPlanDays.map((d, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-800 border rounded-xl space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={d.title}
                            onChange={(e) => {
                              const updated = [...editedPlanDays];
                              updated[idx].title = e.target.value;
                              setEditedPlanDays(updated);
                            }}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-700 border rounded font-bold dark:text-white"
                          />
                          <select
                            value={d.priority || 'High'}
                            onChange={(e) => {
                              const updated = [...editedPlanDays];
                              updated[idx].priority = e.target.value;
                              setEditedPlanDays(updated);
                            }}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-700 border rounded font-semibold dark:text-white"
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
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-700 border rounded font-semibold dark:text-white"
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
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 border rounded text-xs dark:text-white"
                          placeholder="Focus objective"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* VIEW MODE: Day by Day Cards */
                <div className="space-y-3">
                  {activePlan.planDays?.map((d, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        d.completed
                          ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-70'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(idx)}
                          className="flex items-start gap-3 text-left group"
                        >
                          <div className="mt-0.5 shrink-0">
                            {d.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Day {d.day || idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(d.priority)}`}>
                                {d.priority || 'High'} Priority
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{d.recommendedStudyMinutes || 90} mins</span>
                              </span>
                              {d.scheduledDate && (
                                <span className="text-[10px] text-slate-400">
                                  {d.scheduledDate}
                                </span>
                              )}
                            </div>
                            <h4
                              className={`text-sm font-bold mt-1 ${
                                d.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {d.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{d.focus}</p>

                            {/* Daily Tasks */}
                            {d.tasks && d.tasks.length > 0 && (
                              <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-4 list-disc">
                                {d.tasks.map((task, ti) => (
                                  <li key={ti}>{task}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Revision Notes Cheat Sheet */}
              {activePlan.revisionNotes && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Revision Notes & Cheat Sheet</span>
                    </h3>
                    <button
                      onClick={() => handleCopyNotes(activePlan.revisionNotes)}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed whitespace-pre-wrap dark:text-slate-200">
                    {activePlan.revisionNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Select or generate a study plan to view your day-by-day roadmap and progress checklist.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlans;
