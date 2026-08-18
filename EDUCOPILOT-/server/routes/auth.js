const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Curriculum = require('../models/Curriculum');
const { protect } = require('../middleware/authMiddleware');

const { generateChatCompletion } = require('../services/groqService');
const { sendOtpEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'educopilot_super_secret_jwt_key_2026_secure',
    { expiresIn: '30d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new student or professor
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, gradeOrClass, subjects, department, year, semester } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: 'Please provide all required fields (name, email, password, role).' });
    }

    if (!['student', 'professor'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either student or professor.' });
    }

    if (role === 'student') {
      if (!department || !year || !semester) {
        return res
          .status(400)
          .json({ error: 'Department, Year, and Semester are required for student registration.' });
      }
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    let enrolledSubjects = [];
    if (role === 'student' && department && year && semester) {
      // Lookup matching curriculum for enrolledSubjects
      const curriculum = await Curriculum.findOne({
        department: { $regex: new RegExp(`^${department.trim()}$`, 'i') },
        year: { $regex: new RegExp(`^${year.trim()}$`, 'i') },
        semester: String(semester).trim(),
      });

      if (curriculum && curriculum.subjectCodes?.length > 0) {
        enrolledSubjects = curriculum.subjectCodes;
      } else {
        // Fallback default subjects if exact curriculum record is not found
        enrolledSubjects = [`${department.trim().toUpperCase()}101`, `${department.trim().toUpperCase()}102`];
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: department ? department.trim() : '',
      year: year ? year.trim() : '',
      semester: semester ? String(semester).trim() : '',
      enrolledSubjects,
      gradeOrClass: gradeOrClass || (department ? `${department} - ${year}` : ''),
      subjects: Array.isArray(subjects)
        ? subjects
        : enrolledSubjects.length > 0
        ? enrolledSubjects
        : ['Computer Science', 'Mathematics'],
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      semester: user.semester,
      enrolledSubjects: user.enrolledSubjects,
      gradeOrClass: user.gradeOrClass,
      subjects: user.subjects,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: error.message || 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        error: 'Access denied. Please check your credentials or select the correct login persona (Student or Professor).',
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      semester: user.semester,
      enrolledSubjects: user.enrolledSubjects,
      gradeOrClass: user.gradeOrClass,
      subjects: user.subjects,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// @route   POST /api/auth/public-assistant
// @desc    24/7 AI Guide Concierge Chatbot before signing in
router.post('/public-assistant', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid user message.' });
    }

    const systemPrompt = `You are EduCopilot's 24/7 Pre-Sign-In AI Assistant & Concierge. Your mission is to assist visitors, explain how EduCopilot works, detail persona capabilities, guide registration and sign-in, and provide demo accounts.

Platform Overview & Core Knowledge:
1. OVERVIEW: EduCopilot is a full-stack, dual-persona GenAI education assistant tailored for Students and Professors. It uses RAG (Retrieval-Augmented Generation) and LLMs over course materials with strict per-user data isolation.

2. STUDENT PERSONA FEATURES:
   - Grounded Study Plans: Topic/syllabus-based multi-day actionable roadmaps with progress task checklists and revision notes.
   - Practice Tests & Diagnostics: AI MCQ generator (Easy/Medium/Hard/Adaptive), real-time test timer, immediate scoring, question explanations, and weak area alerts.
   - Course Doubts RAG Chat: Interactive LLM + RAG chat with source citations, relevance scores, and follow-ups based on uploaded course materials.
   - Diagnostic Test History: Historical score progression and weak spot tracking.

3. PROFESSOR PERSONA FEATURES:
   - Course Materials Vault & RAG Chunking: Upload syllabus/textbooks (PDF/Text/Markdown) auto-chunked into indexed vector chunks.
   - Lecture Scheduling: Pedagogical topic sequence optimizer with prerequisite mapping and calendar management.
   - Material Preparation: Auto-draft slide deck outlines with speaker notes, comprehensive lecture notes, assignment question banks.
   - AI Assessment & Individualized Grading: Rubric-based evaluation of student short-answer responses with itemized scores and constructive feedback.

4. DEMO CREDENTIALS:
   - Student: alex@student.edu (Password: password123)
   - Student: sophia@student.edu (Password: password123)
   - Professor: vance@professor.edu (Password: password123)

5. HOW TO REGISTER:
   - Click "Register here" on the sign-in page.
   - Select either Student or Professor persona.
   - Provide Name, Email, Password. For Students, select Department, Year, and Semester.

6. HANDLING IRRELEVANT / OFF-TOPIC MESSAGES:
   - If the user asks something completely off-topic or irrelevant to EduCopilot (e.g. recipes, sports, general trivia, weather, external coding help), provide a brief, polite, helpful answer (1-2 sentences), and then smoothly transition back to EduCopilot.
   - Example: "I'd be happy to share that! [Brief answer]. However, my main expertise is guiding you through EduCopilot. Would you like to try out our Student or Professor features using a demo account?"

Formatting Rules:
- Be warm, professional, clear, and structured.
- Use GitHub markdown (bolding, bullet points, code blocks) to make information easy to skim.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      history.slice(-6).forEach((h) => {
        if (h.role && h.content) {
          formattedMessages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content,
          });
        }
      });
    }

    formattedMessages.push({ role: 'user', content: message });

    const reply = await generateChatCompletion({
      messages: formattedMessages,
      temperature: 0.6,
      max_tokens: 1024,
    });

    res.json({ reply });
  } catch (error) {
    console.error('[Public Assistant] Error:', error);
    res.status(500).json({
      reply: "Hello! I'm the EduCopilot 24/7 Guide. EduCopilot is a dual-persona GenAI platform for Students and Professors. You can log in using demo account `alex@student.edu` or `vance@professor.edu` with password `password123`. How can I assist you today?"
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Generate and send OTP for password recovery
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    // Generate numeric 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiryTime;
    await user.save();

    await sendOtpEmail({
      email: user.email,
      otp,
      userName: user.name,
    });

    res.json({ message: 'A verification OTP has been sent to your registered email address.' });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP. Please try again later.' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and reset user password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Please provide all required fields (email, OTP, new password, confirm password).' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification OTP code.' });
    }

    if (!user.resetPasswordOtpExpires || new Date() > user.resetPasswordOtpExpires) {
      return res.status(400).json({ error: 'Verification OTP code has expired. Please request a new code.' });
    }

    // Set new password (will trigger userSchema pre-save hook for hashing)
    user.password = newPassword;
    user.resetPasswordOtp = '';
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.json({ message: 'Your password has been successfully reset. Please log in with your new password.' });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password. Please try again later.' });
  }
});

module.exports = router;
