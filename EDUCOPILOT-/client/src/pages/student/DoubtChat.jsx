import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
  HelpCircle,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageSquare,
  Bot,
  User,
  History,
  PlusCircle,
  GraduationCap,
  FolderSync,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

const DoubtChat = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Dynamic Course List State
  const [coursesList, setCoursesList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // RAG Vault Documents
  const [vaultDocs, setVaultDocs] = useState([]);
  const [selectedDocTitle, setSelectedDocTitle] = useState(location.state?.selectedDoc || '');

  const [subjectCode, setSubjectCode] = useState(location.state?.subjectCode || '');
  const [subject, setSubject] = useState(location.state?.subject || '');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [expandedSources, setExpandedSources] = useState({});
  const [deletingDoubtId, setDeletingDoubtId] = useState(null);
  const [clearingDoubts, setClearingDoubts] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchCourses();
    fetchHistory();
    fetchVaultDocs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchVaultDocs = async () => {
    try {
      const res = await api.get('/rag/documents');
      setVaultDocs(res.data);
      if (location.state?.selectedDoc) {
        const found = res.data.find((d) => d.docTitle === location.state.selectedDoc);
        if (found) {
          setSelectedDocTitle(found.docTitle);
          setSubject(found.subject);
          if (found.subjectCode) setSubjectCode(found.subjectCode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vault docs for doubts:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/student/doubts/history');
      setHistoryList(res.data);
      if (res.data.length > 0 && messages.length === 0) {
        // Load the latest doubt into active chat view
        const latest = res.data[0];
        setMessages([
          { role: 'user', content: latest.query, timestamp: latest.createdAt },
          {
            role: 'assistant',
            content: latest.answer,
            citedSources: latest.citedSources,
            keyTakeaways: latest.keyTakeaways,
            suggestedFollowUps: latest.suggestedFollowUps,
            timestamp: latest.createdAt,
            _id: latest._id,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load doubt history:', err);
    }
  };

  const handleCourseChange = (e) => {
    const code = e.target.value;
    setSubjectCode(code);
    const found = coursesList.find((c) => c.subjectCode === code);
    if (found) {
      setSubject(found.subject);
    }
  };

  const handleSendQuery = async (customQuery = null) => {
    const textToSend = customQuery || query;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/student/doubts', {
        subject,
        subjectCode,
        query: textToSend,
        selectedDocTitle,
      });

      const assistantMsg = {
        role: 'assistant',
        content: res.data.answer,
        citedSources: res.data.citedSources,
        keyTakeaways: res.data.keyTakeaways,
        suggestedFollowUps: res.data.suggestedFollowUps,
        timestamp: res.data.createdAt,
        _id: res.data._id,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setHistoryList((prev) => [res.data, ...prev]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error clarifying that doubt. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceView = (id) => {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteDoubt = async (doubtId, queryText, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Delete this doubt question: "${queryText?.slice(0, 40) || 'this doubt'}..."?`
    );
    if (!confirmed) return;

    try {
      setDeletingDoubtId(doubtId);
      await api.delete(`/student/doubts/history/${doubtId}`);
      setHistoryList((prev) => prev.filter((d) => d._id !== doubtId));
      if (messages.some((m) => m._id === doubtId)) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete doubt:', err);
      alert('Failed to delete doubt question.');
    } finally {
      setDeletingDoubtId(null);
    }
  };

  const handleClearAllDoubts = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear ALL doubt history? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setClearingDoubts(true);
      await api.delete('/student/doubts/history');
      setHistoryList([]);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear doubts:', err);
      alert('Failed to clear doubt history.');
    } finally {
      setClearingDoubts(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              RAG Syllabus Tutor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <HelpCircle className="w-7 h-7 text-blue-600" />
            <span>Course Doubt Clarification</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Instant AI tutoring grounded strictly in your course syllabus, lecture materials, and textbooks.
          </p>
        </div>

        {/* Course Code / Subject Filter & New Chat Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={subjectCode}
              onChange={handleCourseChange}
              className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-2"
            >
              {coursesList.map((c) => (
                <option key={c.subjectCode} value={c.subjectCode} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {c.subjectCode} — {c.subject}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/student/materials-rag"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <FolderSync className="w-3.5 h-3.5 text-blue-600" />
            <span>Vault ({vaultDocs.length})</span>
          </Link>

          <button
            onClick={() => {
              setMessages([]);
              setQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Doubt</span>
          </button>
        </div>
      </div>

      {/* RAG Knowledge Grounding Strip */}
      {vaultDocs.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <FolderSync className="w-4 h-4 text-blue-600" />
              <span>Ground Answers On:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDocTitle('')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                !selectedDocTitle
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              All Vault Documents
            </button>

            {vaultDocs.map((doc, idx) => {
              const isSelected = selectedDocTitle === doc.docTitle;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDocTitle('');
                    } else {
                      setSelectedDocTitle(doc.docTitle);
                      setSubject(doc.subject);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <FileText className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate max-w-[160px]">{doc.docTitle}</span>
                </button>
              );
            })}
          </div>

          {selectedDocTitle && (
            <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Active Source: "{selectedDocTitle}"</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Doubts Drawer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Doubt History ({historyList.length})
                </h2>
              </div>
              {historyList.length > 0 && (
                <button
                  type="button"
                  disabled={clearingDoubts}
                  onClick={handleClearAllDoubts}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  title="Clear all asked doubt questions"
                >
                  {clearingDoubts ? (
                    <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                No past questions asked yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item._id}
                    className="group relative w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500 transition-colors overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([
                          { role: 'user', content: item.query, timestamp: item.createdAt },
                          {
                            role: 'assistant',
                            content: item.answer,
                            citedSources: item.citedSources,
                            keyTakeaways: item.keyTakeaways,
                            suggestedFollowUps: item.suggestedFollowUps,
                            timestamp: item.createdAt,
                            _id: item._id,
                          },
                        ]);
                      }}
                      className="w-full text-left p-3 pr-8"
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        <span>{item.subject}</span>
                        <span className="text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {item.query}
                      </div>
                    </button>

                    <button
                      type="button"
                      title="Delete this doubt question"
                      disabled={deletingDoubtId === item._id}
                      onClick={(e) => handleDeleteDoubt(item._id, item.query, e)}
                      className="absolute top-2.5 right-2 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                      {deletingDoubtId === item._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Box */}
        <div className="lg:col-span-8 flex flex-col h-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Chat Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-3">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ask Any Course Question
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Answers are generated from indexed course documents with citations and key takeaways.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md">
                  <button
                    onClick={() =>
                      handleSendQuery('Explain Raft leader election and how split votes are prevented.')
                    }
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600 dark:text-slate-300 font-medium"
                  >
                    💡 Raft Leader Election?
                  </button>
                  <button
                    onClick={() =>
                      handleSendQuery('What is the difference between Linearizable Consistency and Eventual Consistency?')
                    }
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600 dark:text-slate-300 font-medium"
                  >
                    💡 Linearizability vs Eventual Consistency?
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.content}
                      </div>
                    )}

                    {/* Key Takeaways */}
                    {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Core Takeaways</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                          {msg.keyTakeaways.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-blue-600 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Grounded Source Citations */}
                    {msg.citedSources && msg.citedSources.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSourceView(msg._id || index)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          <span>
                            {msg.citedSources.length} Grounded Source Citation(s)
                          </span>
                          {expandedSources[msg._id || index] ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {expandedSources[msg._id || index] && (
                          <div className="mt-2 space-y-2">
                            {msg.citedSources.map((src, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span className="text-blue-600">{src.docTitle}</span>
                                  <span>Relevance: {Math.round((src.relevanceScore || 0.9) * 100)}%</span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic leading-relaxed">
                                  "{src.chunkExcerpt || src.chunkSnippet || 'Relevant excerpt from course material.'}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Follow-ups */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendQuery(q)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            👉 {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-xs text-slate-400 ml-2">Grounding response with RAG...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your course..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubtChat;
