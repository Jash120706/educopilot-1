import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  FolderSync,
  Upload,
  FileText,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileUp,
  BookOpen,
  CalendarDays,
  HelpCircle,
  Search,
  Shield,
  Eye,
  X,
  GraduationCap,
  Filter,
  User,
} from 'lucide-react';

const StudentMaterials = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'personal'

  // Faculty Materials State
  const [facultyMaterials, setFacultyMaterials] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewChunks, setPreviewChunks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Personal Notes State
  const [personalDocs, setPersonalDocs] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Personal Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [subjectCode, setSubjectCode] = useState('CS8591_CN');
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    fetchFacultyMaterials();
    fetchPersonalDocs();
  }, []);

  const fetchFacultyMaterials = async () => {
    try {
      setLoadingFaculty(true);
      const res = await api.get('/student/course-materials');
      setFacultyMaterials(res.data);
    } catch (err) {
      console.error('Failed to fetch faculty course materials:', err);
    } finally {
      setLoadingFaculty(false);
    }
  };

  const fetchPersonalDocs = async () => {
    try {
      setLoadingPersonal(true);
      const res = await api.get('/rag/documents');
      setPersonalDocs(res.data);
    } catch (err) {
      console.error('Failed to fetch personal notes:', err);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const handleOpenPreview = async (doc) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    try {
      const res = await api.get(
        `/student/course-materials/preview?docTitle=${encodeURIComponent(doc.docTitle)}&subjectCode=${encodeURIComponent(
          doc.subjectCode || ''
        )}`
      );
      setPreviewChunks(res.data);
    } catch (err) {
      console.error('Failed to load document preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleUploadPersonal = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('docTitle', docTitle || (file ? file.name.replace(/\.[^/.]+$/, '') : 'My Study Notes'));
      formData.append('subject', subject);
      formData.append('subjectCode', subjectCode || '');
      formData.append('courseCode', subjectCode || '');
      formData.append('type', 'notes');

      if (file) {
        formData.append('file', file);
      }
      if (rawText && rawText.trim()) {
        formData.append('rawText', rawText);
      }

      const res = await api.post('/rag/upload', formData);

      setMessage(res.data.message || 'Successfully indexed notes into your private knowledge base.');
      setFile(null);
      setRawText('');
      setDocTitle('');
      fetchPersonalDocs();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to upload notes.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePersonal = async (title, subj) => {
    if (!window.confirm(`Delete "${title}" from your personal notes?`)) return;
    try {
      await api.delete(`/rag/documents/${encodeURIComponent(title)}?subject=${encodeURIComponent(subj)}`);
      fetchPersonalDocs();
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  // Filter faculty materials dynamically by search query, department, and type
  const filteredFaculty = facultyMaterials.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      doc.docTitle?.toLowerCase().includes(q) ||
      doc.subject?.toLowerCase().includes(q) ||
      doc.subjectCode?.toLowerCase().includes(q) ||
      doc.department?.toLowerCase().includes(q) ||
      doc.professorName?.toLowerCase().includes(q) ||
      doc.previewText?.toLowerCase().includes(q);

    const matchesDept = selectedDept === 'All' || doc.department === selectedDept;
    const matchesType = selectedType === 'All' || doc.type === selectedType;

    return matchesQuery && matchesDept && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderSync className="w-7 h-7 text-blue-600" />
            <span>Course Knowledge Hub & Private RAG Vault</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Index your private course notes and curriculum documents into your local RAG vault to ground AI doubt chats and practice tests.
          </p>
        </div>
      </div>

      {/* MY PRIVATE NOTES (UPLOAD & INGEST) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Form for Student */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Private Notes / Syllabus (PDF)
              </h2>
            </div>

            {message && (
              <div className="mb-4 p-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded-xl flex items-start gap-2.5 text-xs text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUploadPersonal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Document / Notes Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Revision Notes"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

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
                    placeholder="Computer Networks"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="CS8591_CN"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              {/* Upload PDF Option */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Upload PDF / Text File
                </label>
                {file ? (
                  <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB • Ready to index
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0 ml-2 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <FileUp className="w-6 h-6 text-slate-400 mb-1" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Click to select PDF or Text document
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, TXT, or MD (up to 15MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={(e) => {
                          const selected = e.target.files[0];
                          if (selected) {
                            setFile(selected);
                            if (!docTitle) {
                              setDocTitle(selected.name.replace(/\.[^/.]+$/, ''));
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Or Paste Raw Text */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Or Paste Notes Text
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lecture notes, study summaries, or textbook excerpts..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || (!file && (!rawText || rawText.trim().length < 10))}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Chunking & Indexing Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Chunk & Index for RAG</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Private Notes List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  My Private Uploaded Notes ({personalDocs.length})
                </h2>
              </div>
            </div>

            {loadingPersonal ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading your notes...</div>
            ) : personalDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                No private notes uploaded yet. Use the form on the left to add your personal notes.
              </div>
            ) : (
              <div className="space-y-3">
                {personalDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {doc.subject}
                        </span>
                        {doc.subjectCode && (
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            {doc.subjectCode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {doc.docTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {doc.chunkCount} vector chunks • Approx {doc.totalTokens} tokens
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/student/doubt-chat"
                        state={{ selectedDoc: doc.docTitle, subject: doc.subject, subjectCode: doc.subjectCode }}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                      >
                        Doubt
                      </Link>
                      <Link
                        to="/student/practice-tests"
                        state={{ selectedDoc: doc.docTitle, subject: doc.subject, subjectCode: doc.subjectCode }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold"
                      >
                        Quiz
                      </Link>
                      <button
                        onClick={() => handleDeletePersonal(doc.docTitle, doc.subject)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* DOCUMENT PREVIEW MODAL (READ-ONLY) */}
      {/* ==================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {previewDoc.subjectCode || 'Course'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{previewDoc.subject}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {previewDoc.docTitle}
                </h3>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Chunks */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loadingPreview ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading document text...</div>
              ) : previewChunks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No readable text found for this document.</div>
              ) : (
                previewChunks.map((chunk, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Section Chunk #{chunk.chunkIndex}</span>
                      <span>{chunk.tokenCount || 0} tokens</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {chunk.chunkText}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Link
                to="/student/doubt-chat"
                state={{
                  selectedDoc: previewDoc.docTitle,
                  subject: previewDoc.subject,
                  subjectCode: previewDoc.subjectCode,
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Ask Doubts on This Material
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;
