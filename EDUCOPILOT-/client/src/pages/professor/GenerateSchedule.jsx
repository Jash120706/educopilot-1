import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  Sparkles,
  Calendar,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Timer,
  AlertTriangle,
  ArrowRight,
  Download,
  ListOrdered,
  Layers,
  Database,
} from 'lucide-react';
import { exportLecturePlanToPDF } from '../../utils/exportUtils';

const GenerateSchedule = () => {
  const navigate = useNavigate();

  // Generator form state
  const [subject, setSubject] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [numPeriods, setNumPeriods] = useState(5);
  const [minutesPerPeriod, setMinutesPerPeriod] = useState(60);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdPlan, setCreatedPlan] = useState(null);

  // New Knowledge Base state
  const [syllabusSource, setSyllabusSource] = useState('upload'); // 'upload' | 'kb'
  const [kbDocuments, setKbDocuments] = useState([]);
  const [selectedDocTitle, setSelectedDocTitle] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    fetchKbDocuments();
  }, []);

  const fetchKbDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/rag/documents');
      setKbDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch knowledge base documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocChange = (docTitle) => {
    setSelectedDocTitle(docTitle);
    const doc = kbDocuments.find((d) => d.docTitle === docTitle);
    if (doc) {
      if (!subject) setSubject(doc.subject);
      if (!courseCode) setCourseCode(doc.courseCode || doc.subjectCode || '');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMsg('');
    setCreatedPlan(null);

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('courseCode', courseCode || 'Course');
      formData.append('syllabus', syllabus);
      formData.append('numPeriods', String(numPeriods));
      formData.append('minutesPerPeriod', String(minutesPerPeriod));
      formData.append('deadline', deadline);

      if (syllabusSource === 'upload' && uploadFile) {
        formData.append('file', uploadFile);
      } else if (syllabusSource === 'kb' && selectedDocTitle) {
        formData.append('selectedDocTitle', selectedDocTitle);
      }

      const res = await api.post('/professor/schedules/generate', formData);
      setCreatedPlan(res.data);
      setSuccessMsg(
        `Generated and saved ${res.data.plan?.length || numPeriods}-period lecture schedule to your database!`
      );
    } catch (err) {
      console.error('Schedule generation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate lecture schedule.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-blue-600" />
            <span>Generate Lecture Schedule</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Convert course syllabi into an AI-sequenced, slot-by-slot prerequisite plan that automatically saves to your database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/professor/schedules')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all self-start sm:self-auto"
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>View Saved Schedules</span>
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

      {/* Main Generator Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Solid Waste Management"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. ENV-401"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Syllabus Source Toggle/Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Syllabus Reference Source
            </label>
            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit mb-4">
              <button
                type="button"
                onClick={() => {
                  setSyllabusSource('upload');
                  setSelectedDocTitle('');
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  syllabusSource === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSyllabusSource('kb');
                  setUploadFile(null);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  syllabusSource === 'kb'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Course Knowledge Base</span>
              </button>
            </div>

            {/* Upload Document Panel */}
            {syllabusSource === 'upload' && (
              <div>
                {uploadFile ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <FileUp className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{uploadFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB • Ready for extraction</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors">
                    <FileUp className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Click to upload Syllabus PDF, DOCX, or TXT
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.docx"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Course Knowledge Base Panel */}
            {syllabusSource === 'kb' && (
              <div className="space-y-3">
                {loadingDocs ? (
                  <div className="p-4 border rounded-2xl text-center text-xs text-slate-400">
                    Loading Knowledge Base documents...
                  </div>
                ) : kbDocuments.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400">
                    No documents found in your Course Knowledge Base.
                    <br />
                    <span className="text-[10px] text-slate-400">
                      Upload materials first in{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/professor/materials')}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Course Materials (RAG)
                      </button>
                    </span>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedDocTitle}
                      onChange={(e) => handleDocChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white cursor-pointer"
                    >
                      <option value="">-- Select a Knowledge Base Document --</option>
                      {kbDocuments.map((doc, idx) => (
                        <option key={idx} value={doc.docTitle}>
                          {doc.docTitle} ({doc.subject} • {doc.courseCode || doc.subjectCode || 'No Code'})
                        </option>
                      ))}
                    </select>
                    {selectedDocTitle && (
                      <div className="mt-2.5 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          AI will ground the schedule generation on document chunks of{' '}
                          <strong>{selectedDocTitle}</strong>. Subject and Course Code have been prefilled.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Syllabus Textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Syllabus Content (Units, Chapters & Topics)
            </label>
            <textarea
              rows={4}
              required={syllabusSource === 'upload' ? !uploadFile : !selectedDocTitle}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Unit I: Definition & Types of Solid Waste. Unit II: Waste Generation Rates & Composition..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
            />
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Number of Periods
              </label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={numPeriods}
                onChange={(e) => {
                  const val = e.target.value;
                  setNumPeriods(val === '' ? '' : parseInt(val, 10) || '');
                }}
                onBlur={() => {
                  if (!numPeriods || Number(numPeriods) < 1) setNumPeriods(5);
                }}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Minutes Per Period
              </label>
              <input
                type="number"
                min="1"
                max="300"
                required
                value={minutesPerPeriod}
                onChange={(e) => {
                  const val = e.target.value;
                  setMinutesPerPeriod(val === '' ? '' : parseInt(val, 10) || '');
                }}
                onBlur={() => {
                  if (!minutesPerPeriod || Number(minutesPerPeriod) < 5) setMinutesPerPeriod(60);
                }}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              generating ||
              !subject ||
              (syllabusSource === 'upload' && !syllabus && !uploadFile) ||
              (syllabusSource === 'kb' && !selectedDocTitle && !syllabus)
            }
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Computing Prerequisite Order & Storing Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate & Store Slot-by-Slot Plan</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* GENERATED RESULT PREVIEW */}
      {createdPlan && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 border-blue-500/50 rounded-3xl shadow-xl space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 uppercase tracking-wider">
                  Stored in Database
                </span>
                <span className="text-xs font-bold text-slate-500">{createdPlan.courseCode}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {createdPlan.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportLecturePlanToPDF(createdPlan)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/professor/schedules')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-all"
              >
                <span>View in Vault</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* At-Risk Topics Alert Banner (if any) */}
          {createdPlan.at_risk_topics && createdPlan.at_risk_topics.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">
                  At-Risk Topics (Exceeding Time Budget):
                </strong>
                <ul className="list-disc pl-4 space-y-1">
                  {createdPlan.at_risk_topics.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Slot Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {createdPlan.plan?.map((slot, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider font-mono">
                    PERIOD {slot.period} • {slot.type || 'lecture'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{createdPlan.minutesPerPeriod || minutesPerPeriod}m</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {slot.topic}
                </h3>

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
                  <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                    {slot.prerequisites && slot.prerequisites.length > 0
                      ? slot.prerequisites.join(', ')
                      : 'None (Foundational)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {createdPlan.notes && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">AI Curriculum Notes: </strong>
              <span>{createdPlan.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerateSchedule;
