import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  FileCheck2,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  FileUp,
  TrendingUp,
  BookmarkPlus,
  Layers,
  AlertCircle,
  Flame,
  FolderSync,
  FileText,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Building2,
  GraduationCap,
} from 'lucide-react';

const PracticeTests = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Tab State: 'assigned' (Professor Assigned Scoped Tests) | 'custom' (Self AI Generator)
  const [activeTab, setActiveTab] = useState('assigned');

  // Option A & Option B Assigned Tests State
  const [availableTests, setAvailableTests] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedTestForCode, setSelectedTestForCode] = useState(null);
  const [enteredAccessCode, setEnteredAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [startingTest, setStartingTest] = useState(false);

  // Dynamic Course Catalog State
  const [coursesList, setCoursesList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // RAG Vault Documents State
  const [vaultDocs, setVaultDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocTitle, setSelectedDocTitle] = useState(location.state?.selectedDoc || '');

  // Test Config State
  const [subjectCode, setSubjectCode] = useState(location.state?.subjectCode || '');
  const [subject, setSubject] = useState(location.state?.subject || '');
  const [topic, setTopic] = useState(location.state?.selectedDoc || 'Comprehensive Exam');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('Mixed');
  const [uploadFile, setUploadFile] = useState(null);
  const [rawText, setRawText] = useState('');

  // Flow State: 'config' | 'running' | 'results'
  const [mode, setMode] = useState('config');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Active Test State
  const [currentTest, setCurrentTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [evaluatedResult, setEvaluatedResult] = useState(null);

  useEffect(() => {
    fetchAvailableTests();
    fetchCourses();
    fetchVaultDocs();
  }, []);

  const fetchAvailableTests = async () => {
    try {
      setLoadingAvailable(true);
      const res = await api.get('/student/available-tests');
      setAvailableTests(res.data);
    } catch (err) {
      console.error('Failed to fetch available scoped tests:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await api.get('/student/courses');
      setCoursesList(res.data);
      if (!location.state?.subjectCode && res.data.length > 0) {
        setSubjectCode(res.data[0].subjectCode);
        setSubject(res.data[0].subject);
      }
    } catch (err) {
      console.error('Failed to fetch courses for quizzes:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchVaultDocs = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/rag/documents');
      setVaultDocs(res.data);

      if (location.state?.selectedDoc) {
        const match = res.data.find((d) => d.docTitle === location.state.selectedDoc);
        if (match) {
          setSelectedDocTitle(match.docTitle);
          setSubject(match.subject);
          setTopic(match.docTitle);
          if (match.subjectCode) setSubjectCode(match.subjectCode);
        }
      }
    } catch (err) {
      console.error('Failed to load RAG vault documents for quizzes:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Timer Effect
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

  // Start Assigned Test (Option A Scoping + Option B Access Code Verification)
  const handleStartAssignedTest = async (testItem, providedCode = '') => {
    setStartingTest(true);
    setCodeError('');
    setError('');

    try {
      const res = await api.post(`/student/tests/${testItem._id}/start`, {
        accessCode: providedCode,
      });

      // Access granted! Load full test questions and start runner
      setCurrentTest(res.data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeRemaining((res.data.durationMinutes || 15) * 60);
      setSelectedTestForCode(null);
      setEnteredAccessCode('');
      setMode('running');
    } catch (err) {
      console.error('Start assigned test error:', err);
      const errMsg = err.response?.data?.error || 'Failed to access test.';
      if (selectedTestForCode) {
        setCodeError(errMsg);
      } else {
        setError(errMsg);
      }
    } finally {
      setStartingTest(false);
    }
  };

  const handleStartCustomTest = async (e) => {
    e?.preventDefault();
    setGenerating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('subjectCode', subjectCode || '');
      formData.append('topic', topic);
      formData.append('difficulty', difficulty);
      formData.append('questionCount', questionCount);
      formData.append('questionType', questionType);
      formData.append('selectedDocTitle', selectedDocTitle);

      if (uploadFile) {
        formData.append('file', uploadFile);
      }
      if (rawText && rawText.trim()) {
        formData.append('rawText', rawText);
      }

      const res = await api.post('/student/tests/generate-from-material', formData);

      if (!res.data.questions || res.data.questions.length === 0) {
        setError('No test questions could be generated. Please refine your topic or study material.');
        setGenerating(false);
        return;
      }

      setCurrentTest(res.data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeRemaining((res.data.questions.length || 4) * 90);
      setMode('running');
    } catch (err) {
      console.error('Failed to generate custom test:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate practice test.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    setUserAnswers({
      ...userAnswers,
      [qIdx]: optIdx,
    });
  };

  const handleTextInputAnswer = (qIdx, text) => {
    setUserAnswers({
      ...userAnswers,
      [qIdx]: text,
    });
  };

  const handleSubmitTest = async () => {
    if (!currentTest) return;
    setSubmitting(true);
    setError('');

    try {
      const durationTaken =
        (currentTest.durationMinutes ? currentTest.durationMinutes * 60 : (currentTest.questions?.length || 4) * 90) - (timeRemaining > 0 ? timeRemaining : 0);

      const res = await api.post('/student/tests/submit-comprehensive', {
        testId: currentTest._id,
        subject: currentTest.subject || subject,
        topic: currentTest.topic || topic,
        difficulty: currentTest.difficulty || difficulty,
        questionTypeFilter: questionType,
        sourceMaterialTitle: currentTest.sourceMaterialTitle || currentTest.title || '',
        questions: currentTest.questions,
        userAnswers,
        timeTakenSeconds: durationTaken,
      });

      setEvaluatedResult(res.data);
      setMode('results');

      if (res.data.percentage >= 80) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to submit test:', err);
      setError('Failed to evaluate test results.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetCurrentTest = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset this test? All your current answers and the timer will be reset.'
    );
    if (!confirmed) return;
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setTimeRemaining((currentTest?.durationMinutes ? currentTest.durationMinutes * 60 : (currentTest?.questions?.length || 4) * 90));
  };

  const handleExitTest = () => {
    const confirmed = window.confirm(
      'Are you sure you want to exit this test? Unsubmitted answers will be discarded.'
    );
    if (!confirmed) return;
    setMode('config');
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setCurrentTest(null);
  };

  const currentQ = currentTest?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentTest && currentQuestionIndex === currentTest.questions.length - 1;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-blue-600" />
          <span>AI Self-Practice Generator</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Generate custom AI practice quizzes grounded dynamically in your private study notes and RAG vault.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. CONFIGURATION VIEW */}
      {mode === 'config' && (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Configure Grounded AI Practice Test
                </h2>
              </div>
              <Link
                to="/student/materials-rag"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>Vault ({vaultDocs.length} Docs)</span>
              </Link>
            </div>

            {/* RAG Knowledge Vault Quick Selector */}
            {vaultDocs.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <FolderSync className="w-4 h-4 text-blue-600" />
                    <span>Ground Quiz with Your RAG Vault Document:</span>
                  </label>
                  {selectedDocTitle && (
                    <button
                      type="button"
                      onClick={() => setSelectedDocTitle('')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {vaultDocs.map((doc, idx) => {
                    const isSelected = selectedDocTitle === doc.docTitle;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDocTitle(doc.docTitle);
                          setSubject(doc.subject);
                          setSubjectCode(doc.subjectCode || '');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        {doc.docTitle} ({doc.subject})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ingest Form */}
            <form onSubmit={handleStartCustomTest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS6001"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value="Easy">Easy (Conceptual Recall)</option>
                    <option value="Medium">Medium (Balanced Analysis)</option>
                    <option value="Hard">Hard (Scenario & Synthesis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Question Types
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value="Mixed">Mixed (All formats)</option>
                    <option value="MCQ">MCQ (Multiple Choice)</option>
                    <option value="TrueFalse">True / False</option>
                    <option value="FillBlank">Fill in the Blanks</option>
                    <option value="ShortAnswer">Short Subjective / Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Question Count
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value={3}>3 Questions (Quick Check)</option>
                    <option value={5}>5 Questions (Standard)</option>
                    <option value={8}>8 Questions (In-Depth)</option>
                    <option value={10}>10 Questions (Mock Exam)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Topic / Chapter Focus
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Raft Consensus Algorithm & Invariants"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Custom Practice Test</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. RUNNING TEST VIEW (MULTI-TYPE QUESTION RUNNER) */}
      {mode === 'running' && currentTest && currentQ && (
        <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                {currentTest.subject || subject}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Q{currentQuestionIndex + 1} of {currentTest.questions.length} ({currentQ.questionType || 'MCQ'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatTime(timeRemaining)}</span>
              </div>

              <button
                type="button"
                onClick={handleResetCurrentTest}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleExitTest}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <span>Exit</span>
              </button>
            </div>
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
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-900 dark:text-blue-100 font-semibold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
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
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
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
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono"
              />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40"
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
                    <span>Submit Practice Test</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. EVALUATION RESULTS VIEW */}
      {mode === 'results' && evaluatedResult && (
        <div className="max-w-3xl mx-auto space-y-6">
          {evaluatedResult.isReleased === false ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Assessment Test Submitted Successfully!
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your response for <strong>{evaluatedResult.topic}</strong> has been securely recorded and routed to your professor for evaluation and feedback.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Once your professor reviews and releases the grades, your score and detailed feedback will be available in your Test History.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-bold backdrop-blur-md">
                  Test Completed!
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold">{evaluatedResult.topic}</h2>
                <p className="text-xs sm:text-sm text-blue-100">{evaluatedResult.subject}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-black">
                    {evaluatedResult.score}/{evaluatedResult.totalMaxPoints || evaluatedResult.totalQuestions}
                  </p>
                  <p className="text-xs text-blue-200 font-semibold">{evaluatedResult.percentage}% Score</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl">
                  <Award className="w-8 h-8 text-amber-300" />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('config');
                setEvaluatedResult(null);
                setCurrentTest(null);
                fetchAvailableTests();
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Available Tests</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeTests;
