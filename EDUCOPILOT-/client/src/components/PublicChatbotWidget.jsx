import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  X, 
  Send, 
  RefreshCw, 
  Bot, 
  User, 
  BookOpen, 
  GraduationCap, 
  Key, 
  UserPlus, 
  MessageSquare,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const STARTER_PROMPTS = [
  {
    icon: Sparkles,
    label: 'How does EduCopilot work?',
    text: 'Can you explain how EduCopilot works for students and professors?',
  },
  {
    icon: BookOpen,
    label: 'Student Features',
    text: 'What features are available for Students on EduCopilot?',
  },
  {
    icon: GraduationCap,
    label: 'Professor Features',
    text: 'What can Professors do on EduCopilot?',
  },
  {
    icon: Key,
    label: 'Sign In Help',
    text: 'How do I sign in or choose the right portal tab?',
  },
  {
    icon: UserPlus,
    label: 'How to Register',
    text: 'How do I register a new account on EduCopilot?',
  },
];

const PublicChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `### 👋 Welcome to EduCopilot! 24/7 AI Guide

I'm your **EduCopilot 24/7 AI Assistant**. I can help you learn how our platform works, explore persona capabilities, or learn how to register!

Choose a quick question below or ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Build conversation history format
      const history = messages
        .filter((m) => m.sender === 'user' || m.sender === 'assistant')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await axios.post('/api/auth/public-assistant', {
        message: userMsg.text,
        history,
      });

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.data?.reply || "I'm here to help you get started with EduCopilot! Feel free to ask about our features or registration.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[ChatbotWidget] Error querying public assistant:', err);
      const fallbackMsg = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: `### 🤖 EduCopilot Quick Guide

EduCopilot is a dual-persona GenAI platform for **Students** and **Professors**.

- **Students:** Sign in under the **Student Persona** tab.
- **Professors:** Sign in under the **Professor Persona** tab.

Click **Register here** to create your own account!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-reset-${Date.now()}`,
        sender: 'assistant',
        text: `### 🔄 Chat Reset

How can I help you explore **EduCopilot**? Ask about features, demo accounts, or registration!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Chat Window Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[540px] max-h-[80vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-inner">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  EduCopilot 24/7 Guide
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30">
                    AI Concierge
                  </span>
                </h3>
                <p className="text-[11px] text-blue-100/90 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online 24/7 • Instant Pre-Login Support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Starter Pills Header */}
          <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {STARTER_PROMPTS.map((prompt, idx) => {
              const IconComp = prompt.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.text)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <IconComp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{prompt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Message Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none font-medium'
                      : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.text}</p>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )}
                  <span
                    className={`block text-[10px] mt-1.5 text-right font-medium opacity-60 ${
                      msg.sender === 'user' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-1 font-bold text-xs border border-blue-200 dark:border-blue-800">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking / Loading indicator */}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-500 rounded-bl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-500 font-medium ml-1">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about EduCopilot, features, credentials..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-slate-200/60 dark:border-slate-700/60 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all shadow-md shadow-blue-600/20"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:scale-105 transition-all duration-200 border border-white/20"
          title="EduCopilot 24/7 Guide Chatbot"
        >
          {/* Notification Badge */}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 border-2 border-white text-[9px] font-black text-white items-center justify-center">
                !
              </span>
            </span>
          )}

          {isOpen ? (
            <X className="w-5 h-5 transition-transform duration-200" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              <span className="font-bold text-xs sm:text-sm tracking-wide">24/7 AI Guide</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </div>
          )}
        </button>
      </div>
    </>
  );
};

export default PublicChatbotWidget;
