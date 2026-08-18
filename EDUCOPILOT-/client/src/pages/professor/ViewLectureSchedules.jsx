import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  CalendarDays,
  Plus,
  Trash2,
  Download,
  Timer,
  BookOpen,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { exportLecturePlanToPDF } from '../../utils/exportUtils';

const ViewLectureSchedules = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professor/schedules');
      setPlans(res.data);
      if (res.data.length > 0 && !activePlan) {
        setActivePlan(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load lecture schedules:', err);
      setError('Failed to load saved lecture schedules.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this lecture schedule?')) return;

    try {
      setDeletingId(id);
      await api.delete(`/professor/schedules/${id}`);
      const updated = plans.filter((p) => p._id !== id);
      setPlans(updated);
      if (activePlan?._id === id) {
        setActivePlan(updated.length > 0 ? updated[0] : null);
      }
      setSuccessMsg('Lecture schedule removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete plan:', err);
      setError('Failed to delete lecture plan.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            <span>View Lecture Schedules</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Access, review, and export all AI-generated slot-by-slot prerequisite lecture plans stored in your database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/professor/scheduling/generate')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Lecture Schedule</span>
        </button>
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
        {/* Left Column: Schedules Vault / Library */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Saved Schedules ({plans.length})</span>
              </h2>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading schedules...</div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                <p>No lecture schedules saved yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/professor/scheduling/generate')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100"
                >
                  Generate First Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {plans.map((p) => {
                  const isSelected = activePlan?._id === p._id;
                  const isDeleting = deletingId === p._id;

                  return (
                    <div
                      key={p._id}
                      onClick={() => setActivePlan(p)}
                      className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {p.title || p.subject}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                            <span>{p.courseCode}</span>
                            <span>•</span>
                            <span>{p.plan?.length || p.numPeriods || 5} Periods</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p._id, e)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Delete schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Schedule Viewer */}
        <div className="lg:col-span-8 space-y-6">
          {activePlan ? (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      {activePlan.courseCode}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{activePlan.subject}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {activePlan.title || `${activePlan.subject} Lecture Plan`}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activePlan.plan?.length || 5} Periods • {activePlan.minutesPerPeriod || 60} Mins per Period
                    {activePlan.deadline && ` • Deadline: ${activePlan.deadline}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportLecturePlanToPDF(activePlan)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm shadow-blue-500/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Schedule (.pdf)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(activePlan._id, e)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* At-Risk Topics Alert Banner (if any) */}
              {activePlan.at_risk_topics && activePlan.at_risk_topics.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-1">
                      At-Risk Topics (Exceeding Time Budget):
                    </strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {activePlan.at_risk_topics.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Slot Cards List */}
              {(!activePlan.plan || activePlan.plan.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="text-xs text-slate-500">
                    No slot records found for this draft schedule.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/professor/scheduling/generate')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                  >
                    Generate New Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Sequential Slot Timeline ({activePlan.plan.length} Periods)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Prerequisite-chained progression
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-1">
                    {activePlan.plan.map((slot, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 transition-all hover:border-blue-300 dark:hover:border-blue-700"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider font-mono">
                            PERIOD {slot.period} • {slot.type || 'lecture'}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            <span>{activePlan.minutesPerPeriod || 60}m</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {slot.topic}
                        </h3>

                        {/* Subtopics */}
                        {slot.subtopics && slot.subtopics.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Subtopics:
                            </span>
                            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-3 list-disc">
                              {slot.subtopics.map((st, si) => (
                                <li key={si} className="text-[11px] leading-tight">
                                  {st}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold">Prerequisite:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]" title={slot.prerequisites?.join(', ')}>
                            {slot.prerequisites && slot.prerequisites.length > 0
                              ? slot.prerequisites.join(', ')
                              : 'None (Foundational)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePlan.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">AI Curriculum Notes: </strong>
                  <span>{activePlan.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Select a lecture schedule from the library on the left or generate a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewLectureSchedules;
