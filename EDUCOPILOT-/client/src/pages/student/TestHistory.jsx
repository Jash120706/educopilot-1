import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  History,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const TestHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/tests/history');
      const practiceOnly = res.data.filter((attempt) => !attempt.testId);
      setHistory(practiceOnly);
    } catch (err) {
      console.error('Failed to load test history:', err);
      setErrorMsg('Failed to load diagnostic test history.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedAttempt(expandedAttempt === id ? null : id);
  };

  const handleDeleteAttempt = async (attemptId, topic, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete this test attempt for "${topic || 'this topic'}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(attemptId);
      await api.delete(`/student/tests/history/${attemptId}`);
      setHistory(history.filter((h) => h._id !== attemptId));
      setSuccessMsg('Test attempt deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete test attempt:', err);
      setErrorMsg('Failed to delete test attempt.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetAllHistory = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset ALL diagnostic test history? All past scores and weak area records will be cleared. This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setResettingAll(true);
      await api.delete('/student/tests/history');
      setHistory([]);
      setSuccessMsg('All test history and diagnostics have been reset.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to reset test history:', err);
      setErrorMsg('Failed to reset test history.');
    } finally {
      setResettingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading your test history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Reset All Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-600" />
            <span>Diagnostic Test History</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review your performance trends, weak area tags, and previous explanations.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            disabled={resettingAll}
            onClick={handleResetAllHistory}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 transition-colors shadow-2xs self-start sm:self-auto disabled:opacity-50"
          >
            {resettingAll ? (
              <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Reset All Test History</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-xs font-semibold text-green-800 dark:text-green-300 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {history.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            No Practice Tests Taken Yet
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Take an adaptive practice quiz to evaluate your retention and generate personalized analytics.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((attempt) => {
            const isExpanded = expandedAttempt === attempt._id;
            return (
              <div
                key={attempt._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all"
              >
                <div
                  onClick={() => attempt.isReleased !== false && toggleExpand(attempt._id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${attempt.isReleased !== false ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {attempt.subject}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {attempt.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {attempt.topic}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Completed {new Date(attempt.completedAt).toLocaleString()} • {attempt.totalQuestions} Questions
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    {attempt.isReleased === false ? (
                      <div className="text-right flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pending Review</span>
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div
                          className={`text-xl font-extrabold ${
                            attempt.percentage >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : attempt.percentage >= 50
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Score
                        </span>
                      </div>
                    )}

                    {!attempt.testId && (
                      <button
                        type="button"
                        title="Delete this test record"
                        disabled={deletingId === attempt._id}
                        onClick={(e) => handleDeleteAttempt(attempt._id, attempt.topic, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                      >
                        {deletingId === attempt._id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {attempt.isReleased !== false && (
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && attempt.isReleased !== false && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Weak areas */}
                    {attempt.weakAreas && attempt.weakAreas.length > 0 && (
                      <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60">
                        <span className="text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          Identified Weak Topics:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {attempt.weakAreas.map((area, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-xs font-semibold text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Question breakdown */}
                    <div className="space-y-3">
                      {attempt.questions?.map((q, idx) => {
                        const isCorrect = q.isCorrect;
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border ${
                              isCorrect
                                ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50'
                                : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Q{idx + 1}. {q.questionText || q.question}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  isCorrect
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}
                              >
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                              <p>
                                <span className="font-semibold">Your answer:</span> {q.userResponse || q.userTextAnswer || (q.options && q.options[q.userSelectedOption]) || 'No answer'}
                              </p>
                              {!isCorrect && (
                                <p className="text-green-700 dark:text-green-400 font-semibold">
                                  <span>Correct answer:</span> {q.correctAnswer || q.correctTextAnswer || (q.options && q.options[q.correctAnswerIndex])}
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] italic mt-1 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg">
                                  💡 {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestHistory;
