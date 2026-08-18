import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Sparkles,
  CalendarDays,
  FileUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  FileText,
  Layers,
} from 'lucide-react';

const GenerateStudyPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dynamic Courses State
  const [coursesList, setCoursesList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // RAG Vault Documents State
  const [vaultDocs, setVaultDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocTitle, setSelectedDocTitle] = useState(location.state?.selectedDoc || '');

  // Form State - Clean initial values
  const [subjectCode, setSubjectCode] = useState(location.state?.subjectCode || '');
  const [subject, setSubject] = useState(location.state?.subject || '');
  const [topic, setTopic] = useState(location.state?.selectedDoc || 'Semester Exam Revision');
  const [targetExamDate, setTargetExamDate] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [rawNotes, setRawNotes] = useState('');

  // Uploaded Files
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [timetableFile, setTimetableFile] = useState(null);
  const [studyMaterialFile, setStudyMaterialFile] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchVaultDocs();
  }, []);

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
      console.error('Failed to load courses for study planner:', err);
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
        const found = res.data.find((d) => d.docTitle === location.state.selectedDoc);
        if (found) {
          setSelectedDocTitle(found.docTitle);
          setSubject(found.subject);
          setTopic(found.docTitle);
          if (found.subjectCode) setSubjectCode(found.subjectCode);
        }
      }
    } catch (err) {
      console.error('Failed to load RAG vault documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectVaultDoc = (doc) => {
    if (selectedDocTitle === doc.docTitle) {
      setSelectedDocTitle('');
    } else {
      setSelectedDocTitle(doc.docTitle);
      setSubject(doc.subject);
      setTopic(doc.docTitle);
      if (doc.subjectCode) setSubjectCode(doc.subjectCode);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('subject', subject || topic || 'General');
      formData.append('subjectCode', subjectCode || '');
      formData.append('topic', topic);
      formData.append('targetExamDate', targetExamDate);
      formData.append('durationDays', durationDays);
      formData.append('rawNotes', rawNotes);
      formData.append('selectedDocTitle', selectedDocTitle);

      if (syllabusFile) formData.append('syllabusFile', syllabusFile);
      if (timetableFile) formData.append('timetableFile', timetableFile);
      if (studyMaterialFile) formData.append('studyMaterialFile', studyMaterialFile);

      const res = await api.post('/student/study-plans/generate-from-materials', formData);

      setSuccessMsg('Personalized study roadmap successfully synthesized!');
      
      // Navigate to View Study Plans page with the created plan selected
      setTimeout(() => {
        navigate('/student/study-plans', { state: { selectedPlanId: res.data._id } });
      }, 1200);
    } catch (err) {
      console.error('Failed to generate study plan:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate study plan.');
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              AI Roadmap Generator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-blue-600" />
            <span>Generate Study Plan</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Synthesize an AI-optimized, day-by-day learning schedule grounded in your syllabus, lecture notes, or timetable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/study-plans')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <span>View Existing Plans</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-xs font-semibold text-green-800 dark:text-green-300 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p>{successMsg}</p>
            <p className="text-[11px] text-green-700 dark:text-green-400 font-normal">Redirecting to your visual study plan tracker...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300 shadow-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Centered Study Plan Parameters Form */}
      <form
        onSubmit={handleGeneratePlan}
        className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Study Plan Parameters
            </h2>
          </div>
          <Link
            to="/student/materials-rag"
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Manage RAG Vault ({vaultDocs.length} Docs)</span>
          </Link>
        </div>

        {/* 1. SELECT FROM RAG KNOWLEDGE VAULT */}
        {vaultDocs.length > 0 && (
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <FolderSync className="w-4 h-4 text-blue-600" />
                <span>Select from Your Indexed RAG Vault:</span>
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
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Click an uploaded document below to automatically ground your study roadmap with its syllabus and lecture content:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {vaultDocs.map((doc, idx) => {
                const isSelected = selectedDocTitle === doc.docTitle;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectVaultDoc(doc)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate max-w-[200px]">{doc.docTitle}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                      {doc.subject}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedDocTitle && (
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 pt-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Grounded on Vault Document: "{selectedDocTitle}"</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Topic or Exam Goal
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic or syllabus unit to cover..."
            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Plan Duration
            </label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
            >
              <option value={3}>3 Days (Crash Prep / Revision)</option>
              <option value={5}>5 Days (Intensive Focus)</option>
              <option value={7}>7 Days (1 Week Standard Mastery)</option>
              <option value={10}>10 Days (Extended Deep-Dive)</option>
              <option value={14}>14 Days (2 Weeks Comprehensive)</option>
              <option value={30}>30 Days (Full Semester Prep)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Target Exam / Completion Date
            </label>
            <input
              type="date"
              value={targetExamDate}
              onChange={(e) => setTargetExamDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Upload Supporting Materials */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Attach Supporting Documents (Optional)
          </label>
          <label className="flex items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 transition-colors group">
            <FileUp className="w-5 h-5 mr-2.5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
              {studyMaterialFile
                ? studyMaterialFile.name
                : syllabusFile
                ? syllabusFile.name
                : 'Attach Supporting Material / Syllabus (PDF, Doc, Text)'}
            </span>
            <input
              type="file"
              accept=".pdf,.txt,.md,.docx,.doc"
              onChange={(e) => {
                const file = e.target.files[0] || null;
                setStudyMaterialFile(file);
                setSyllabusFile(file);
              }}
              className="hidden"
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Outline, Chapters, or Topic Notes
          </label>
          <textarea
            rows={3}
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Paste syllabus modules, chapters, or specific focus areas..."
            className="w-full px-4 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={generating}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Study Roadmap...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Study Plan & Open Tracker</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GenerateStudyPlan;
