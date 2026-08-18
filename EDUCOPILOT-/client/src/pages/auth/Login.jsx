import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, GraduationCap, BookOpen, ShieldCheck, Sun, Moon, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import PublicChatbotWidget from '../../components/PublicChatbotWidget';
import EduCopilotImpactSidebar from '../../components/EduCopilotImpactSidebar';
import api from '../../api/client';

const Login = () => {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password views: 'login' | 'forgot-password' | 'reset-password'
  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const user = await login(email, password, role);
      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/professor/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to sign in. Please verify your credentials or register a new account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      setMessage(res.data?.message || 'OTP has been sent to your email.');
      setView('reset-password');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to send OTP. Please check the email address and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/reset-password', {
        email: resetEmail,
        otp,
        newPassword,
        confirmPassword,
      });
      setMessage(res.data?.message || 'Password reset successfully!');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setView('login');
        setMessage('');
        setResetEmail('');
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to reset password. Please verify the OTP and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 relative transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Split Grid Container */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Side: EduCopilot Overview & Impact Details */}
        <div className="lg:col-span-7">
          <EduCopilotImpactSidebar />
        </div>

        {/* Right Side: Sign In Box */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl shadow-slate-200/60 dark:shadow-none rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6">
            
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Sign In to Edu<span className="text-blue-600">Copilot</span>
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Access your personalized AI learning portal & teaching suite
              </p>
            </div>

            {/* Form Views */}
            {view === 'login' && (
              <>
                {/* Persona Segment Control */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                      role === 'student'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Student Persona</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('professor')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                      role === 'professor'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Professor Persona</span>
                  </button>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Alert */}
                {message && (
                  <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 flex items-start gap-2.5 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{message}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleLogin}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot-password');
                          setResetEmail(email);
                          setError('');
                          setMessage('');
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In as {role === 'student' ? 'Student' : 'Professor'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-500">Don't have an account? </span>
                  <Link
                    to="/register"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
                  >
                    Register here
                  </Link>
                </div>
              </>
            )}

            {view === 'forgot-password' && (
              <>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600" />
                    <span>Recover Password</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter your registered email address and we'll send you a One-Time Password (OTP).
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {message && (
                  <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 flex items-start gap-2 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{message}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleForgotPassword}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send OTP Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setError('');
                      setMessage('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </>
            )}

            {view === 'reset-password' && (
              <>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <span>Reset Password</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter the OTP verification code sent to your email address.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {message && (
                  <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 flex items-start gap-2 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{message}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleResetPassword}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        value={resetEmail}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      OTP Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tracking-widest text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setError('');
                      setMessage('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating 24/7 AI Guide Chatbot */}
      <PublicChatbotWidget />
    </div>
  );
};

export default Login;
