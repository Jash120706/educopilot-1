import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Award
} from 'lucide-react';

const ProfExams = () => {
  const { user } = useAuth();

  // Mode: 'config' | 'running' | 'results'
  const [mode, setMode] = useState('config');
  const [enteredAccessCode, setEnteredAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [startingTest, setStartingTest] = useState(false);
  const [error, setError] = useState('');

  // Active Running Exam State
  const [currentTest, setCurrentTest] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [evaluatedResult, setEvaluatedResult] = useState(null);

  // Fullscreen Security & Violation State
  const [violationCount, setViolationCount] = useState(0);
  const [warningModal, setWarningModal] = useState(null); // null | 'warning1' | 'warning2' | 'autoSubmitted'
  const [lastViolationTimestamp, setLastViolationTimestamp] = useState(0);

  // History / Results State
  const [examAttempts, setExamAttempts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);

  useEffect(() => {
    fetchExamHistory();
  }, [mode]);

  const fetchExamHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/student/tests/history');
      // Only keep official exams (those with a testId associated)
      const official = res.data.filter((attempt) => attempt.testId);
      setExamAttempts(official);
    } catch (err) {
      console.error('Failed to load official exam history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Timer Effect for active exam
  useEffect(() => {
    let timer = null;
    if (mode === 'running' && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, timeRemaining]);

  // Server Heartbeat Effect for active official exam session
  useEffect(() => {
    let heartbeatTimer = null;
    if (mode === 'running' && currentTest && activeSessionId) {
      heartbeatTimer = setInterval(async () => {
        try {
          const hbRes = await api.post('/student/tests/heartbeat', {
            testId: currentTest._id,
            sessionId: activeSessionId,
          });
          if (hbRes.data?.violationCount !== undefined) {
            setViolationCount(hbRes.data.violationCount);
          }
        } catch (err) {
          console.error('[Heartbeat] Failed:', err);
          const errMsg = err.response?.data?.error || 'Exam session expired or opened on another device.';
          setError(`Session Terminated: ${errMsg}`);
          setMode('config');
          setCurrentTest(null);
          setActiveSessionId('');
        }
      }, 20000); // 20s heartbeat
    }
    return () => clearInterval(heartbeatTimer);
  }, [mode, currentTest, activeSessionId]);

  // Fullscreen & Prohibited Navigation Monitoring Effect (Official Assessments Only)
  useEffect(() => {
    if (mode !== 'running' || !currentTest || !activeSessionId) return;

    // Trigger Fullscreen Mode
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const reportViolation = async (type) => {
      const now = Date.now();
      // Debounce multiple browser events (e.g. fullscreenchange + blur fired together) within 2.5 seconds
      if (now - lastViolationTimestamp < 2500) return;
      setLastViolationTimestamp(now);

      try {
        const res = await api.post('/student/tests/official/violation', {
          testId: currentTest._id,
          sessionId: activeSessionId,
          violationType: type,
          userAnswers,
        });

        const newCount = res.data.violationCount || 0;
        setViolationCount(newCount);

        if (res.data.autoSubmitted) {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          setWarningModal('autoSubmitted');
          setEvaluatedResult(res.data.evaluatedResult || null);
          setMode('results');
        } else if (newCount === 1) {
          setWarningModal('warning1');
        } else if (newCount === 2) {
          setWarningModal('warning2');
        }
      } catch (err) {
        console.error('[ViolationReport] Error:', err);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && mode === 'running') {
        reportViolation('FullscreenExit');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && mode === 'running') {
        reportViolation('TabSwitch');
      }
    };

    const handleWindowBlur = () => {
      if (mode === 'running') {
        reportViolation('WindowBlur');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [mode, currentTest, activeSessionId, userAnswers, lastViolationTimestamp]);

  const handleUnlockExam = async (e) => {
    e.preventDefault();
    if (!enteredAccessCode.trim()) return;

    setStartingTest(true);
    setCodeError('');
    setError('');

    try {
      const clientSessionId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `sess_${Date.now()}_${Math.random()}`;

      // Fetch test details using access code and clientSessionId
      const res = await api.post('/student/tests/unlock-by-code', {
        accessCode: enteredAccessCode.trim(),
        sessionId: clientSessionId,
      });

      // Load test and start runner
      setCurrentTest(res.data);
      setActiveSessionId(res.data.activeSessionId || clientSessionId);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeRemaining((res.data.durationMinutes || 15) * 60);
      setEnteredAccessCode('');
      setMode('running');
    } catch (err) {
      console.error('Failed to unlock exam:', err);
      setCodeError(err.response?.data?.error || 'Failed to unlock exam. Check the code and try again.');
    } finally {
      setStartingTest(false);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    setUserAnswers({
      ...userAnswers,
      [qIdx]: optIdx,
    });
    setError('');
  };

  const handleTextInputAnswer = (qIdx, text) => {
    setUserAnswers({
      ...userAnswers,
      [qIdx]: text,
    });
    setError('');
  };

  const handleSubmitTest = async () => {
    if (!currentTest) return;

    // Check if all questions are answered
    const unansweredIndices = [];
    for (let i = 0; i < currentTest.questions.length; i++) {
      const answer = userAnswers[i];
      if (
        answer === undefined ||
        answer === null ||
        (typeof answer === 'string' && answer.trim() === '')
      ) {
        unansweredIndices.push(i);
      }
    }

    if (unansweredIndices.length > 0) {
      setError('All questions are compulsory to submit the test. Please attend all the questions.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const durationTaken =
        (currentTest.durationMinutes ? currentTest.durationMinutes * 60 : 900) - (timeRemaining > 0 ? timeRemaining : 0);

      const res = await api.post('/student/tests/submit-comprehensive', {
        testId: currentTest._id,
        sessionId: activeSessionId,
        subject: currentTest.subject,
        topic: currentTest.topic || 'Assessment Exam',
        difficulty: currentTest.difficulty || 'Medium',
        questionTypeFilter: 'Mixed',
        sourceMaterialTitle: currentTest.title || 'Online Exam',
        questions: currentTest.questions,
        userAnswers,
        timeTakenSeconds: durationTaken,
      });

      setEvaluatedResult(res.data);
      setMode('results');
      setActiveSessionId('');
    } catch (err) {
      console.error('Failed to submit exam:', err);
      setError('An error occurred while submitting your answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExitTest = () => {
    const confirmed = window.confirm(
      'Are you sure you want to exit? Your progress will be lost and you will not be able to resume or restart this exam.'
    );
    if (confirmed) {
      setMode('config');
      setCurrentTest(null);
      setActiveSessionId('');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleExpandAttempt = (id) => {
    setExpandedAttemptId(expandedAttemptId === id ? null : id);
  };

  const currentQ = currentTest?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentTest && currentQuestionIndex === currentTest.questions.length - 1;

  return (
    <div className="space-y-8">
      {/* 1. HEADER */}
      {mode !== 'running' && (
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-amber-600" />
            <span>Professor Assigned Exams</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Access and attend official assessment exams shared by your professor, and check graded results once released.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. CONFIGURATION / ENTRY VIEW */}
      {mode === 'config' && (
        <div className="space-y-8">
          {/* Unlock Card */}
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Unlock Assigned Exam
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the access code provided by your professor to unlock and start the exam.
                </p>
              </div>
            </div>

            {codeError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-850 rounded-xl flex items-start gap-2 text-xs text-red-800 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{codeError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Exam Access Code
                </label>
                <input
                  type="text"
                  required
                  value={enteredAccessCode}
                  onChange={(e) => setEnteredAccessCode(e.target.value)}
                  placeholder="e.g. CS301-TEST"
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white font-mono font-bold tracking-wider uppercase text-center"
                />
              </div>

              <button
                type="submit"
                disabled={startingTest || !enteredAccessCode.trim()}
                className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {startingTest ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Unlock & Start Exam</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Graded & History Log */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Exam Submission Log & Feedback Vault</span>
            </h2>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading exams record...</div>
            ) : examAttempts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-450 border border-dashed rounded-2xl">
                No official exam submissions found yet. Unlock an exam using the panel above to begin.
              </div>
            ) : (
              <div className="space-y-4">
                {examAttempts.map((attempt) => {
                  const isExpanded = expandedAttemptId === attempt._id;
                  const isReleased = attempt.isReleased !== false;

                  return (
                    <div
                      key={attempt._id}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/50 hover:border-slate-300 transition-colors"
                    >
                      <div
                        onClick={() => isReleased && toggleExpandAttempt(attempt._id)}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                          isReleased ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'cursor-default'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">
                              {attempt.courseId ? `${attempt.courseId} - ${attempt.subject}` : attempt.subject}
                            </span>
                            {attempt.professorName && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                Prof. {attempt.professorName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Submitted {new Date(attempt.completedAt).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                            {attempt.topic}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isReleased ? (
                            <div className="text-right">
                              <div className="text-sm font-extrabold text-green-600 dark:text-green-400">
                                {attempt.score}/{attempt.totalMaxPoints} ({attempt.percentage}%)
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                Grade Released
                              </span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-250 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Awaiting Review</span>
                            </div>
                          )}

                          {isReleased && (
                            <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded View for Released Grades */}
                      {isExpanded && isReleased && (
                        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-5">
                          {/* Diagnostic and Professor Feedback Banner */}
                          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 flex gap-3 text-xs">
                            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-extrabold text-blue-900 dark:text-blue-200 block">
                                Professor Feedback & Grading Summary
                              </span>
                              <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-mono">
                                {attempt.aiDiagnosticFeedback || 'No custom overall feedback text written.'}
                              </p>
                            </div>
                          </div>

                          {/* Strengths & Weak Areas if available */}
                          {(attempt.strengths?.length > 0 || attempt.weakAreas?.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {attempt.strengths?.length > 0 && (
                                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-xl">
                                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                                    Mastered Concepts:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {attempt.strengths.map((s, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-150 text-[10px] font-bold text-emerald-800">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {attempt.weakAreas?.length > 0 && (
                                <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/60 rounded-xl">
                                  <span className="text-xs font-bold text-orange-850 dark:text-orange-350 block mb-1">
                                    Areas for Growth:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {attempt.weakAreas.map((w, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded bg-orange-150 text-[10px] font-bold text-orange-800">
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Question Paper Review List */}
                          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Detailed Question Breakdown
                            </h4>

                            {attempt.questions?.map((q, qIdx) => (
                              <div
                                key={qIdx}
                                className={`p-4 rounded-xl border ${
                                  q.isCorrect
                                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/60'
                                    : 'bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/60'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[11px] font-bold text-slate-500">
                                    Question {qIdx + 1}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                      q.isCorrect
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                    }`}
                                  >
                                    {q.isCorrect ? `Correct (+${q.awardedPoints || q.points} pts)` : `Incorrect (0/${q.points} pts)`}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                                  {q.question}
                                </p>

                                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-350">
                                  <div>
                                    <span className="font-semibold text-slate-500">Your Answer: </span>
                                    <span className="font-mono text-slate-800 dark:text-slate-100">
                                      {q.userSelectedOption !== null && q.options?.length > 0
                                        ? q.options[q.userSelectedOption]
                                        : q.userTextAnswer || 'No response'}
                                    </span>
                                  </div>

                                  {!q.isCorrect && (
                                    <div>
                                      <span className="font-semibold text-slate-500">Correct Answer: </span>
                                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                                        {q.correctAnswerIndex !== null && q.options?.length > 0
                                          ? q.options[q.correctAnswerIndex]
                                          : q.correctTextAnswer || 'N/A'}
                                      </span>
                                    </div>
                                  )}

                                  {q.rubricFeedback && (
                                    <div className="mt-3 p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-750/70 text-xs">
                                      <span className="font-bold text-slate-500 block mb-1">
                                        Professor Comments:
                                      </span>
                                      <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {q.rubricFeedback}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. RUNNING TEST WORKSPACE */}
      {mode === 'running' && currentTest && currentQ && (
        <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Official Exam: {currentTest.subject}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Q{currentQuestionIndex + 1} of {currentTest.questions.length} ({currentQ.questionType || 'MCQ'})
                </span>
                <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-450">
                  {currentQ.points || 1} {currentQ.points === 1 ? 'mark' : 'marks'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleExitTest}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-slate-650 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Exit
                </button>
              </div>
            </div>

            {(currentTest.professorName || currentTest.courseId) && (
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pl-1 font-semibold flex-wrap">
                {currentTest.courseId && (
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400 uppercase">Course ID:</span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">{currentTest.courseId}</span>
                  </span>
                )}
                {currentTest.courseId && currentTest.professorName && <span className="text-slate-300 dark:text-slate-700">•</span>}
                {currentTest.professorName && (
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">Instructor:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Prof. {currentTest.professorName}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h3>
            {currentQ.topicTag && (
              <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                Topic: {currentQ.topicTag}
              </span>
            )}
          </div>

          {/* MCQ / TrueFalse */}
          {(currentQ.questionType === 'MCQ' || currentQ.questionType === 'TrueFalse' || (!currentQ.questionType && currentQ.options?.length > 0)) && (
            <div className="space-y-3">
              {currentQ.options?.map((opt, optIdx) => {
                const isSelected = userAnswers[currentQuestionIndex] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestionIndex, optIdx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-900 dark:text-amber-100 font-semibold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-355 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 text-slate-500'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span className="text-xs sm:text-sm">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill Blank */}
          {currentQ.questionType === 'FillBlank' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Type your answer:
              </label>
              <input
                type="text"
                value={userAnswers[currentQuestionIndex] || ''}
                onChange={(e) => handleTextInputAnswer(currentQuestionIndex, e.target.value)}
                placeholder="Enter missing term..."
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
              />
            </div>
          )}

          {/* Short Answer */}
          {(currentQ.questionType === 'ShortAnswer' || currentQ.questionType === 'Descriptive') && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Your Explanation:
              </label>
              <textarea
                rows={4}
                value={userAnswers[currentQuestionIndex] || ''}
                onChange={(e) => handleTextInputAnswer(currentQuestionIndex, e.target.value)}
                placeholder="Type conceptual answer..."
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white font-mono"
              />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-650 dark:text-slate-350 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTest}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Submit Examination</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. SUCCESS SUBMISSION BANNER */}
      {mode === 'results' && evaluatedResult && (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Exam Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your response for <strong>{evaluatedResult.topic}</strong> has been securely uploaded and sent to your professor's grading console.
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              In accordance with class policy, scores and question feedback are hidden until reviewed and released by your professor.
            </p>
          </div>

          <button
            onClick={() => {
              setMode('config');
              setEvaluatedResult(null);
              setCurrentTest(null);
            }}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* SECURITY WARNING MODALS */}
      {warningModal === 'warning1' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Security Warning 1 of 2
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Prohibited Navigation Detected
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Official professor assessments must remain in <strong>Fullscreen Mode</strong>. Exiting full-screen, switching tabs, or opening other windows is strictly monitored.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWarningModal(null);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all"
            >
              I Understand & Resume Exam (Enter Fullscreen)
            </button>
          </div>
        </div>
      )}

      {warningModal === 'warning2' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-red-600 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 uppercase tracking-wider">
                FINAL SECURITY WARNING (2 of 2)
              </span>
              <h3 className="text-lg font-extrabold text-red-600 dark:text-red-400">
                Next Violation Will Auto-Submit Exam
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                Exiting full-screen mode or navigating away ONE MORE TIME will automatically lock your test, save your current answers, and notify your professor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWarningModal(null);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all"
            >
              Return to Exam Immediately (Enter Fullscreen)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfExams;
