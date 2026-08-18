import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from './MarkdownRenderer';
import {
  Bot,
  User,
  Send,
  X,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

const SupportChatbotModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.role || 'student';
  const userName = user?.name || (userRole === 'student' ? 'Student' : 'Professor');

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize greeting on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting =
        userRole === 'student'
          ? `### 👋 Hello ${userName}! Welcome to Student Support
I am your **EduCopilot AI Assistant**. I can help you with:
- 📅 **Study Plans**: Generating roadmaps from syllabus text/PDFs
- 📝 **Practice Tests**: Taking adaptive quizzes & diagnostic reviews
- 🎓 **Prof Exams**: Unlocking official exams with Access Codes
- 💬 **Ask a Doubt**: Asking RAG syllabus-grounded questions

Ask me any platform question below! *(Note: Platform integrity policies are enforced for all queries.)*`
          : `### 🏛️ Welcome Prof. ${userName}! Professor Support Suite
I am your **EduCopilot Teaching Assistant**. I am here to help you with:
- 📚 **Course Materials RAG**: Uploading syllabi & textbook chunks
- 🗓️ **Lecture Schedules**: Generating prerequisite-ordered timetables
- 📝 **Material Prep**: Auto-drafting slides, notes, & practice questions
- 📧 **Share Notes**: Dispatching study materials via Gmail SMTP
- 🎓 **Assessment & Auto-Grading**: Grading student answer sheets & rubrics

How can I assist your teaching workflow today?`;

      setMessages([
        {
          id: 1,
          sender: 'assistant',
          text: initialGreeting,
          isUnethical: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, userRole, userName]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const starterPrompts =
    userRole === 'student'
      ? [
          'How do I generate a study plan from a PDF?',
          'How do practice test difficulty levels work?',
          'Can I get live exam answers during a test?',
          'How to upload notes for RAG doubt solving?',
        ]
      : [
          'How to generate slot-by-slot lecture schedules?',
          'How to share study notes with students via Gmail?',
          'Can I alter or forge student exam scores secretly?',
          'How does AI auto-grading evaluate answer sheets?',
        ];

  const handleSend = async (customQuery) => {
    // Robust query extraction supporting typed input string or clicked prompt pill
    const rawText = typeof customQuery === 'string' ? customQuery : inputQuery;
    if (!rawText || typeof rawText !== 'string' || !rawText.trim() || loading) return;

    const textToSend = rawText.trim();

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Pass query, role, and name to guarantee accurate server persona matching
      const res = await api.post('/support/assistant', {
        query: textToSend,
        role: userRole,
        name: userName,
      });

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: res.data.reply || 'Thank you for your question.',
        isUnethical: res.data.isUnethical || false,
        unethicalType: res.data.unethicalType || '',
        suggestedFeatureLink: res.data.suggestedFeatureLink || '',
        suggestedFeatureLabel: res.data.suggestedFeatureLabel || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Support bot error:', err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `### ⚠️ Connection Error\nSorry, I could not process your request at this moment (${err.response?.data?.error || err.message}). Please verify the backend server is running and try again.`,
        isUnethical: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9990] bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Right-Side Slide-Over Drawer Panel */}
      <div
        className={`fixed top-16 bottom-0 right-0 z-[9999] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'w-full md:w-[680px] lg:w-[750px]'
            : 'w-full sm:w-[420px] md:w-[460px]'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs sm:text-sm leading-tight">
                  {userRole === 'student' ? 'Student Support Assistant' : 'Professor Support Suite'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 uppercase tracking-wider text-white">
                  24/7 AI
                </span>
              </div>
              <p className="text-[10px] text-blue-100 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Role Scoped • Ethics Safeguarded</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Expand / Contract Toggle Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold"
              title={isExpanded ? 'Contract sidebar width' : 'Expand sidebar width'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Contract</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Expand</span>
                </>
              )}
            </button>

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-all"
              title="Close Support Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Starter Prompts */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="w-3 h-3 text-blue-500" /> Quick:
          </span>
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap transition-all shadow-xs shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs bg-slate-50/40 dark:bg-slate-950/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 shadow-sm shadow-blue-500/20'
                    : msg.isUnethical
                    ? 'bg-amber-600 shadow-sm shadow-amber-500/20'
                    : 'bg-indigo-600 shadow-sm shadow-indigo-500/20'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="w-3.5 h-3.5" />
                ) : msg.isUnethical ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl p-3.5 shadow-xs space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.isUnethical
                    ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-100 rounded-tl-none'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
                }`}
              >
                {/* Ethics Warning Banner */}
                {msg.isUnethical && (
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{msg.unethicalType || 'Ethics Safeguard Alert'}</span>
                    </span>
                  </div>
                )}

                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-xs font-medium">{msg.text}</p>
                ) : (
                  <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
                    <MarkdownRenderer content={msg.text} />
                  </div>
                )}

                {/* Direct Feature Exploration Button */}
                {msg.suggestedFeatureLink && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(msg.suggestedFeatureLink);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99]"
                    >
                      <span>{msg.suggestedFeatureLabel || 'Explore Feature'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <span
                  className={`block text-[10px] text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2 animate-pulse">
              <div className="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <span className="font-medium text-xs">Evaluating platform guidance & policies...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                userRole === 'student'
                  ? 'Type your question about study plans, quizzes, doubts...'
                  : 'Type your question about schedules, materials, Gmail notes...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 shrink-0 flex items-center justify-center"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default SupportChatbotModal;
