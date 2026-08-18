import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, GraduationCap, BookOpen, Sun, Moon, ArrowRight, AlertCircle } from 'lucide-react';
import PublicChatbotWidget from '../../components/PublicChatbotWidget';
import EduCopilotImpactSidebar from '../../components/EduCopilotImpactSidebar';

const Register = () => {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('1st');
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Semester auto-filtering logic based on Year selection
  const getSemestersForYear = (selectedYear) => {
    switch (selectedYear) {
      case '1st':
        return ['1', '2'];
      case '2nd':
        return ['3', '4'];
      case '3rd':
        return ['5', '6'];
      case '4th':
        return ['7', '8'];
      default:
        return ['1', '2'];
    }
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    const validSems = getSemestersForYear(newYear);
    if (!validSems.includes(semester)) {
      setSemester(validSems[0]);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const deptValue = department.trim();
      const user = await register({
        name,
        email,
        password,
        role,
        department: deptValue,
        year,
        semester,
        gradeOrClass: deptValue ? `${deptValue} - ${year} Year (Sem ${semester})` : (role === 'student' ? 'General' : 'Faculty'),
        subjects: deptValue ? [deptValue] : ['General Education'],
      });

      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/professor/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Registration failed. Please check your information.'
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

        {/* Right Side: Sign Up Box */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl shadow-slate-200/60 dark:shadow-none rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6">
            
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Create an Account
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Join EduCopilot with role-isolated AI learning intelligence
              </p>
            </div>

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
                <span>Student</span>
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
                <span>Professor</span>
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form className="space-y-4" onSubmit={handleRegister}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Department / Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science (CSE)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {role === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {getSemestersForYear(year).map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create {role === 'student' ? 'Student' : 'Professor'} Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500">Already registered with EduCopilot? </span>
              <Link
                to="/login"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating 24/7 AI Guide Chatbot */}
      <PublicChatbotWidget />
    </div>
  );
};

export default Register;
