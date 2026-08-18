import React, { useState, useEffect } from 'react';
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
  Shield,
} from 'lucide-react';

const CourseMaterials = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Ingestion Form State
  const [docTitle, setDocTitle] = useState('Operating Systems & Distributed Systems Syllabus');
  const [subject, setSubject] = useState('Computer Science');
  const [subjectCode, setSubjectCode] = useState('CS8591_CN');
  const [department, setDepartment] = useState('CSE');
  const [docType, setDocType] = useState('syllabus'); // 'syllabus' | 'content' | 'notes'
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState(
    `MODULE 1: Distributed Consistency Models & Consensus Algorithms
- Linearizability vs Sequential Consistency vs Eventual Consistency.
- The CAP Theorem: In a distributed data store, it is impossible to simultaneously provide more than two out of Consistency, Availability, and Partition Tolerance.
- Raft Consensus Protocol: Leader election using randomized timers, log replication, safety invariants, and commit index rules.
- Paxos algorithm: Proposers, acceptors, learners, phase 1 (prepare/promise) and phase 2 (accept/accepted).

MODULE 2: Concurrency Invariants & Synchronization
- Race conditions, critical sections, and Mutual Exclusion conditions (Mutual exclusion, Hold and wait, No preemption, Circular wait).
- Semaphore and Mutex implementations in multi-threaded operating systems.
- Optimistic Concurrency Control (OCC) vs Two-Phase Locking (2PL) for transaction isolation.`
  );

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rag/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch indexed documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('docTitle', docTitle);
      formData.append('subject', subject);
      formData.append('subjectCode', subjectCode || '');
      formData.append('department', department || 'CSE');
      formData.append('type', docType || 'content');
      formData.append('courseCode', subjectCode || '');

      if (file) {
        formData.append('file', file);
      }
      if (rawText && rawText.trim()) {
        formData.append('rawText', rawText);
      }

      const res = await api.post('/rag/upload', formData);

      setMessage(res.data.message || `Successfully indexed "${docTitle}" into RAG vector store.`);
      setFile(null);
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to upload and index document.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (title, subj) => {
    if (!window.confirm(`Delete all RAG chunks for "${title}"?`)) return;
    try {
      await api.delete(`/rag/documents/${encodeURIComponent(title)}?subject=${encodeURIComponent(subj)}`);
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document chunks.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderSync className="w-7 h-7 text-blue-600" />
            <span>Faculty RAG Course Knowledge Base</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Upload course syllabi, lecture notes, and textbook chapters. Chunks are strictly isolated to your faculty vault and retrieved during lecture prep and AI grading.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Faculty Vault: {user?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Ingestion Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ingest Syllabus / Material
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

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Syllabus"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Computer Networks"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS8591_CN"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white cursor-pointer"
                  >
                    <option value="CSE">CSE (Computer Science & Engg)</option>
                    <option value="IT">IT (Information Technology)</option>
                    <option value="AI&DS">AI&DS (Artificial Intelligence)</option>
                    <option value="ECE">ECE (Electronics & Comm)</option>
                    <option value="EEE">EEE (Electrical & Electronics)</option>
                    <option value="MECH">MECH (Mechanical Engg)</option>
                    <option value="CIVIL">CIVIL (Civil Engineering)</option>
                    <option value="MBA">MBA (Management Studies)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Document Type *
                  </label>
                  <select
                    required
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white cursor-pointer"
                  >
                    <option value="syllabus">Syllabus / Curriculum Roadmap</option>
                    <option value="content">Course Content & Lecture Material</option>
                    <option value="notes">Faculty Reference Notes</option>
                  </select>
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
                          Click to select PDF / Text document
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
                            if (!docTitle || docTitle.includes('Syllabus')) {
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

              {/* Or Raw Text Paste */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Or Paste Text / Syllabus Outline
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste syllabus modules, lecture notes, or textbook chapters..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Chunking & Indexing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Index into RAG Knowledge Base</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Indexed Documents Library */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Active RAG Knowledge Store ({documents.length} Documents)
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading vector chunks...</div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                No course documents indexed yet. Ingest your first syllabus or chapter using the form on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {doc.subject}
                        </span>
                        {doc.subjectCode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {doc.subjectCode}
                          </span>
                        )}
                        {doc.department && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {doc.department}
                          </span>
                        )}
                        {doc.type && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 capitalize">
                            {doc.type}
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

                    <button
                      onClick={() => handleDelete(doc.docTitle, doc.subject)}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                      title="Delete document chunks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseMaterials;
