import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { exportTestToPDF } from '../../utils/exportUtils';
import {
  FilePlus,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Sparkles,
  Layers,
  ShieldCheck,
  Building2,
  Calendar,
  FileUp,
  FolderSync,
  FileText,
  HelpCircle,
  Wand2,
  ListChecks,
  AlignLeft,
  PenTool,
  CheckSquare,
  Check,
} from 'lucide-react';

const CreateTest = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [accessCode, setAccessCode] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [studentExcel, setStudentExcel] = useState(null);
  const [manualEmails, setManualEmails] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [questionsConfirmed, setQuestionsConfirmed] = useState(false);

  // AI Generation Generator State (Multi-File Selection Supported)
  const [showAiGenPanel, setShowAiGenPanel] = useState(true);
  const [ragDocs, setRagDocs] = useState([]);
  const [loadingRagDocs, setLoadingRagDocs] = useState(false);
  const [selectedDocTitles, setSelectedDocTitles] = useState([]);
  const [genQuestionType, setGenQuestionType] = useState('Mixed'); // 'Mixed' | 'MCQ' | 'ShortAnswer' | 'FillBlank' | 'TrueFalse'
  const [genQuestionCount, setGenQuestionCount] = useState(5);
  const [genDifficulty, setGenDifficulty] = useState('Medium');
  const [uploadFile, setUploadFile] = useState(null);
  const [genRawText, setGenRawText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Questions array
  const [questions, setQuestions] = useState([]);

  const [createdTests, setCreatedTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.name) {
      setProfessorName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (subjectCode) {
      setCourseId(subjectCode);
    }
  }, [subjectCode]);

  useEffect(() => {
    fetchProfessorTests();
    fetchRagDocuments();
  }, []);

  const fetchProfessorTests = async () => {
    try {
      setFetching(true);
      const res = await api.get('/professor/tests');
      setCreatedTests(res.data);
    } catch (err) {
      console.error('Failed to load professor tests:', err);
    } finally {
      setFetching(false);
    }
  };

  const fetchRagDocuments = async () => {
    try {
      setLoadingRagDocs(true);
      const res = await api.get('/rag/documents');
      setRagDocs(res.data || []);
    } catch (err) {
      console.error('Failed to load RAG vault documents:', err);
    } finally {
      setLoadingRagDocs(false);
    }
  };

  const handleToggleDocTitle = (docTitle) => {
    if (selectedDocTitles.includes(docTitle)) {
      setSelectedDocTitles(selectedDocTitles.filter((t) => t !== docTitle));
    } else {
      setSelectedDocTitles([...selectedDocTitles, docTitle]);
    }
  };

  const handleGenerateFromMaterial = async (e) => {
    e?.preventDefault();
    setGenerating(true);
    setGenError('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('subjectCode', subjectCode);
      formData.append('department', department);
      formData.append('year', year);
      formData.append('topic', topic || subject || 'Course Examination');
      formData.append('difficulty', genDifficulty);
      formData.append('questionCount', genQuestionCount);
      formData.append('questionType', genQuestionType);
      formData.append('selectedDocTitles', JSON.stringify(selectedDocTitles));
      formData.append('rawText', genRawText);

      if (uploadFile) {
        formData.append('file', uploadFile);
      }

      const res = await api.post('/professor/tests/generate-from-material', formData);

      if (!res.data.questions || res.data.questions.length === 0) {
        setGenError('Could not extract questions from the selected material. Try choosing another document or providing syllabus text.');
        setGenerating(false);
        return;
      }

      // Auto populate test metadata if not already filled by user
      if (!title || title.trim().length === 0) {
        setTitle(res.data.suggestedTitle || `${subjectCode || subject || 'Course'} Examination`);
      }
      if (!topic || topic.trim().length === 0) {
        setTopic(res.data.suggestedTopic || 'Course Materials Review');
      }

      // Set the generated questions in state
      setQuestions(res.data.questions);
      setQuestionsConfirmed(false);
      setSuccess(`Successfully generated ${res.data.questions.length} ${genQuestionType} questions strictly grounded in selected material!`);
    } catch (err) {
      console.error('AI Test Generation Error:', err);
      setGenError(err.response?.data?.error || err.message || 'Failed to generate test from material.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddQuestion = (type = 'MCQ') => {
    const newQ = {
      questionType: type,
      question: '',
      options: type === 'MCQ' ? ['', '', '', ''] : type === 'TrueFalse' ? ['True', 'False'] : [],
      correctAnswerIndex: 0,
      correctTextAnswer: type === 'TrueFalse' ? 'True' : '',
      points: type === 'ShortAnswer' ? 3 : 2,
      explanation: '',
      topicTag: topic || '',
    };
    setQuestions([...questions, newQ]);
    setQuestionsConfirmed(false);
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
    setQuestionsConfirmed(false);
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;

    if (field === 'questionType') {
      if (value === 'MCQ') {
        if (!updated[idx].options || updated[idx].options.length !== 4) {
          updated[idx].options = ['', '', '', ''];
        }
        updated[idx].correctAnswerIndex = 0;
      } else if (value === 'TrueFalse') {
        updated[idx].options = ['True', 'False'];
        updated[idx].correctAnswerIndex = 0;
        updated[idx].correctTextAnswer = 'True';
      } else {
        updated[idx].options = [];
      }
    }

    setQuestions(updated);
    setQuestionsConfirmed(false);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
    setQuestionsConfirmed(false);
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (questions.length === 0) {
        setError('Please add or generate at least one question before publishing.');
        setLoading(false);
        return;
      }

      if (questions.some((q) => !q.question.trim())) {
        setError('Please fill out all question statements before submitting.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('topic', topic || title);
      formData.append('subjectCode', subjectCode);
      formData.append('subject', subject);
      formData.append('difficulty', difficulty);
      formData.append('durationMinutes', Number(durationMinutes));
      formData.append('accessCode', accessCode.trim());
      formData.append('professorName', professorName.trim());
      formData.append('courseId', courseId.trim());
      formData.append('availableFrom', availableFrom);
      formData.append('expiresAt', expiresAt);
      formData.append('questions', JSON.stringify(questions));
      formData.append('manualEmails', manualEmails.trim());

      if (studentExcel) {
        formData.append('studentExcel', studentExcel);
      }

      if (availableFrom && expiresAt && new Date(expiresAt) <= new Date(availableFrom)) {
        setError('Expiration time (Expires At) must be after the Available From start time.');
        setLoading(false);
        return;
      }

      const res = await api.post('/professor/tests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`Test "${res.data.title}" published successfully!`);
      setTitle('');
      setTopic('');
      setAccessCode('');
      setAvailableFrom('');
      setExpiresAt('');
      setStudentExcel(null);
      setManualEmails('');
      setQuestionsConfirmed(false);
      const fileInput = document.getElementById('studentExcelInput');
      if (fileInput) fileInput.value = '';
      fetchProfessorTests();
    } catch (err) {
      console.error('Failed to create test:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create test.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTest = async (id) => {
    if (!window.confirm('Are you sure you want to manually END this test? Students will no longer be able to start new attempts.')) return;
    try {
      const res = await api.put(`/professor/tests/${id}/end`);
      setSuccess(res.data.message || 'Test ended successfully.');
      fetchProfessorTests();
    } catch (err) {
      console.error('Failed to end test:', err);
      setError(err.response?.data?.error || err.message || 'Failed to end test.');
    }
  };

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    try {
      await api.delete(`/professor/tests/${id}`);
      setCreatedTests(createdTests.filter((t) => t._id !== id));
    } catch (err) {
      alert('Failed to delete test.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <FilePlus className="w-7 h-7 text-blue-600" />
          <span>Create & Manage Scoped Assessment Tests</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Publish curriculum-scoped tests for students based on Department, Year, and Subject Code. Auto-generate tests directly from uploaded Course Materials & RAG Vaults, supporting MCQs, Short Answer, Fill-in-the-blanks, and True/False questions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3 text-xs text-green-800 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* SECTION 1: AI TEST AUTO-GENERATOR FROM COURSE MATERIAL */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-100 dark:from-slate-900 dark:via-indigo-950 dark:to-blue-950 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-md dark:shadow-xl border border-blue-100 dark:border-indigo-800/50 space-y-6 transition-all duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Test Auto-Generator from Course Material</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30">
                  RAG Powered
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-indigo-200 mt-0.5">
                Select 1, 2, or more indexed files to generate questions grounded strictly in your selected course materials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAiGenPanel(!showAiGenPanel)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors"
          >
            {showAiGenPanel ? 'Collapse Generator' : 'Expand Generator'}
          </button>
        </div>

        {showAiGenPanel && (
          <form onSubmit={handleGenerateFromMaterial} className="space-y-6">
            {genError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{genError}</span>
              </div>
            )}

            {/* Multi-Source Document Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>1. Select Course Material Sources (Support Multi-File Units)</span>
                </label>
                {selectedDocTitles.length > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200">
                    {selectedDocTitles.length} file(s) selected
                  </span>
                )}
              </div>

              {loadingRagDocs ? (
                <div className="text-xs text-indigo-600 dark:text-indigo-300 p-3 bg-slate-200/35 dark:bg-white/5 rounded-xl">Loading vault documents...</div>
              ) : ragDocs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ragDocs.map((doc, idx) => {
                    const isSelected = selectedDocTitles.includes(doc.docTitle);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleDocTitle(doc.docTitle)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/40'
                            : 'bg-slate-200/50 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-indigo-100 border-slate-200 dark:border-indigo-700/50'
                        }`}
                      >
                        <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                        <span className="truncate max-w-[200px]">{doc.docTitle}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-white" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-slate-200/35 dark:bg-white/5 rounded-xl text-xs text-slate-600 dark:text-indigo-300">
                  No indexed course documents found in vault. You can upload a document file or paste syllabus text below.
                </div>
              )}
            </div>

            {/* Direct File Upload or Text Fallback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
                  Upload PDF / Text File directly (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-600 dark:text-indigo-200 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
                  Or Paste Topic / Syllabus Text Excerpt
                </label>
                <input
                  type="text"
                  value={genRawText}
                  onChange={(e) => setGenRawText(e.target.value)}
                  placeholder="e.g. Profit & Loss, Work & Time, Permutations or Raft Consensus"
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-700/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-indigo-400/60"
                />
              </div>
            </div>

            {/* 2. Select Test Type & Question Formats */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-indigo-800/60">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>2. Choose Test Type / Question Format</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'Mixed', label: 'Mixed Format', icon: Wand2, desc: 'MCQ + Fill-Blank + Short Answer' },
                  { id: 'MCQ', label: 'MCQ Test', icon: ListChecks, desc: '4 Choice Multiple Choice' },
                  { id: 'ShortAnswer', label: 'Short Answer', icon: AlignLeft, desc: '1-3 sentence explanations' },
                  { id: 'FillBlank', label: 'Fill in Blanks', icon: PenTool, desc: 'Complete sentence blanks' },
                  { id: 'TrueFalse', label: 'True / False', icon: CheckSquare, desc: 'Binary True vs False' },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = genQuestionType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGenQuestionType(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                          : 'bg-slate-200/50 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-indigo-100 border-slate-200 dark:border-indigo-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] opacity-80 line-clamp-1">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Question Count & Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
                  Number of Questions
                </label>
                <select
                  value={genQuestionCount}
                  onChange={(e) => setGenQuestionCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-700/60 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={8}>8 Questions</option>
                  <option value={10}>10 Questions (Full Test)</option>
                  <option value={15}>15 Questions (Exam Bank)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
                  Target Difficulty
                </label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-700/60 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Adaptive">Adaptive</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      <span>Generate {genQuestionType} Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 2: TEST CONFIGURATION & SECURITY RULES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Test Configuration & Security Rules
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            Access Code Protected
          </span>
        </div>

        <form onSubmit={handleCreateTest} className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Test Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quantitative Aptitude Unit Test 1"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Topic Focus
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Logical Reasoning & Profit/Loss"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. APT101 or CS301"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subject Title
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Aptitude & Reasoning or Distributed Systems"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Adaptive">Adaptive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Available From (Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span>Expires At (Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Professor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={professorName}
                onChange={(e) => setProfessorName(e.target.value)}
                placeholder="e.g. Dr. Jane Doe"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Course ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="e.g. APT101"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white uppercase font-bold"
              />
            </div>

            {/* OPTION B ACCESS CODE FIELD */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Access Code (Required) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="e.g. q101 or RAFT2026"
                className="w-full px-3.5 py-2.5 text-sm bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white font-mono font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                🔑 Exam Access Protection: Students must enter this code to unlock and start the exam.
              </p>
            </div>
          </div>

          {/* SECTION 3: QUESTION BUILDER (MANUAL & AI POPULATED) */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Test Questions ({questions.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Review and customize questions. Supports MCQ, Fill-in-the-blanks, Short Answer, and True/False formats.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('MCQ')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ MCQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('FillBlank')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Fill Blank</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('ShortAnswer')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Short Answer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('TrueFalse')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ True/False</span>
                </button>

                {questions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      exportTestToPDF({
                        title: title || 'Assigned Examination',
                        topic: topic || title || 'Assessment Exam',
                        subjectCode,
                        subject,
                        difficulty,
                        durationMinutes,
                        questions,
                        professorName,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 shadow-md shadow-emerald-500/25 active:scale-95 transition-all border border-emerald-500"
                    title="Download exam paper as offline print-ready PDF with watermark"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download Exam PDF</span>
                  </button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No test questions added yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
                    Use the <strong>AI Test Auto-Generator</strong> panel above to generate questions from your course materials, or click any of the <strong>+ Add Question</strong> buttons above to add questions manually.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MCQ')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    + Add MCQ Question
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('FillBlank')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                  >
                    + Add Fill Blank
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ShortAnswer')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-sm"
                  >
                    + Add Short Answer
                  </button>
                </div>
              </div>
            ) : (
              questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 relative shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Question #{qIdx + 1}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                        q.questionType === 'MCQ'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : q.questionType === 'FillBlank'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : q.questionType === 'ShortAnswer'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                      }`}
                    >
                      {q.questionType === 'MCQ'
                        ? 'Multiple Choice (MCQ)'
                        : q.questionType === 'FillBlank'
                        ? 'Fill in the Blank'
                        : q.questionType === 'ShortAnswer'
                        ? 'Short Answer'
                        : 'True / False'}
                    </span>
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Question Statement
                  </label>
                  <input
                    type="text"
                    required
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                    placeholder={
                      q.questionType === 'FillBlank'
                        ? 'e.g. Complete statement with missing _____ term.'
                        : 'Enter question statement here...'
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-medium"
                  />
                </div>

                {/* Question Format Selector & Points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Question Format
                    </label>
                    <select
                      value={q.questionType}
                      onChange={(e) => handleQuestionChange(qIdx, 'questionType', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="TrueFalse">True / False</option>
                      <option value="FillBlank">Fill in the Blank</option>
                      <option value="ShortAnswer">Short Answer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Points Allocated
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={q.points || 2}
                      onChange={(e) => handleQuestionChange(qIdx, 'points', Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Topic Tag
                    </label>
                    <input
                      type="text"
                      value={q.topicTag || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'topicTag', e.target.value)}
                      placeholder="Subtopic Tag"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>
                </div>

                {/* Dynamic Answer Key Editor per Question Type */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  {/* 1. MCQ Options */}
                  {q.questionType === 'MCQ' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase text-slate-500">
                          MCQ Options (Select the correct option):
                        </label>
                        <select
                          value={q.correctAnswerIndex}
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            handleQuestionChange(qIdx, 'correctAnswerIndex', idx);
                            handleQuestionChange(qIdx, 'correctTextAnswer', q.options[idx] || '');
                          }}
                          className="px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 font-bold"
                        >
                          {q.options?.map((_, i) => (
                            <option key={i} value={i}>
                              Correct Choice: Option {String.fromCharCode(65 + i)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                                q.correctAnswerIndex === optIdx
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. True / False */}
                  {q.questionType === 'TrueFalse' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-slate-500">
                        Select Correct Answer:
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf-${qIdx}`}
                            checked={q.correctAnswerIndex === 0}
                            onChange={() => {
                              handleQuestionChange(qIdx, 'correctAnswerIndex', 0);
                              handleQuestionChange(qIdx, 'correctTextAnswer', 'True');
                            }}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>True</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf-${qIdx}`}
                            checked={q.correctAnswerIndex === 1}
                            onChange={() => {
                              handleQuestionChange(qIdx, 'correctAnswerIndex', 1);
                              handleQuestionChange(qIdx, 'correctTextAnswer', 'False');
                            }}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 3. Fill in the Blank ("Fill up") */}
                  {q.questionType === 'FillBlank' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-slate-500">
                        Expected Blank Answer Term (Case-Insensitive Match):
                      </label>
                      <input
                        type="text"
                        required
                        value={q.correctTextAnswer}
                        onChange={(e) => handleQuestionChange(qIdx, 'correctTextAnswer', e.target.value)}
                        placeholder="e.g. election timers"
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono font-bold"
                      />
                      <p className="text-[11px] text-slate-500">
                        💡 Tip: Students will fill the missing term in the blank "____" during the test.
                      </p>
                    </div>
                  )}

                  {/* 4. Short Answer */}
                  {q.questionType === 'ShortAnswer' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase text-slate-500">
                        Model Answer Key & Grading Rubric:
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={q.correctTextAnswer}
                        onChange={(e) => handleQuestionChange(qIdx, 'correctTextAnswer', e.target.value)}
                        placeholder="Enter model explanation and essential keywords for AI evaluation..."
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono"
                      />
                    </div>
                  )}

                  {/* Explanation Field */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Explanation / Feedback for Students
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                      placeholder="Explanation displayed to students after submitting..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white text-slate-600"
                    />
                  </div>
                </div>
              </div>
            )))}
          </div>

          {questions.length > 0 && !questionsConfirmed && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200">Review complete?</span> Please confirm the questions above to unlock student invitations and publishing options.
              </div>
              <button
                type="button"
                onClick={() => setQuestionsConfirmed(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Questions</span>
              </button>
            </div>
          )}

          {questions.length > 0 && questionsConfirmed && (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 mt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Questions Confirmed & Locked</span>
              </div>
              <button
                type="button"
                onClick={() => setQuestionsConfirmed(false)}
                className="text-xs text-slate-505 hover:text-blue-650 font-semibold underline"
              >
                Edit Questions
              </button>
            </div>
          )}

          {questionsConfirmed ? (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Excel Upload Option */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                    <FileUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>Invite Students via Excel (Optional)</span>
                  </label>
                  <input
                    id="studentExcelInput"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setStudentExcel(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/40 dark:file:text-blue-300 dark:hover:file:bg-blue-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Upload an Excel sheet containing student email addresses.
                  </p>
                </div>

                {/* Manual Input Option */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-650" />
                    <span>Invite Students Manually (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    placeholder="e.g. student1@gmail.com, student2@gmail.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-650 focus:outline-none dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Enter student email addresses separated by commas.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Publish Test for Students</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            questions.length > 0 && (
              <div className="p-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-2 bg-slate-50/10 dark:bg-slate-800/20 mt-6">
                <Lock className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Publishing Options Locked</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Please review your questions and click **Confirm Questions** above to unlock student email invitations and publishing controls.
                </p>
              </div>
            )
          )}
        </form>
      </div>

      {/* SECTION 4: LIST OF PUBLISHED TESTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>Your Published Tests ({createdTests.length})</span>
        </h3>

        {fetching ? (
          <div className="p-4 text-xs text-slate-500">Loading tests...</div>
        ) : createdTests.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-2xl">
            No tests created yet. Use the AI Generator or manual builder above to publish your first test.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdTests.map((testDoc) => (
              <div
                key={testDoc._id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 relative group shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        {testDoc.courseId ? `${testDoc.courseId} • ` : ''}{testDoc.subjectCode} • {testDoc.subject}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                          testDoc.status === 'Ended'
                            ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                            : testDoc.status === 'Expired'
                            ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : testDoc.status === 'Scheduled'
                            ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                            : testDoc.status === 'Draft'
                            ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {testDoc.status || 'Active'}
                      </span>
                    </div>

                    {testDoc.professorName && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                        By Prof. {testDoc.professorName}
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{testDoc.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTest(testDoc._id)}
                    className="text-red-600 hover:text-red-700 p-1 opacity-80 hover:opacity-100 transition-opacity"
                    title="Delete Test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {testDoc.durationMinutes} mins
                  </span>
                  <span>•</span>
                  <span>{testDoc.questions?.length || 0} Questions</span>
                  <span>•</span>
                  <span className="font-semibold">{testDoc.difficulty}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Code: {testDoc.accessCode}</span>
                    </span>
                    {testDoc.expiresAt && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Expires: {new Date(testDoc.expiresAt).toLocaleDateString()} {new Date(testDoc.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {testDoc.status !== 'Ended' && (
                    <button
                      type="button"
                      onClick={() => handleEndTest(testDoc._id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm active:scale-95 transition-all flex items-center gap-1"
                      title="Manually end test now (blocks new student attempts)"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>End Test</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateTest;
