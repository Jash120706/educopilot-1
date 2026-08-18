import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  GraduationCap,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  User,
  History,
  TrendingUp,
  FileUp,
  Image,
  Edit3,
  Save,
  Check,
  ChevronRight,
  Shield,
  Layers,
  FileText,
  Send,
  Lock,
  Trash2,
} from 'lucide-react';

const Grading = () => {
  const [history, setHistory] = useState([]);
  const [activeGrading, setActiveGrading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTestFilter, setSelectedTestFilter] = useState('All');

  const handleDownloadCSV = () => {
    if (selectedTestFilter === 'All') return;
    
    // Filter history for the selected test
    const filtered = history.filter(item => (item.assignmentTitle || 'Unspecified Exam') === selectedTestFilter);
    if (filtered.length === 0) return;

    // Header Row
    const headers = [
      'Student Name',
      'Subject',
      'Exam Title',
      'Status',
      'Score Awarded',
      'Max Score',
      'Percentage',
      'Grade',
      'Individualized Feedback',
      'Completed At'
    ];

    // Data Rows
    const rows = filtered.map(item => [
      `"${item.studentName?.replace(/"/g, '""') || ''}"`,
      `"${item.subject?.replace(/"/g, '""') || ''}"`,
      `"${(item.assignmentTitle || 'Unspecified Exam').replace(/"/g, '""')}"`,
      item.isReleased === false ? 'Pending Review' : 'Released',
      item.totalScore || 0,
      item.maxScore || 0,
      `${item.percentage || 0}%`,
      item.overallGrade || 'N/A',
      `"${(item.individualizedFeedback || '').replace(/"/g, '""')}"`,
      item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
    ]);

    // Combine into CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Filename safe characters
    const safeFilename = selectedTestFilter.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `gradesheet_${safeFilename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form State
  const [studentName, setStudentName] = useState('Alex Rivera');
  const [subject, setSubject] = useState('Computer Science');
  const [assignmentTitle, setAssignmentTitle] = useState(
    'Midterm Assessment: Consensus & Concurrency'
  );
  const [rubricCriteria, setRubricCriteria] = useState(
    '20 pts for MCQ correctness. 30 pts for fill-in precision. 50 pts for conceptual depth on Raft leader invariants.'
  );

  // Uploaded Files / Text
  const [qpFile, setQpFile] = useState(null);
  const [ansFile, setAnsFile] = useState(null);
  const [questionPaperText, setQuestionPaperText] = useState(
    `1. [MCQ] Which condition is NOT one of the 4 Coffman deadlock conditions?
Options: (A) Mutual Exclusion, (B) Hold and Wait, (C) Starvation, (D) Circular Wait
2. [FillBlank] In Raft, follower election timeout is randomized between _____ and 300 milliseconds.
3. [Descriptive] Explain how Raft guarantees that a leader never overwrites or deletes its own log entries.`
  );
  const [submissionText, setSubmissionText] = useState(
    `Question 1: (C) Starvation
Question 2: 150ms
Question 3: Raft maintains the Leader Completeness property: if a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms. A candidate cannot win election unless its log is at least as up-to-date as a majority of servers. Once a leader is elected, it only appends new entries, never overwriting or truncating its own log.`
  );

  // Inline Professor Override State
  const [overrideItems, setOverrideItems] = useState([]);
  const [overrideFeedback, setOverrideFeedback] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professor/grading/history');
      setHistory(res.data);
      if (res.data.length > 0 && !activeGrading) {
        selectSubmission(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load grading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectSubmission = (sub) => {
    setActiveGrading(sub);
    setOverrideItems(sub.gradedItems || []);
    setOverrideFeedback(sub.individualizedFeedback || '');
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setEvaluating(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('studentName', studentName);
      formData.append('subject', subject);
      formData.append('assignmentTitle', assignmentTitle);
      formData.append('rubricCriteria', rubricCriteria);
      formData.append('questionPaperText', questionPaperText);
      formData.append('submissionText', submissionText);

      if (qpFile) formData.append('questionPaper', qpFile);
      if (ansFile) formData.append('answerSheet', ansFile);

      const res = await api.post('/professor/grading/extract-and-grade', formData);

      setHistory([res.data, ...history]);
      selectSubmission(res.data);
      setSuccessMsg('Submission evaluated successfully! You can review and override marks below.');
    } catch (err) {
      console.error('Grading error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to evaluate submission.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleUpdateItemMarks = (index, newPoints) => {
    const updated = [...overrideItems];
    updated[index] = {
      ...updated[index],
      awardedPoints: Math.min(Number(newPoints) || 0, updated[index].maxPoints),
    };
    setOverrideItems(updated);
  };

  const handleSaveOverrides = async () => {
    if (!activeGrading) return;
    setSavingOverride(true);
    setError('');

    try {
      const res = await api.put(`/professor/grading/${activeGrading._id}/override`, {
        gradedItems: overrideItems,
        individualizedFeedback: overrideFeedback,
      });

      setSuccessMsg('Feedback and grade released to student successfully!');
      selectSubmission(res.data);
      // Update history record
      setHistory(history.map((h) => (h._id === res.data._id ? res.data : h)));
    } catch (err) {
      console.error('Override error:', err);
      setError(err.response?.data?.error || 'Failed to release grade and feedback.');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteSubmission = async (id, e) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      'Are you sure you want to delete this submission? This will clear the student grade record and reset their exam attempt, allowing them to retake it.'
    );
    if (!confirmed) return;

    try {
      await api.delete(`/professor/grading/${id}`);
      setSuccessMsg('Submission deleted successfully.');
      const updatedHistory = history.filter((h) => h._id !== id);
      setHistory(updatedHistory);
      if (activeGrading?._id === id) {
        if (updatedHistory.length > 0) {
          selectSubmission(updatedHistory[0]);
        } else {
          setActiveGrading(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
      setError('Failed to delete student submission.');
    }
  };

  // Grouping and Filtering
  const distinctTests = Array.from(new Set(history.map(item => item.assignmentTitle || 'Unspecified Exam')));
  const filteredHistory = selectedTestFilter === 'All'
    ? history
    : history.filter(item => (item.assignmentTitle || 'Unspecified Exam') === selectedTestFilter);

  // Calculate live overridden score
  const liveTotalScore = overrideItems.reduce((acc, curr) => acc + Number(curr.awardedPoints || 0), 0);
  const liveMaxScore = overrideItems.reduce((acc, curr) => acc + Number(curr.maxPoints || 0), 0) || activeGrading?.maxScore || 100;
  const livePercentage = Math.round((liveTotalScore / liveMaxScore) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <GraduationCap className="w-7 h-7 text-blue-600" />
          <span>Assessment Auto-Grading & Review</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Upload Question Papers & Student Answer Sheets (PDF / Image OCR / Online). Evaluates mixed question types (MCQ, True/False, Fill-in-the-blank, Short-answer, and Descriptive). Review AI-awarded marks with full manual override control.
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
        {/* Left Column: Exam Submissions History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Student Exam Submissions ({filteredHistory.length})</span>
            </h3>

            {/* SEGREGATION FILTER & EXPORT BUTTON */}
            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Segregate Submissions by Exam
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTestFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTestFilter(val);
                    const filtered = val === 'All' ? history : history.filter(item => (item.assignmentTitle || 'Unspecified Exam') === val);
                    if (filtered.length > 0) {
                      selectSubmission(filtered[0]);
                    } else {
                      setActiveGrading(null);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-650 focus:outline-none dark:text-white cursor-pointer font-semibold"
                >
                  <option value="All">All Assessment Exams ({history.length})</option>
                  {distinctTests.map((tName, i) => {
                    const count = history.filter(h => (h.assignmentTitle || 'Unspecified Exam') === tName).length;
                    return (
                      <option key={i} value={tName}>
                        {tName} ({count})
                      </option>
                    );
                  })}
                </select>

                {selectedTestFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shrink-0 flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                    title="Export Student Grades Sheet (CSV)"
                  >
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Select a student attempt from the list below to review questions, update marks, write feedback, and release their grades.
            </p>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading submissions...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-450">No student submissions found matching this filter.</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredHistory.map((item) => {
                  const isSelected = activeGrading?._id === item._id;
                  const isPending = item.isReleased === false;
                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => selectSubmission(item)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {item.overallGrade || 'B'}
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                              {item.studentName}
                            </p>
                            {isPending ? (
                              <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/60">
                                Released
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {item.assignmentTitle}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Score: {item.totalScore}/{item.maxScore} ({item.percentage}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubmission(item._id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                          title="Delete Student Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assessment Evaluation & Professor Override Panel */}
        <div className="lg:col-span-7 space-y-6">
          {activeGrading ? (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
              {/* Score Banner & Grade */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-200" />
                    <span className="text-xs font-semibold text-blue-100">
                      {activeGrading.studentName} • {activeGrading.subject}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
                    {activeGrading.assignmentTitle}
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl sm:text-3xl font-black">
                      {liveTotalScore}/{liveMaxScore}
                    </p>
                    <p className="text-xs text-blue-200 font-semibold">{livePercentage}% Score</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl">
                    {activeGrading.overallGrade || 'B'}
                  </div>
                </div>
              </div>

              {/* Individualized Constructive Feedback (Editable) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Individualized Constructive Feedback
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    <span>Editable</span>
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={overrideFeedback}
                  onChange={(e) => setOverrideFeedback(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/60 space-y-2">
                  <h4 className="text-xs font-bold text-green-900 dark:text-green-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Identified Strengths</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-green-800 dark:text-green-400">
                    {activeGrading.keyStrengths?.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Areas for Growth</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-400">
                    {activeGrading.areasForGrowth?.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Question-Wise Itemized Breakdown with Live Override Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Question Breakdown & Professor Override</span>
                  </h3>
                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={handleSaveOverrides}
                    className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
                  >
                    {savingOverride ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending feedback...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Release Grade & Send Feedback</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {overrideItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Q{item.questionNumber || idx + 1} ({item.questionType || 'Mixed'})
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.rubricCriterion || 'Criterion'}
                          </span>
                        </div>

                        {/* Awarded Marks Input for Professor Override */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Marks:</span>
                          <input
                            type="number"
                            min={0}
                            max={item.maxPoints || 100}
                            value={item.awardedPoints}
                            onChange={(e) => handleUpdateItemMarks(idx, e.target.value)}
                            className="w-14 px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-600 dark:text-white"
                          />
                          <span className="text-xs font-bold text-slate-500">/ {item.maxPoints}</span>
                        </div>
                      </div>

                      {item.question && (
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.question}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <strong className="text-slate-500 block text-[10px]">Student Answer:</strong>
                          <span className="dark:text-slate-200 font-mono text-[11px]">{item.studentAnswer || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                          <strong className="text-blue-700 dark:text-blue-300 block text-[10px]">Reference Answer:</strong>
                          <span className="dark:text-slate-200 font-mono text-[11px]">{item.referenceAnswer || 'Expected benchmark'}</span>
                        </div>
                      </div>

                      {item.evaluatorNotes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          <strong>AI Evaluator Note:</strong> {item.evaluatorNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Select or evaluate a student submission to view itemized scores, RAG rubric evaluations, and override marks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Grading;
