import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
  Send,
  Mail,
  FileText,
  FileSpreadsheet,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Eye,
  X,
  ListFilter,
  Users,
  UploadCloud,
  Check,
  GraduationCap,
  FolderSync,
  RotateCcw,
} from 'lucide-react';

const ShareNotes = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Pre-fill state if navigated from MaterialPrep vault
  const initialData = location.state || {};

  const [notesTitle, setNotesTitle] = useState(initialData.title || '');
  const [topic, setTopic] = useState(initialData.topic || '');
  const [subject, setSubject] = useState(initialData.subject || '');
  const [courseId, setCourseId] = useState(initialData.subjectCode || '');
  const [notesContent, setNotesContent] = useState(
    initialData.notesContent || initialData.lectureNotes || ''
  );

  const [manualEmails, setManualEmails] = useState('');
  const [excelRoster, setExcelRoster] = useState(null);
  const [attachedDoc, setAttachedDoc] = useState(null);

  // Saved Materials Vault list & RAG Vault list
  const [vaultMaterials, setVaultMaterials] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  const [selectedVaultDocTitle, setSelectedVaultDocTitle] = useState('');
  const [loadingVault, setLoadingVault] = useState(false);

  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Email Preview Modal
  const [showPreview, setShowPreview] = useState(false);

  const handleClearForm = () => {
    setNotesTitle('');
    setTopic('');
    setSubject('');
    setCourseId('');
    setNotesContent('');
    setManualEmails('');
    setExcelRoster(null);
    setAttachedDoc(null);
    setSelectedVaultId('');
    setSelectedVaultDocTitle('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  useEffect(() => {
    fetchVaultMaterials();
  }, []);

  const fetchVaultMaterials = async () => {
    try {
      setLoadingVault(true);
      const [materialsRes, ragDocsRes] = await Promise.all([
        api.get('/professor/materials').catch(() => ({ data: [] })),
        api.get('/rag/documents').catch(() => ({ data: [] })),
      ]);

      const mats = (materialsRes.data || []).map((m) => ({
        ...m,
        isRagDoc: false,
        displayTitle: m.title || m.topic || 'Material',
      }));

      const ragDocs = (ragDocsRes.data || []).map((d) => ({
        _id: `rag_${d.docTitle}`,
        docTitle: d.docTitle,
        title: d.docTitle,
        topic: d.docTitle,
        subject: d.subject || 'General',
        type: 'RAG Document',
        isRagDoc: true,
        displayTitle: `${d.docTitle} (${d.subjectCode || d.subject || 'Vault File'})`,
      }));

      setVaultMaterials([...mats, ...ragDocs]);
    } catch (err) {
      console.error('Failed to load vault materials:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleSelectVaultMaterial = (matId) => {
    setSelectedVaultId(matId);
    if (!matId) {
      setSelectedVaultDocTitle('');
      return;
    }

    const selected = vaultMaterials.find((m) => m._id === matId);
    if (selected) {
      if (selected.isRagDoc) {
        setSelectedVaultDocTitle(selected.docTitle);
        setNotesTitle(`Course Study Material: ${selected.docTitle}`);
        setTopic(selected.docTitle);
        setSubject(selected.subject || '');
        setNotesContent(`Attached Course Reference Document: "${selected.docTitle}" from Course Knowledge Base.`);
        return;
      }

      setSelectedVaultDocTitle(selected.title || selected.topic || 'Vault Material');
      setNotesTitle(selected.title || selected.topic || '');
      setTopic(selected.topic || '');
      setSubject(selected.subject || '');

      let contentVal = '';
      if (selected.content) {
        if (typeof selected.content === 'object') {
          if (selected.content.lectureNotes) {
            contentVal = selected.content.lectureNotes;
          } else if (selected.content.slides && Array.isArray(selected.content.slides)) {
            contentVal = selected.content.slides
              .map(
                (s) =>
                  `### Slide ${s.slideNumber || ''}: ${s.title || ''}\n` +
                  (s.bullets && s.bullets.length > 0 ? s.bullets.map((b) => `- ${b}`).join('\n') : '') +
                  (s.visualSuggestion ? `\n\n*Visual Suggestion:* ${s.visualSuggestion}` : '') +
                  (s.speakerNotes ? `\n\n*Speaker Notes:* ${s.speakerNotes}` : '')
              )
              .join('\n\n---\n\n');
          } else if (selected.content.assignments && Array.isArray(selected.content.assignments)) {
            contentVal =
              (selected.content.instructions ? `**Instructions:** ${selected.content.instructions}\n\n` : '') +
              selected.content.assignments
                .map(
                  (a, i) =>
                    `#### Question ${i + 1} (${a.points || 25} Points)\n${a.question || ''}\n` +
                    (a.rubric ? `\n*Grading Rubric:* ${a.rubric}` : '')
                )
                .join('\n\n');
          } else if (selected.content.practiceQuestions && Array.isArray(selected.content.practiceQuestions)) {
            contentVal = selected.content.practiceQuestions
              .map(
                (q, i) =>
                  `#### Question ${i + 1} (${q.points || 10} Points)\n${q.question || ''}\n` +
                  (q.modelAnswer ? `\n*Model Solution:* ${q.modelAnswer}` : '')
              )
              .join('\n\n');
          } else {
            contentVal = JSON.stringify(selected.content, null, 2);
          }
        } else {
          contentVal = selected.content;
        }
      }
      setNotesContent(contentVal);
    }
  };

  const handleSendEmails = async (e) => {
    e?.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!notesTitle.trim()) {
      setErrorMsg('Please enter a Title for the study notes.');
      return;
    }

    if (!notesContent.trim() && !attachedDoc && !selectedVaultId) {
      setErrorMsg('Please enter Notes Content or choose an attached file/document to share with students.');
      return;
    }

    if (!manualEmails.trim() && !excelRoster) {
      setErrorMsg('Please enter student emails or upload a class Excel roster file.');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('notesTitle', notesTitle.trim());
      formData.append('topic', topic.trim());
      formData.append('subject', subject.trim());
      formData.append('courseId', courseId.trim());
      formData.append('notesContent', notesContent.trim());
      formData.append('manualEmails', manualEmails.trim());
      if (selectedVaultDocTitle) {
        formData.append('vaultDocTitle', selectedVaultDocTitle);
      }
      if (selectedVaultId) {
        formData.append('selectedVaultId', selectedVaultId);
      }

      if (excelRoster) {
        formData.append('excelRoster', excelRoster);
      }
      if (attachedDoc) {
        formData.append('attachedDoc', attachedDoc);
      }

      const res = await api.post('/professor/materials/share-email', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(
        res.data.message ||
          `Successfully dispatched notes email to ${res.data.count} student(s)!`
      );
      setShowPreview(false);
    } catch (err) {
      console.error('Failed to share notes via email:', err);
      const errorDetail = err.response?.data?.error || err.message || '';
      const isAuthErr = errorDetail.toLowerCase().includes('username and password not accepted') || 
                        errorDetail.toLowerCase().includes('auth') || 
                        errorDetail.toLowerCase().includes('smtp');
      setErrorMsg(
        isAuthErr 
          ? `Authentication failed. Hint: Please ensure the sender email account has 2-Step Verification turned ON and you are using a generated Google App Password (not your regular account password).`
          : (errorDetail || 'Failed to dispatch notes email. Please try again.')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold mb-3 border border-white/30">
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail Integration • Teaching Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Share Notes & Study Material
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-2xl leading-relaxed">
            Distribute comprehensive lecture notes, summary guides, and attached documents directly to your students' inbox via Gmail or class Excel rosters.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Notifications */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-3 text-xs sm:text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-bold">{successMsg}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Emails were dispatched via Gmail SMTP. Ask students to check their **Spam or Junk** folder if they cannot locate it.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Note Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>1. Study Material Information</span>
                </h2>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/50 dark:text-slate-300 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Clear all text fields and attachments to start fresh"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Content</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Notes Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={notesTitle}
                    onChange={(e) => setNotesTitle(e.target.value)}
                    placeholder="e.g. Raft Consensus Lecture Summary"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Concept
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Leader Election & Quorums"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Course Name
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Course Code / ID
                  </label>
                  <input
                    type="text"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    placeholder="e.g. CS301"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Lecture Notes Content (Markdown Supported) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Paste or write detailed lecture notes, key takeaways, and revision points here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Step 2: Student Recipients (Gmail Concept) */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                2. Student Recipients (Gmail Distribution)
              </h2>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Manual Student Email List (Comma Separated)
                </label>
                <textarea
                  rows={2}
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder="e.g. alex@student.edu, sophia@student.edu, student3@domain.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Excel Roster Upload */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Upload Student Roster Excel Sheet (.xlsx / .csv)
                  </span>
                  {excelRoster && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                      Roster Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelRoster(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-500">
                  Automatically extracts all student email addresses from any column in the Excel file.
                </p>
              </div>
            </div>

            {/* Step 3: File Attachment (Choose from Course Material Vault or Upload New) */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                3. File Attachment
              </h2>

              {/* Option A: Choose from Vault Materials */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Choose from Course Material (RAG Vault)</span>
                </label>

                {loadingVault ? (
                  <p className="text-xs text-slate-500">Loading saved materials...</p>
                ) : vaultMaterials.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {vaultMaterials.map((mat) => {
                      const isSelected = selectedVaultId === mat._id;
                      return (
                        <button
                          key={mat._id}
                          type="button"
                          onClick={() => handleSelectVaultMaterial(isSelected ? '' : mat._id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/40'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <BookOpen className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                          <span className="truncate max-w-[180px]">{mat.title || mat.topic || 'Material'}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No saved course materials found in your vault.</p>
                )}
              </div>

              {/* Option B: Choose File for New Upload */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Or Upload New File Attachment (.pdf, .txt, .docx, .md)
                </label>
                <input
                  type="file"
                  accept=".pdf, .txt, .docx, .md"
                  onChange={(e) => setAttachedDoc(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Preview Email</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmails}
                disabled={sending}
                className="w-full sm:flex-1 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Notes via Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Info & Preview Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Gmail Dispatch Feature
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This feature uses EduCopilot's integrated Gmail SMTP service to send formal, formatted email announcements containing lecture summaries directly to enrolled students.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Supports manual emails + Excel roster extraction</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Direct link for students to launch portal</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Attach reference documents or textbook chapters</span>
              </div>
            </div>
          </div>

          {/* Quick Preview Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
              Email Subject Preview
            </span>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Lecture Notes & Study Material: {notesTitle || 'Course Study Material'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">Email Preview (Gmail Render)</h3>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-1 text-xs">
                <p><strong>From:</strong> EduCopilot Teaching Suite &lt;{user?.email || 'educopilot8@gmail.com'}&gt;</p>
                <p><strong>To:</strong> {manualEmails || (excelRoster ? excelRoster.name : 'Enrolled Students')}</p>
                <p><strong>Subject:</strong> Lecture Notes & Study Material: {notesTitle}</p>
              </div>

              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-xs space-y-1">
                  <p><strong>Notes Title:</strong> {notesTitle}</p>
                  <p><strong>Topic:</strong> {topic || 'General'}</p>
                  <p><strong>Subject:</strong> {subject || courseId || 'N/A'}</p>
                  <p><strong>Instructor:</strong> Prof. {user?.name || 'Instructor'}</p>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <MarkdownRenderer content={notesContent} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              >
                Close Preview
              </button>
              <button
                onClick={handleSendEmails}
                disabled={sending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareNotes;
