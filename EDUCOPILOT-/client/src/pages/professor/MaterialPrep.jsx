import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
  Layers,
  Sparkles,
  Copy,
  Check,
  Presentation,
  FileText,
  FileCheck,
  BookOpen,
  ChevronRight,
  Upload,
  FileUp,
  HelpCircle,
  Download,
  AlertCircle,
  Eye,
  FileDown,
  Trash2,
  ListOrdered,
  Award,
  Mail,
} from 'lucide-react';
import {
  exportSlidesToPPT,
  exportSlidesToPDF,
  exportNotesToPDF,
  exportAssignmentToPDF,
  exportQuestionsToPDF,
} from '../../utils/exportUtils';

const MaterialPrep = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Generator form state (clean defaults)
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('slides'); // 'slides' | 'notes' | 'assignment' | 'practice_questions'
  const [syllabusRef, setSyllabusRef] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [rawText, setRawText] = useState('');

  // Vault grounding documents selection states
  const [vaultDocs, setVaultDocs] = useState([]);
  const [groundingSource, setGroundingSource] = useState('all_vault'); // 'all_vault' | 'specific_vault' | 'new_upload'
  const [selectedDocTitle, setSelectedDocTitle] = useState('');

  // Customizable parameters for assignment & question bank
  const [questionCount, setQuestionCount] = useState(4);
  const [pointsPerQuestion, setPointsPerQuestion] = useState(25);
  const [slideCount, setSlideCount] = useState(5);

  useEffect(() => {
    fetchMaterials();
    fetchVaultDocs();
  }, []);

  const fetchVaultDocs = async () => {
    try {
      const res = await api.get('/rag/documents');
      setVaultDocs(res.data);
    } catch (err) {
      console.error('Failed to load vault documents:', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professor/materials');
      setMaterials(res.data);
      if (res.data.length > 0 && !activeMaterial) {
        setActiveMaterial(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('topic', topic);
      formData.append('type', type);
      formData.append('syllabusRef', syllabusRef);
      formData.append('questionCount', String(questionCount));
      formData.append('pointsPerQuestion', String(pointsPerQuestion));
      formData.append('slideCount', String(slideCount));

      if (uploadFile && groundingSource === 'new_upload') {
        formData.append('file', uploadFile);
      }
      if (rawText && rawText.trim()) {
        formData.append('rawText', rawText);
      }
      if (groundingSource === 'specific_vault' && selectedDocTitle) {
        formData.append('docTitle', selectedDocTitle);
      }

      const res = await api.post('/professor/materials/generate-with-upload', formData);

      setMaterials((prev) => [res.data, ...prev]);
      setActiveMaterial(res.data);
      setUploadFile(null);
      setRawText('');
      setSuccessMsg('Material generated and saved to vault successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Failed to generate material:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate material.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteMaterial = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this material from the vault?')) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/professor/materials/${id}`);
      const updated = materials.filter((m) => m._id !== id);
      setMaterials(updated);

      if (activeMaterial?._id === id) {
        setActiveMaterial(updated.length > 0 ? updated[0] : null);
      }
      setSuccessMsg('Material removed from vault.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete material:', err);
      setError('Failed to delete material.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (exportFormat = null) => {
    if (!activeMaterial) return;
    setDownloading(true);
    setError('');
    try {
      if (activeMaterial.type === 'slides') {
        if (exportFormat === 'pdf') {
          exportSlidesToPDF(activeMaterial);
        } else {
          await exportSlidesToPPT(activeMaterial);
        }
      } else if (activeMaterial.type === 'notes') {
        exportNotesToPDF(activeMaterial);
      } else if (activeMaterial.type === 'assignment') {
        exportAssignmentToPDF(activeMaterial);
      } else if (activeMaterial.type === 'practice_questions') {
        exportQuestionsToPDF(activeMaterial);
      }
    } catch (err) {
      console.error('Export download error:', err);
      setError(err.message || 'Failed to download file export.');
    } finally {
      setDownloading(false);
    }
  };

  const getFormatIcon = (t) => {
    switch (t) {
      case 'slides':
        return Presentation;
      case 'notes':
        return FileText;
      case 'assignment':
        return FileCheck;
      case 'practice_questions':
        return HelpCircle;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Presentation className="w-7 h-7 text-blue-600" />
          <span>AI Material Preparation (Slides, Notes & Questions)</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Upload PDF textbooks or reference materials to generate grounded lecture slide outlines, comprehensive notes, assignments with customizable points, or formative question banks.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3 text-xs text-green-800 dark:text-green-300">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Material History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Grounded Material
              </h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
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
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Format Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setType(newType);
                      if (newType === 'assignment') {
                        setQuestionCount(4);
                        setPointsPerQuestion(25);
                      } else if (newType === 'practice_questions') {
                        setQuestionCount(5);
                        setPointsPerQuestion(10);
                      } else if (newType === 'slides') {
                        setSlideCount(5);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value="slides">Lecture Slides (.pptx)</option>
                    <option value="notes">Structured Notes (.pdf)</option>
                    <option value="assignment">Assignment with Rubric (.pdf)</option>
                    <option value="practice_questions">Practice Question Bank (.pdf)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Topic / Concept Focus
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Syllabus Benchmark / Chapter Ref
                </label>
                <input
                  type="text"
                  value={syllabusRef}
                  onChange={(e) => setSyllabusRef(e.target.value)}
                  placeholder="Chapter 2: State Machine Replication"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              {/* Dynamic Controls for Assignment */}
              {type === 'assignment' && (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-blue-600" />
                      <span>Assignment Configuration</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[11px]">
                      Total: {questionCount * pointsPerQuestion} Marks
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Number of Questions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Marks per Question
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pointsPerQuestion}
                        onChange={(e) => setPointsPerQuestion(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Controls for Practice Questions Bank */}
              {type === 'practice_questions' && (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <span>Question Bank Configuration</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[11px]">
                      {questionCount} Questions ({questionCount * pointsPerQuestion} Pts)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total Questions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Points per Question
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={pointsPerQuestion}
                        onChange={(e) => setPointsPerQuestion(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Controls for Slide Deck */}
              {type === 'slides' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slide Deck Length (Number of Slides)
                  </label>
                  <select
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  >
                    <option value={4}>4 Slides (Core Overview)</option>
                    <option value={5}>5 Slides (Standard Lecture Deck)</option>
                    <option value={8}>8 Slides (In-Depth Topic Breakdown)</option>
                    <option value={10}>10 Slides (Comprehensive Module)</option>
                  </select>
                </div>
              )}

              {/* Grounding Source Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Grounding Source Context
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGroundingSource('all_vault')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                      groundingSource === 'all_vault'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Vault Docs
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroundingSource('specific_vault')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                      groundingSource === 'specific_vault'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Select Vault Doc
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroundingSource('new_upload')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                      groundingSource === 'new_upload'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    New Upload File
                  </button>
                </div>
              </div>

              {/* Conditional inputs based on grounding source */}
              {groundingSource === 'specific_vault' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Select Vault Document
                  </label>
                  {vaultDocs.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                      No documents in vault. Please upload some first.
                    </div>
                  ) : (
                    <select
                      value={selectedDocTitle}
                      onChange={(e) => setSelectedDocTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                    >
                      <option value="">-- Select a document --</option>
                      {vaultDocs.map((doc, idx) => (
                        <option key={idx} value={doc.docTitle}>
                          {doc.docTitle} ({doc.subjectCode || doc.subject})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {groundingSource === 'new_upload' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Attach PDF or Textbook Chapter (Optional)
                  </label>
                  {uploadFile ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs">
                      <span className="font-bold text-blue-700 dark:text-blue-300 truncate max-w-[200px]">
                        {uploadFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="text-red-600 font-semibold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors">
                      <FileUp className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Upload PDF/Text document to ground generation
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={(e) => setUploadFile(e.target.files[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing from Course Materials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Grounded {type.toUpperCase()}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Materials Library (Prepared Material Vault) */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Prepared Material Vault ({materials.length})</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading materials...</div>
            ) : materials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No materials drafted yet.</div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {materials.map((m) => {
                  const Icon = getFormatIcon(m.type);
                  const isSelected = activeMaterial?._id === m._id;
                  const isDeleting = deletingId === m._id;

                  return (
                    <div
                      key={m._id}
                      onClick={() => setActiveMaterial(m)}
                      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {m.title || m.topic}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                            <span>{m.type}</span>
                            <span>•</span>
                            <span className="truncate">{m.subject}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMaterial(m._id, e)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Delete material from vault"
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

        {/* Right Column: Material Viewer & Slide Preview Cards */}
        <div className="lg:col-span-7 space-y-6">
          {activeMaterial ? (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      {activeMaterial.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {activeMaterial.subject}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {activeMaterial.title || activeMaterial.topic}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeMaterial.type === 'slides' ? (
                    <>
                      <button
                        onClick={() => handleDownload('pptx')}
                        disabled={downloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                        title="Download PowerPoint presentation (.pptx)"
                      >
                        {downloading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download Slides (.pptx)</span>
                      </button>
                      <button
                        onClick={() => handleDownload('pdf')}
                        disabled={downloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
                        title="Download Slide Deck as PDF document (.pdf)"
                      >
                        {downloading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                        <span>Download Slides (.pdf)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDownload()}
                      disabled={downloading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                      title="Download PDF document"
                    >
                      {downloading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {downloading
                          ? 'Exporting...'
                          : activeMaterial.type === 'notes'
                          ? 'Download Notes (.pdf)'
                          : activeMaterial.type === 'assignment'
                          ? 'Download Assignment (.pdf)'
                          : 'Download Question Bank (.pdf)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* RENDER SLIDES */}
              {activeMaterial.type === 'slides' && activeMaterial.content?.slides && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {activeMaterial.content.slides.map((slide, idx) => (
                      <div
                        key={idx}
                        className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white rounded-3xl space-y-4 shadow-sm relative overflow-hidden"
                      >
                        {/* Diagonal Translucent Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                          <span className="text-6xl font-black rotate-[-45deg] tracking-widest text-slate-900 dark:text-white">EDUCOPILOT</span>
                        </div>
                        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-2">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 font-extrabold bg-slate-50 dark:bg-slate-800">
                            SLIDE {slide.slideNumber || idx + 1}
                          </span>
                          <span className="text-xs text-slate-900 dark:text-white font-black uppercase tracking-wider">
                            EduCopilot Slide Deck
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{slide.title}</h3>
                        <ul className="space-y-2.5 pl-5 list-disc text-sm text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                          {slide.bullets?.map((b, bi) => (
                            <li key={bi}>{b.replace(/\*\*/g, '')}</li>
                          ))}
                        </ul>


                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RENDER NOTES */}
              {activeMaterial.type === 'notes' && (
                <div className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
                  {/* Diagonal Translucent Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                    <span className="text-6xl font-black rotate-[-45deg] tracking-widest text-slate-900 dark:text-white">EDUCOPILOT</span>
                  </div>
                  <div className="relative z-10">
                    <MarkdownRenderer content={activeMaterial.content?.lectureNotes || ''} />
                  </div>
                </div>
              )}

              {/* RENDER ASSIGNMENT */}
              {activeMaterial.type === 'assignment' && activeMaterial.content?.assignments && (
                <div className="space-y-4">
                  {activeMaterial.content.instructions && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs text-slate-900 dark:text-white font-bold">
                      <strong>Submission Instructions:</strong> {activeMaterial.content.instructions}
                    </div>
                  )}
                  {activeMaterial.content.assignments.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-3xl space-y-3 shadow-sm relative overflow-hidden"
                    >
                      {/* Diagonal Translucent Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                        <span className="text-5xl font-black rotate-[-45deg] tracking-widest text-slate-900 dark:text-white">EDUCOPILOT</span>
                      </div>
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-2">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 font-extrabold bg-slate-50 dark:bg-slate-800">
                            ASSIGNMENT QUESTION {idx + 1}
                          </span>
                          <span className="text-xs text-slate-900 dark:text-white font-black px-2 py-0.5 rounded border border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800">
                            {item.points || 25} Points
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                          {item.question}
                        </p>
                        {item.rubric && (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-900 dark:border-slate-100 text-[11px] text-slate-900 dark:text-slate-300 font-bold">
                            <strong>Grading Rubric:</strong> {item.rubric}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER PRACTICE QUESTIONS */}
              {activeMaterial.type === 'practice_questions' && activeMaterial.content?.practiceQuestions && (
                <div className="space-y-4">
                  {activeMaterial.content.practiceQuestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-3xl space-y-3 shadow-sm relative overflow-hidden"
                    >
                      {/* Diagonal Translucent Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                        <span className="text-5xl font-black rotate-[-45deg] tracking-widest text-slate-900 dark:text-white">EDUCOPILOT</span>
                      </div>
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-2">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 font-extrabold bg-slate-50 dark:bg-slate-800">
                            QUESTION {idx + 1} [{item.difficulty?.toUpperCase() || 'MEDIUM'}]
                          </span>
                          <span className="text-xs text-slate-900 dark:text-white font-black px-2 py-0.5 rounded border border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800">
                            {item.points || 10} Points
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                          {item.question}
                        </p>
                        {item.modelAnswer && (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-900 dark:border-slate-100 text-xs text-slate-900 dark:text-slate-300 font-bold">
                            <strong>Model Solution:</strong> {item.modelAnswer}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Select or generate a course material to view grounded slides, notes, assignments, or practice questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialPrep;
