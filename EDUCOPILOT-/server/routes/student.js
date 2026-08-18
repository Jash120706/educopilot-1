const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const StudyPlan = require('../models/StudyPlan');
const TestAttempt = require('../models/TestAttempt');
const Doubt = require('../models/Doubt');
const CourseDocChunk = require('../models/CourseDocChunk');
const User = require('../models/User');
const Test = require('../models/Test');
const GradedSubmission = require('../models/GradedSubmission');
const ActiveExamSession = require('../models/ActiveExamSession');
const crypto = require('crypto');
const { generateChatCompletion } = require('../services/groqService');
const { retrieveRelevantChunks, formatGroundedContext, ingestDocument } = require('../services/ragService');
const { extractTextFromFile } = require('../services/fileParserService');

// Multer memory storage for student uploads (PDF, Text, Timetables, Study materials)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

// All student routes are protected and restricted to student role
router.use(protect);
router.use(authorize('student'));

// Helper for Single Active Exam Session Binding & Heartbeat Handling
const handleActiveExamSession = async (userId, testId, clientSessionId = '') => {
  const now = new Date();
  const STALE_TIMEOUT_MS = 60 * 1000; // 60s stale window for crash/network recovery

  let session = await ActiveExamSession.findOne({ userId });

  if (session) {
    const timeSinceHeartbeat = now.getTime() - new Date(session.lastHeartbeatAt).getTime();
    const isStale = timeSinceHeartbeat > STALE_TIMEOUT_MS;

    if (!isStale && session.sessionId !== clientSessionId) {
      const err = new Error('A live official assessment session is already active for your account on another browser or device. Simultaneous test sessions are strictly prohibited.');
      err.statusCode = 403;
      throw err;
    }

    // Recover or update session
    session.testId = testId;
    session.sessionId = clientSessionId || session.sessionId || crypto.randomUUID();
    session.lastHeartbeatAt = now;
    await session.save();
    return session.sessionId;
  }

  // Create new active session binding
  const newSessionId = clientSessionId || crypto.randomUUID();
  session = await ActiveExamSession.create({
    userId,
    testId,
    sessionId: newSessionId,
    startedAt: now,
    lastHeartbeatAt: now,
  });
  return session.sessionId;
};

// ==========================================
// DYNAMIC COURSE CATALOG & PROFESSOR MATERIALS DISCOVERY (READ-ONLY)
// ==========================================

// @route   GET /api/student/courses
// @desc    Get all distinct courses & subjects dynamically available in the university RAG repository (Disabled - Faculty-Student isolation)
router.get('/courses', async (req, res) => {
  res.json([]);
});

// @route   GET /api/student/course-materials
// @desc    Search and browse professor-uploaded course materials by subject and subjectCode (Disabled - Faculty-Student isolation)
router.get('/course-materials', async (req, res) => {
  res.json([]);
});

// @route   GET /api/student/course-materials/preview
// @desc    Preview text chunks of a specific document for student study (Disabled - Faculty-Student isolation)
router.get('/course-materials/preview', async (req, res) => {
  res.json([]);
});

// ==========================================
// 1. STUDENT DASHBOARD
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user._id;

    const [studyPlans, testAttempts, doubts] = await Promise.all([
      StudyPlan.find({ userId: studentId }).sort({ createdAt: -1 }).limit(5),
      TestAttempt.find({ userId: studentId }).sort({ completedAt: -1 }).limit(10),
      Doubt.find({ userId: studentId }).sort({ createdAt: -1 }).limit(5),
    ]);

    const totalPlans = await StudyPlan.countDocuments({ userId: studentId });
    const totalTests = await TestAttempt.countDocuments({ userId: studentId, isReleased: { $ne: false } });
    const totalDoubts = await Doubt.countDocuments({ userId: studentId });

    // Calculate average test percentage using only released attempts
    let avgScore = 0;
    const weakAreasSet = new Set();
    const strengthsSet = new Set();

    const releasedAttempts = await TestAttempt.find({ userId: studentId, isReleased: { $ne: false } });
    if (releasedAttempts.length > 0) {
      const sum = releasedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
      avgScore = Math.round(sum / releasedAttempts.length);
      releasedAttempts.forEach((t) => {
        t.weakAreas?.forEach((w) => weakAreasSet.add(w));
        t.strengths?.forEach((s) => strengthsSet.add(s));
      });
    }

    res.json({
      stats: {
        totalPlans,
        totalTests,
        totalDoubts,
        avgScore,
        weakAreas: Array.from(weakAreasSet).slice(0, 5),
        strengths: Array.from(strengthsSet).slice(0, 5),
      },
      recentPlans: studyPlans,
      recentTests: testAttempts,
      recentDoubts: doubts,
    });
  } catch (error) {
    console.error('[StudentDashboard] Error:', error);
    res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

// ==========================================
// 2. STUDENT STUDY PLANNER (MULTI-FILE UPLOAD, PRIORITIES & CUSTOMIZABLE)
// ==========================================
// @route   POST /api/student/study-plans/generate-from-materials
// @desc    Generate personalized study plan from uploaded syllabus, timetable, course outline, or study material
router.post(
  '/study-plans/generate-from-materials',
  upload.fields([
    { name: 'syllabusFile', maxCount: 1 },
    { name: 'timetableFile', maxCount: 1 },
    { name: 'studyMaterialFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        subject: rawSubject,
        subjectCode = '',
        department = 'CSE',
        topic = 'Comprehensive Exam Prep',
        targetExamDate,
        durationDays = 7,
        rawNotes = '',
        selectedDocTitle = '',
      } = req.body;

      const subject = (rawSubject && rawSubject.trim())
        ? rawSubject.trim()
        : (topic && topic.trim())
        ? topic.trim()
        : 'General';

      let extractedContext = rawNotes || '';

      // Process uploaded syllabus
      if (req.files?.syllabusFile?.[0]) {
        const file = req.files.syllabusFile[0];
        const text = await extractTextFromFile({
          fileBuffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
        });
        extractedContext += `\n[UPLOADED SYLLABUS: ${file.originalname}]\n${text}`;
        await ingestDocument({
          uploadedBy: req.user._id,
          docTitle: `Syllabus - ${file.originalname.replace(/\.[^/.]+$/, '')}`,
          subject,
          subjectCode: subjectCode || '',
          department: department || 'CSE',
          type: 'syllabus',
          rawText: text,
        });
      }

      // Process uploaded timetable / exam schedule
      if (req.files?.timetableFile?.[0]) {
        const file = req.files.timetableFile[0];
        const text = await extractTextFromFile({
          fileBuffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
        });
        extractedContext += `\n[TIMETABLE & EXAM SCHEDULE: ${file.originalname}]\n${text}`;
      }

      // Process uploaded study material
      if (req.files?.studyMaterialFile?.[0]) {
        const file = req.files.studyMaterialFile[0];
        const text = await extractTextFromFile({
          fileBuffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
        });
        extractedContext += `\n[COURSE STUDY MATERIAL: ${file.originalname}]\n${text}`;
        await ingestDocument({
          uploadedBy: req.user._id,
          docTitle: `Study Material - ${file.originalname.replace(/\.[^/.]+$/, '')}`,
          subject,
          subjectCode: subjectCode || '',
          department: department || 'CSE',
          type: 'content',
          rawText: text,
        });
      }

      // Retrieve additional context from student's isolated RAG vault filtered by subjectCode
      const relevantChunks = await retrieveRelevantChunks({
        subject,
        subjectCode: subjectCode || null,
        department: department || null,
        query: `${topic} ${subject} ${subjectCode} ${selectedDocTitle} syllabus curriculum exam roadmap`,
        topK: 4,
        userId: req.user._id,
        docTitle: selectedDocTitle || null,
      });
      const groundedContext = formatGroundedContext(relevantChunks);

      const prompt = `You are an Expert AI Academic Coach creating a personalized, high-yield study planner for a student.
Subject: ${subject}
Focus Topic / Goal: ${topic}
Target Exam Date: ${targetExamDate || 'Upcoming Exam'}
Schedule Duration: ${durationDays} days

UPLOADED COURSE SYLLABUS, TIMETABLE & STUDY MATERIAL:
"""
${(extractedContext + '\n\n' + groundedContext).slice(0, 7000)}
"""

Instructions:
1. Generate an actionable, day-by-day study roadmap for ${durationDays} days.
2. For each day, assign:
   - day number
   - title
   - subject
   - focus objective
   - priority level ("High", "Medium", or "Low")
   - recommended daily study time in minutes (e.g. 60, 90, 120)
   - scheduled date (sequential dates starting from today or target exam timeline)
   - 2-4 concrete, actionable daily tasks
3. Synthesize a concise topic summary and formatted Markdown revision notes.

Return ONLY valid JSON matching this exact structure:
{
  "topicSummary": "Concise high-yield topic overview",
  "planDays": [
    {
      "day": 1,
      "title": "Core Foundations & Axioms",
      "subject": "${subject}",
      "focus": "Mastering fundamental definitions and basic proofs",
      "priority": "High",
      "scheduledDate": "${new Date().toISOString().split('T')[0]}",
      "recommendedStudyMinutes": 90,
      "tasks": ["Read Chapter 1 notes", "Solve 5 foundational problems", "Draft summary flashcards"]
    }
  ],
  "revisionNotes": "Markdown formatted cheat sheet with key formulas, core theorems, and common traps."
}`;

      const completion = await generateChatCompletion({
        action: 'generate_study_plan',
        userId: req.user._id,
        role: 'STUDENT',
        payload: {
          subject,
          topic,
          targetExamDate,
          durationDays: Number(durationDays),
          rawNotes: extractedContext,
          selectedDocTitle,
        },
        messages: [
          { role: 'system', content: 'You are an academic study planner. Output strictly JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      let parsed;
      try {
        parsed = JSON.parse(completion);
      } catch (err) {
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }

      const planDaysWithStatus = (parsed?.planDays || []).map((d) => ({
        ...d,
        completed: false,
      }));

      const plan = await StudyPlan.create({
        userId: req.user._id,
        subject,
        topic,
        targetExamDate: targetExamDate || '',
        syllabusRef: req.files?.syllabusFile?.[0]?.originalname || 'Uploaded Material',
        durationDays: Number(durationDays),
        planDays: planDaysWithStatus,
        topicSummary: parsed?.topicSummary || 'Personalized study schedule.',
        revisionNotes: parsed?.revisionNotes || 'Review key concepts and formulas.',
        progressPercent: 0,
      });

      res.status(201).json(plan);
    } catch (error) {
      console.error('[StudyPlanGenerateFromMaterials] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate study plan.' });
    }
  }
);

// Standard post route alias
router.post('/study-plans', async (req, res) => {
  try {
    const { subject, topic, targetExamDate, durationDays = 7, syllabusRef = '' } = req.body;

    const relevantChunks = await retrieveRelevantChunks({
      subject,
      query: `${topic} ${syllabusRef}`,
      topK: 3,
      userId: req.user._id,
    });
    const groundedContext = formatGroundedContext(relevantChunks);

    const prompt = `You are an expert AI Academic Coach generating an individualized study plan for a student.
Subject: ${subject}
Topic / Exam Goal: ${topic}
Target Exam Date: ${targetExamDate || 'Upcoming Exam'}
Duration: ${durationDays} days
Syllabus / Reference Notes: ${syllabusRef || 'Standard Curriculum'}

COURSE REFERENCE MATERIALS (GROUNDING CONTEXT):
${groundedContext}

Generate ${durationDays}-day schedule. Return ONLY valid JSON:
{
  "topicSummary": "Overview",
  "planDays": [
    {
      "day": 1,
      "title": "Title",
      "subject": "${subject}",
      "focus": "Focus",
      "priority": "High",
      "scheduledDate": "${new Date().toISOString().split('T')[0]}",
      "recommendedStudyMinutes": 90,
      "tasks": ["Task 1", "Task 2"]
    }
  ],
  "revisionNotes": "Markdown revision notes"
}`;

    const completion = await generateChatCompletion({
      action: 'generate_study_plan',
      userId: req.user._id,
      role: 'STUDENT',
      payload: {
        subject,
        topic,
        targetExamDate,
        durationDays: Number(durationDays),
        syllabusRef,
      },
      messages: [
        { role: 'system', content: 'You are an academic mentor. Output ONLY JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed;
    try {
      parsed = JSON.parse(completion);
    } catch (err) {
      const match = completion.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    const plan = await StudyPlan.create({
      userId: req.user._id,
      subject,
      topic,
      targetExamDate: targetExamDate || '',
      syllabusRef,
      durationDays,
      planDays: parsed?.planDays || [],
      topicSummary: parsed?.topicSummary || '',
      revisionNotes: parsed?.revisionNotes || '',
      progressPercent: 0,
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate study plan.' });
  }
});

// @route   PUT /api/student/study-plans/:id
// @desc    Edit study plan days, tasks, priorities, or study minutes
router.put('/study-plans/:id', async (req, res) => {
  try {
    const { topic, targetExamDate, planDays, topicSummary, revisionNotes } = req.body;
    const plan = await StudyPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ error: 'Study plan not found or access denied.' });
    }

    if (topic) plan.topic = topic;
    if (targetExamDate !== undefined) plan.targetExamDate = targetExamDate;
    if (topicSummary !== undefined) plan.topicSummary = topicSummary;
    if (revisionNotes !== undefined) plan.revisionNotes = revisionNotes;
    if (planDays && Array.isArray(planDays)) {
      plan.planDays = planDays;
      const completedCount = planDays.filter((d) => d.completed).length;
      plan.progressPercent = Math.round((completedCount / (planDays.length || 1)) * 100);
    }

    await plan.save();
    res.json(plan);
  } catch (error) {
    console.error('[StudyPlanEdit] Error:', error);
    res.status(500).json({ error: 'Failed to update study plan.' });
  }
});

// @route   GET /api/student/study-plans
// @desc    List all study plans for the logged-in student
router.get('/study-plans', async (req, res) => {
  try {
    const plans = await StudyPlan.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch study plans.' });
  }
});

// @route   GET /api/student/study-plans/:id
// @desc    Get single study plan
router.get('/study-plans/:id', async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!plan) {
      return res.status(404).json({ error: 'Study plan not found.' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch study plan.' });
  }
});

// @route   DELETE /api/student/study-plans/:id
// @desc    Delete a study plan for the logged-in student
router.delete('/study-plans/:id', async (req, res) => {
  try {
    const plan = await StudyPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ error: 'Study plan not found or access denied.' });
    }

    res.json({ message: 'Study plan deleted successfully.', id: req.params.id });
  } catch (error) {
    console.error('[StudyPlanDelete] Error:', error);
    res.status(500).json({ error: 'Failed to delete study plan.' });
  }
});

// @route   PATCH /api/student/study-plans/:id/toggle-task
// @desc    Toggle completion of a daily plan task
router.patch('/study-plans/:id/toggle-task', async (req, res) => {
  try {
    const { dayIndex } = req.body;
    const plan = await StudyPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ error: 'Study plan not found.' });
    }

    if (plan.planDays[dayIndex]) {
      plan.planDays[dayIndex].completed = !plan.planDays[dayIndex].completed;
      const completedCount = plan.planDays.filter((d) => d.completed).length;
      plan.progressPercent = Math.round((completedCount / plan.planDays.length) * 100);
      await plan.save();
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status.' });
  }
});

// ==========================================
// SCOPED ASSIGNED TESTS (OPTION A SCOPING & OPTION B ACCESS CODES)
// ==========================================

// @route   GET /api/student/available-tests
// @desc    Fetch tests available for the student based on Option A automatic scoping
router.get('/available-tests', async (req, res) => {
  try {
    const student = req.user;

    // Build Option A filter criteria
    const filter = {
      isPublished: true,
    };

    if (student.department) {
      filter.department = { $regex: new RegExp(`^${student.department.trim()}$`, 'i') };
    }
    if (student.year) {
      filter.year = { $regex: new RegExp(`^${student.year.trim()}$`, 'i') };
    }
    if (student.enrolledSubjects && student.enrolledSubjects.length > 0) {
      filter.subjectCode = {
        $in: student.enrolledSubjects.map((code) => new RegExp(`^${code.trim()}$`, 'i')),
      };
    }

    const tests = await Test.find(filter).sort({ createdAt: -1 });

    // Return tests without exposing answers before access code validation
    const sanitizedTests = tests.map((t) => {
      let computedStatus = t.status || 'Active';
      if (t.endedAt || t.status === 'Ended') {
        computedStatus = 'Ended';
      } else if (!t.isPublished || t.status === 'Draft') {
        computedStatus = 'Draft';
      } else {
        const now = new Date();
        if (t.expiresAt && now > new Date(t.expiresAt)) {
          computedStatus = 'Expired';
        } else if (t.availableFrom && now < new Date(t.availableFrom)) {
          computedStatus = 'Scheduled';
        } else {
          computedStatus = 'Active';
        }
      }

      return {
        _id: t._id,
        title: t.title,
        topic: t.topic,
        department: t.department,
        year: t.year,
        semester: t.semester,
        subjectCode: t.subjectCode,
        subject: t.subject,
        difficulty: t.difficulty,
        durationMinutes: t.durationMinutes,
        questionCount: t.questions?.length || 0,
        requiresAccessCode: Boolean(t.accessCode && t.accessCode.trim().length > 0),
        createdAt: t.createdAt,
        professorName: t.professorName || '',
        courseId: t.courseId || '',
        status: computedStatus,
        availableFrom: t.availableFrom,
        expiresAt: t.expiresAt,
        endedAt: t.endedAt,
      };
    });

    res.json(sanitizedTests);
  } catch (error) {
    console.error('[AvailableTests] Error:', error);
    res.status(500).json({ error: 'Failed to fetch available tests.' });
  }
});

// @route   POST /api/student/tests/unlock-by-code
// @desc    Unlock and start a test by code (Fully Access Code based, with backend expiration & ended verification)
router.post('/tests/unlock-by-code', async (req, res) => {
  try {
    const { accessCode = '', sessionId = '' } = req.body;
    if (!accessCode || !accessCode.trim()) {
      return res.status(400).json({ error: 'Access Code is required.' });
    }

    const testDoc = await Test.findOne({
      accessCode: { $regex: new RegExp(`^${accessCode.trim()}$`, 'i') },
    });

    if (!testDoc) {
      return res.status(404).json({
        error: 'No active assessment exam matches the provided access code. Please verify the code and try again.',
      });
    }

    // 1. BACKEND SECURITY: Check if manually ended
    if (testDoc.endedAt || testDoc.status === 'Ended' || !testDoc.isPublished) {
      return res.status(403).json({
        error: 'This test has been ended by the professor. Submissions are no longer permitted.',
      });
    }

    // 2. BACKEND SECURITY: Check expiration window
    const now = new Date();
    if (testDoc.expiresAt && now > new Date(testDoc.expiresAt)) {
      return res.status(403).json({
        error: `This test has expired. Submissions closed on ${new Date(testDoc.expiresAt).toLocaleString()}.`,
      });
    }

    // 3. BACKEND SECURITY: Check start time availability
    if (testDoc.availableFrom && now < new Date(testDoc.availableFrom)) {
      return res.status(403).json({
        error: `This test is scheduled for a future time. It will open on ${new Date(testDoc.availableFrom).toLocaleString()}.`,
      });
    }

    // 4. BACKEND SECURITY: Check if the student has already taken this test
    const existingAttempt = await TestAttempt.findOne({
      userId: req.user._id,
      testId: testDoc._id,
    });

    if (existingAttempt) {
      return res.status(400).json({
        error: 'You have already submitted this exam. Officially assigned exams can only be taken once.',
      });
    }

    // 5. SINGLE ACTIVE TEST SESSION & HEARTBEAT BINDING
    let activeSessionId;
    try {
      activeSessionId = await handleActiveExamSession(req.user._id, testDoc._id, sessionId);
    } catch (sessionErr) {
      return res.status(sessionErr.statusCode || 403).json({ error: sessionErr.message });
    }

    // Return full test document (including questions) and activeSessionId for running the test
    res.json({
      ...testDoc.toObject(),
      activeSessionId,
    });
  } catch (error) {
    console.error('[UnlockTestByCode] Error:', error);
    res.status(500).json({ error: 'Failed to access test.' });
  }
});

// @route   POST /api/student/tests/:id/start
// @desc    Start/fetch full test with server-side Option A check, expiration check, & Option B access code verification
router.post('/tests/:id/start', async (req, res) => {
  try {
    const student = req.user;
    const { accessCode = '', sessionId = '' } = req.body;

    const testDoc = await Test.findById(req.params.id);
    if (!testDoc) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    // 1. BACKEND SECURITY: Check if manually ended
    if (testDoc.endedAt || testDoc.status === 'Ended' || !testDoc.isPublished) {
      return res.status(403).json({
        error: 'This test has been ended by the professor. Submissions are no longer permitted.',
      });
    }

    // 2. BACKEND SECURITY: Check expiration window
    const now = new Date();
    if (testDoc.expiresAt && now > new Date(testDoc.expiresAt)) {
      return res.status(403).json({
        error: `This test has expired. Submissions closed on ${new Date(testDoc.expiresAt).toLocaleString()}.`,
      });
    }

    // 3. BACKEND SECURITY: Check start time availability
    if (testDoc.availableFrom && now < new Date(testDoc.availableFrom)) {
      return res.status(403).json({
        error: `This test is scheduled for a future time. It will open on ${new Date(testDoc.availableFrom).toLocaleString()}.`,
      });
    }

    // 4. BACKEND SECURITY: Check if the student has already taken this test
    const existingAttempt = await TestAttempt.findOne({
      userId: req.user._id,
      testId: testDoc._id,
    });

    if (existingAttempt) {
      return res.status(400).json({
        error: 'You have already submitted this exam. Officially assigned exams can only be taken once.',
      });
    }

    // 5. OPTION A GATEWAY VERIFICATION (Primary, Mandatory)
    if (student.department && testDoc.department.toLowerCase() !== student.department.toLowerCase()) {
      return res.status(403).json({ error: 'Access Denied: Test department does not match your enrolled department.' });
    }
    if (student.year && testDoc.year.toLowerCase() !== student.year.toLowerCase()) {
      return res.status(403).json({ error: 'Access Denied: Test year does not match your current academic year.' });
    }
    if (
      student.enrolledSubjects &&
      student.enrolledSubjects.length > 0 &&
      !student.enrolledSubjects.some((s) => s.toLowerCase() === testDoc.subjectCode.toLowerCase())
    ) {
      return res.status(403).json({ error: 'Access Denied: You are not enrolled in this subject code.' });
    }

    // 6. OPTION B GATEWAY VERIFICATION (Secondary, Optional)
    if (testDoc.accessCode && testDoc.accessCode.trim().length > 0) {
      if (!accessCode || accessCode.trim() !== testDoc.accessCode.trim()) {
        return res.status(403).json({
          error: 'Invalid or missing Access Code. Please enter the correct code provided by your professor.',
        });
      }
    }

    // 7. SINGLE ACTIVE TEST SESSION & HEARTBEAT BINDING
    let activeSessionId;
    try {
      activeSessionId = await handleActiveExamSession(req.user._id, testDoc._id, sessionId);
    } catch (sessionErr) {
      return res.status(sessionErr.statusCode || 403).json({ error: sessionErr.message });
    }

    // Return full test document (including questions) and activeSessionId for running the test
    res.json({
      ...testDoc.toObject(),
      activeSessionId,
    });
  } catch (error) {
    console.error('[StartTest] Error:', error);
    res.status(500).json({ error: 'Failed to access test.' });
  }
});

// ==========================================
// 3. STUDENT MATERIAL-BASED SAMPLE TEST (MCQs, TRUE/FALSE, FILL-BLANK, SHORT-ANSWER)
// ==========================================
// @route   POST /api/student/tests/generate-from-material
// @desc    Generate multi-type test questions from uploaded material or RAG vault
router.post('/tests/generate-from-material', upload.single('file'), async (req, res) => {
  try {
    const {
      subject = 'Computer Science',
      subjectCode = '',
      department = 'CSE',
      topic = 'Comprehensive Exam',
      difficulty = 'Medium',
      questionCount = 5,
      questionType = 'Mixed', // 'MCQ' | 'TrueFalse' | 'FillBlank' | 'ShortAnswer' | 'Mixed'
      rawText = '',
      selectedDocTitle = '',
    } = req.body;

    let materialContent = rawText || '';

    // If student attached a document directly to the quiz generator
    if (req.file) {
      materialContent = await extractTextFromFile({
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      if (materialContent && materialContent.trim().length > 20) {
        await ingestDocument({
          uploadedBy: req.user._id,
          docTitle: req.file.originalname.replace(/\.[^/.]+$/, ''),
          subject,
          subjectCode: subjectCode || '',
          department: department || 'CSE',
          type: 'content',
          rawText: materialContent,
        });
      }
    }

    // Retrieve from student's private RAG vault (scoped by subjectCode)
    const relevantChunks = await retrieveRelevantChunks({
      subject,
      subjectCode: subjectCode || null,
      department: department || null,
      query: `${topic} ${subjectCode} ${selectedDocTitle} ${materialContent.slice(0, 200)} practice examination questions`,
      topK: 4,
      userId: req.user._id,
      docTitle: selectedDocTitle || null,
    });
    let groundedContext = formatGroundedContext(relevantChunks);
    if (materialContent && materialContent.trim().length > 20) {
      groundedContext = `[ATTACHED STUDY MATERIAL]\n${materialContent.slice(0, 4000)}\n\n` + groundedContext;
    }

    // Retrieve past weak areas for adaptive question formulation
    const pastAttempts = await TestAttempt.find({ userId: req.user._id })
      .sort({ completedAt: -1 })
      .limit(3);
    const knownWeakAreas = [];
    pastAttempts.forEach((p) => p.weakAreas?.forEach((w) => knownWeakAreas.push(w)));

    const prompt = `You are an Expert AI Examiner creating a high-quality practice test for a student grounded strictly in their study material.
Subject: ${subject}
Topic: ${topic}
Difficulty Level: ${difficulty}
Total Questions: ${questionCount}
Question Type Format: ${questionType} (Support MCQ, TrueFalse, FillBlank, and ShortAnswer)
Student's Known Historical Weak Areas: ${knownWeakAreas.length > 0 ? knownWeakAreas.join(', ') : 'None recorded'}

STUDY MATERIAL REFERENCE (GROUNDING):
${groundedContext}

Instructions:
Create exactly ${questionCount} questions grounded in the material.
Supported questionType values:
- "MCQ": options (4 choices), correctAnswerIndex (0-3), explanation
- "TrueFalse": options (["True", "False"]), correctAnswerIndex (0 or 1), explanation
- "FillBlank": question with a blank "_____", correctTextAnswer (the exact term), explanation
- "ShortAnswer": question requiring 1-3 sentences, correctTextAnswer (model answer & key points), explanation

Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "questionType": "MCQ",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "correctTextAnswer": "Option A",
      "points": 2,
      "explanation": "Clear explanation of why this is correct.",
      "topicTag": "Subtopic Name"
    },
    {
      "questionType": "FillBlank",
      "question": "In the Raft protocol, leader election uses randomized _____ between 150ms and 300ms.",
      "options": [],
      "correctAnswerIndex": 0,
      "correctTextAnswer": "election timers",
      "points": 2,
      "explanation": "Randomized election timers prevent split votes in consensus.",
      "topicTag": "Consensus Protocols"
    },
    {
      "questionType": "ShortAnswer",
      "question": "Explain how Dijkstra algorithm avoids cycles in shortest-path trees.",
      "options": [],
      "correctAnswerIndex": 0,
      "correctTextAnswer": "Maintains visited set and greedily extracts minimum distance vertex from priority queue.",
      "points": 4,
      "explanation": "Greedy relaxation with non-negative edge weights guarantees optimal substructure.",
      "topicTag": "Graph Algorithms"
    }
  ]
}`;

    const completion = await generateChatCompletion({
      action: 'generate_practice_test',
      userId: req.user._id,
      role: 'STUDENT',
      payload: {
        subject,
        topic,
        difficulty,
        questionCount: Number(questionCount),
        questionType,
        selectedDocTitle,
      },
      messages: [
        { role: 'system', content: 'You are an examination engine. Output strictly JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed;
    try {
      parsed = JSON.parse(completion);
    } catch (err) {
      const match = completion.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { questions: [] };
    }

    res.json({
      subject,
      topic,
      difficulty,
      questionTypeFilter: questionType,
      sourceMaterialTitle: req.file?.originalname || 'Personal Knowledge Vault',
      questions: parsed?.questions || [],
    });
  } catch (error) {
    console.error('[TestGenerateFromMaterial] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test.' });
  }
});

// Standard generate test alias
router.post('/tests/generate', async (req, res) => {
  try {
    const { subject, topic, difficulty = 'Medium', questionCount = 4 } = req.body;
    const relevantChunks = await retrieveRelevantChunks({
      subject,
      query: `${topic} practice test`,
      topK: 3,
      userId: req.user._id,
    });
    const groundedContext = formatGroundedContext(relevantChunks);

    const prompt = `Create ${questionCount} multiple choice practice questions on "${topic}" for ${subject} (${difficulty}).
COURSE GROUNDING:
${groundedContext}
Return JSON matching: {"questions": [{"questionType": "MCQ", "question": "...", "options": ["A","B","C","D"], "correctAnswerIndex": 0, "correctTextAnswer": "...", "points": 1, "explanation": "...", "topicTag": "..."}]}`;

    const completion = await generateChatCompletion({
      action: 'generate_practice_test',
      userId: req.user._id,
      role: 'STUDENT',
      payload: {
        subject,
        topic,
        difficulty,
        questionCount: Number(questionCount),
      },
      messages: [
        { role: 'system', content: 'You are an examination engine. Output JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed;
    try {
      parsed = JSON.parse(completion);
    } catch (err) {
      const match = completion.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { questions: [] };
    }

    res.json({
      subject,
      topic,
      difficulty,
      questions: parsed?.questions || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate test.' });
  }
});

// @route   POST /api/student/tests/heartbeat
// @desc    Server-side heartbeat to keep active official test session alive
router.post('/tests/heartbeat', async (req, res) => {
  try {
    const { testId, sessionId } = req.body;
    if (!testId || !sessionId) {
      return res.status(400).json({ error: 'Missing testId or sessionId for heartbeat.' });
    }

    const activeSession = await ActiveExamSession.findOne({
      userId: req.user._id,
      testId,
      sessionId,
    });

    if (!activeSession) {
      return res.status(403).json({
        error: 'Official exam session expired, terminated, or invalid.',
        status: 'invalid',
      });
    }

    activeSession.lastHeartbeatAt = new Date();
    await activeSession.save();

    res.json({ status: 'active', lastHeartbeatAt: activeSession.lastHeartbeatAt, violationCount: activeSession.violationCount || 0 });
  } catch (error) {
    console.error('[TestHeartbeat] Error:', error);
    res.status(500).json({ error: 'Failed to record heartbeat.' });
  }
});

// @route   POST /api/student/tests/official/violation
// @desc    Record an official assessment security violation (fullscreen exit, tab switch, window blur).
//          Maintains authoritative server-side counter in MongoDB. 3+ violations triggers immediate auto-submission.
router.post('/tests/official/violation', async (req, res) => {
  try {
    const { testId, sessionId, violationType = 'FullscreenExit', userAnswers = {} } = req.body;

    if (!testId || !sessionId) {
      return res.status(400).json({ error: 'Missing testId or sessionId for security violation recording.' });
    }

    // 1. Verify authenticated student owns the active session
    const activeSession = await ActiveExamSession.findOne({
      userId: req.user._id,
      testId,
      sessionId,
    });

    if (!activeSession) {
      // Check if attempt was already auto-submitted or finalized
      const existingAttempt = await TestAttempt.findOne({
        userId: req.user._id,
        testId,
      });

      if (existingAttempt && existingAttempt.isSubmitted) {
        return res.json({
          autoSubmitted: true,
          violationCount: existingAttempt.violationCount || 3,
          submitReason: existingAttempt.submitReason || 'ViolationAutoSubmit',
          message: 'Official exam has already been submitted and locked.',
        });
      }

      return res.status(403).json({ error: 'Active official exam session not found or terminated.' });
    }

    // 2. Increment violation count on active session
    activeSession.violationCount = (activeSession.violationCount || 0) + 1;
    activeSession.lastHeartbeatAt = new Date();
    await activeSession.save();

    const currentViolationCount = activeSession.violationCount;
    const actionTaken =
      currentViolationCount === 1
        ? 'Warning 1 Issued'
        : currentViolationCount === 2
        ? 'Warning 2 Final Issued'
        : 'Auto-Submitted Exam';

    // 3. Find or create draft attempt to persist violation log
    let attempt = await TestAttempt.findOne({
      userId: req.user._id,
      testId,
      isSubmitted: false,
    });

    const testDoc = await Test.findById(testId);
    if (!testDoc) {
      return res.status(404).json({ error: 'Associated test paper not found.' });
    }

    if (!attempt) {
      // Create initial attempt record if not present
      attempt = new TestAttempt({
        userId: req.user._id,
        testId: testDoc._id,
        professorName: testDoc.professorName || '',
        courseId: testDoc.courseId || '',
        subject: testDoc.subject,
        topic: testDoc.topic || testDoc.title || 'Official Exam',
        difficulty: testDoc.difficulty || 'Medium',
        questionTypeFilter: 'Mixed',
        sourceMaterialTitle: testDoc.title || 'Official Exam',
        questions: testDoc.questions || [],
        isSubmitted: false,
        sessionId,
      });
    }

    attempt.violationCount = currentViolationCount;
    attempt.violations.push({
      violationType,
      timestamp: new Date(),
      actionTaken,
    });

    // 4. Check if count >= 3 -> Trigger immediate Auto-Submission
    if (currentViolationCount >= 3) {
      attempt.isSubmitted = true;
      attempt.submitReason = 'ViolationAutoSubmit';
      attempt.completedAt = new Date();

      // Evaluate answers accumulated so far
      const questions = testDoc.questions || [];
      let totalScore = 0;
      let totalMaxPoints = 0;

      const evaluatedQuestions = questions.map((q, idx) => {
        const maxPts = Number(q.points) || 1;
        totalMaxPoints += maxPts;

        const submission = userAnswers[idx];
        const qType = q.questionType || 'MCQ';

        let isCorrect = false;
        let awarded = 0;
        let userSelectedOpt = null;
        let userText = '';

        if (qType === 'MCQ' || qType === 'TrueFalse') {
          userSelectedOpt = typeof submission === 'number' ? submission : parseInt(submission, 10);
          if (!isNaN(userSelectedOpt) && userSelectedOpt === q.correctAnswerIndex) {
            isCorrect = true;
            awarded = maxPts;
          }
        } else if (qType === 'FillBlank') {
          userText = typeof submission === 'string' ? submission.trim() : '';
          const targetText = (q.correctTextAnswer || '').trim().toLowerCase();
          if (userText && (userText.toLowerCase() === targetText || targetText.includes(userText.toLowerCase()))) {
            isCorrect = true;
            awarded = maxPts;
          }
        } else {
          userText = typeof submission === 'string' ? submission.trim() : '';
          if (userText.length > 5) {
            awarded = Math.round(maxPts * 0.5);
            isCorrect = true;
          }
        }

        totalScore += awarded;

        return {
          questionId: q.questionId || String(idx + 1),
          questionType: qType,
          question: q.question,
          options: q.options || [],
          correctAnswerIndex: q.correctAnswerIndex || 0,
          correctTextAnswer: q.correctTextAnswer || '',
          userSelectedOption: userSelectedOpt,
          userTextAnswer: userText,
          isCorrect,
          points: maxPts,
          awardedPoints: awarded,
          explanation: q.explanation || '',
          rubricFeedback: 'Auto-graded upon security violation auto-submission.',
          topicTag: q.topicTag || testDoc.topic || 'Exam',
        };
      });

      attempt.questions = evaluatedQuestions;
      attempt.score = totalScore;
      attempt.totalQuestions = questions.length;
      attempt.totalMaxPoints = totalMaxPoints;
      attempt.percentage = Math.round((totalScore / (totalMaxPoints || 1)) * 100);
      attempt.aiDiagnosticFeedback = `Exam automatically submitted due to security violations (exceeded maximum allowed fullscreen exits / tab switches). Score: ${totalScore}/${totalMaxPoints} (${attempt.percentage}%).`;

      await attempt.save();

      // Delete active session so student cannot continue
      await ActiveExamSession.deleteOne({ userId: req.user._id, testId: testDoc._id });

      // Create GradedSubmission record for professor review
      const gradedItems = evaluatedQuestions.map((q, idx) => ({
        questionNumber: idx + 1,
        questionType: q.questionType || 'MCQ',
        question: q.question,
        studentAnswer: q.userTextAnswer || (q.userSelectedOption !== null ? q.options?.[q.userSelectedOption] : 'No Response'),
        referenceAnswer: q.correctTextAnswer || q.options?.[q.correctAnswerIndex] || 'N/A',
        maxPoints: q.points || 1,
        awardedPoints: q.awardedPoints || 0,
        originalAwardedPoints: q.awardedPoints || 0,
        isOverridden: false,
        rubricCriterion: 'Auto-Submitted Security Violation Policy',
        evaluatorNotes: `Auto-submitted due to ${currentViolationCount} fullscreen/navigation violations.`,
        improvementTip: 'Adhere strictly to official exam integrity guidelines.',
      }));

      await GradedSubmission.create({
        professorId: testDoc.createdBy,
        studentId: req.user._id,
        studentName: req.user.name,
        testId: testDoc._id,
        testAttemptId: attempt._id,
        subject: testDoc.subject,
        assignmentTitle: testDoc.title || 'Official Exam',
        questionPaperText: testDoc.questions?.map((q, idx) => `${idx+1}. [${q.questionType}] ${q.question}`).join('\n') || '',
        submissionText: JSON.stringify(userAnswers),
        sourceExtractionMethod: 'ViolationAutoSubmit',
        gradedItems,
        totalScore,
        maxScore: totalMaxPoints,
        percentage: attempt.percentage,
        overallGrade: attempt.percentage >= 90 ? 'A' : attempt.percentage >= 80 ? 'B+' : attempt.percentage >= 70 ? 'B' : 'C',
        individualizedFeedback: attempt.aiDiagnosticFeedback,
        keyStrengths: attempt.strengths || [],
        areasForGrowth: attempt.weakAreas || [],
        isReleased: false,
      });

      return res.json({
        autoSubmitted: true,
        violationCount: currentViolationCount,
        actionTaken,
        message: 'Exam automatically submitted due to exceeding maximum allowed violations (3+ fullscreen exits).',
        evaluatedResult: attempt,
      });
    }

    // Save non-auto-submitted violation attempt
    await attempt.save();

    res.json({
      autoSubmitted: false,
      violationCount: currentViolationCount,
      actionTaken,
      message: currentViolationCount === 1 ? 'Warning 1: Prohibited navigation detected.' : 'Warning 2 (Final Warning): Next violation will auto-submit exam.',
    });
  } catch (error) {
    console.error('[OfficialTestViolation] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process violation.' });
  }
});

// ==========================================
// 4. STUDENT TEST EVALUATION (OBJECTIVE + SUBJECTIVE RUBRICS + REVISION TOPICS)
// ==========================================
// @route   POST /api/student/tests/submit-comprehensive
// @desc    Submit test answers (evaluates objective + short answers with RAG, computes strengths/weaknesses & revision recommendations)
router.post('/tests/submit-comprehensive', async (req, res) => {
  try {
    const {
      testId,
      sessionId = '',
      subject,
      topic,
      difficulty = 'Medium',
      questionTypeFilter = 'Mixed',
      sourceMaterialTitle = '',
      questions,
      userAnswers = {},
      timeTakenSeconds = 0,
    } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid test submission.' });
    }

    // Server-side check for duplicate official attempt
    if (testId) {
      const existingAttempt = await TestAttempt.findOne({
        userId: req.user._id,
        testId,
      });

      if (existingAttempt) {
        return res.status(400).json({
          error: 'You have already submitted this exam. Officially assigned exams can only be taken once.',
        });
      }
    }

    let totalScore = 0;
    let totalMaxPoints = 0;

    // Evaluate each question
    const evaluatedQuestions = [];
    const subjectiveEvaluationsNeeded = [];

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const maxPts = Number(q.points) || 1;
      totalMaxPoints += maxPts;

      const submission = userAnswers[idx];
      const qType = q.questionType || 'MCQ';

      if (qType === 'MCQ' || qType === 'TrueFalse') {
        // Deterministic matching
        const selectedOpt = typeof submission === 'number' ? submission : parseInt(submission, 10);
        const isCorrect = selectedOpt === q.correctAnswerIndex;
        const awarded = isCorrect ? maxPts : 0;
        totalScore += awarded;

        evaluatedQuestions.push({
          questionId: q.questionId,
          questionType: qType,
          question: q.question,
          options: q.options || [],
          correctAnswerIndex: q.correctAnswerIndex,
          correctTextAnswer: q.options?.[q.correctAnswerIndex] || q.correctTextAnswer || '',
          userSelectedOption: selectedOpt,
          userTextAnswer: q.options?.[selectedOpt] || '',
          isCorrect,
          points: maxPts,
          awardedPoints: awarded,
          explanation: q.explanation,
          rubricFeedback: isCorrect ? 'Correct selection.' : `Incorrect. Expected ${q.options?.[q.correctAnswerIndex]}`,
          topicTag: q.topicTag || topic,
        });
      } else if (qType === 'FillBlank') {
        // Deterministic text matching
        const userText = (typeof submission === 'string' ? submission : '').trim().toLowerCase();
        const correctText = (q.correctTextAnswer || '').trim().toLowerCase();
        const isCorrect = userText.length > 0 && (userText === correctText || correctText.includes(userText));
        const awarded = isCorrect ? maxPts : 0;
        totalScore += awarded;

        evaluatedQuestions.push({
          questionId: q.questionId,
          questionType: qType,
          question: q.question,
          options: [],
          correctAnswerIndex: 0,
          correctTextAnswer: q.correctTextAnswer,
          userSelectedOption: null,
          userTextAnswer: typeof submission === 'string' ? submission : '',
          isCorrect,
          points: maxPts,
          awardedPoints: awarded,
          explanation: q.explanation,
          rubricFeedback: isCorrect ? 'Exact keyword match!' : `Expected: "${q.correctTextAnswer}"`,
          topicTag: q.topicTag || topic,
        });
      } else {
        // Subjective (ShortAnswer / Descriptive)
        subjectiveEvaluationsNeeded.push({
          index: idx,
          question: q.question,
          studentAnswer: typeof submission === 'string' ? submission : '',
          modelAnswer: q.correctTextAnswer || q.explanation,
          maxPoints: maxPts,
          topicTag: q.topicTag || topic,
        });
      }
    }

    // Helper function to detect gibberish, keysmashing, or non-responsive answers
    const isGibberish = (str) => {
      if (!str || typeof str !== 'string') return true;
      const s = str.trim();
      if (s.length === 0) return true;
      if (s.length < 4 && !/^\d+(\.\d+)?$/.test(s)) return true;
      if (/^(abcdef+|qwerty+|asdfgh+|zxcvbn+|12345+)/i.test(s)) return true;
      if (s.length < 10 && !/[aeiou]/i.test(s) && !/^\d+$/.test(s)) return true;
      return false;
    };

    // If there are subjective short answers, evaluate them using Groq + RAG
    if (subjectiveEvaluationsNeeded.length > 0) {
      const subjectivePrompt = `You are an Expert University Professor and AI Examination Evaluator grading student short-answer responses.
Subject: ${subject}
Topic: ${topic}

QUESTIONS AND STUDENT SUBMISSIONS TO EVALUATE:
${JSON.stringify(subjectiveEvaluationsNeeded, null, 2)}

EVALUATION DIRECTIVES:
1. GIBBERISH / NON-ANSWERS: If a student submission is random text, keysmashing, nonsense (e.g., 'abcdef', 'asdfgh'), or completely off-topic, award 0 points (awardedPoints: 0, isCorrect: false).
2. SUBJECTIVE & THEORY ANSWERS: Be LIBERAL and FAIR like a professor. Do NOT demand exact textbook wording! If the student captures the core concepts, key terms, or reasoning in their own words, award FULL MARKS (awardedPoints = maxPoints, isCorrect = true).
3. MATHEMATICAL & EXPRESSIONS: Award partial credit for correct formula setup or intermediate steps even if final arithmetic has a minor slip.
4. PROGRAMMING & CODE: Be STRICT on algorithm logic, variable invariants, and loop structures.

Return ONLY valid JSON matching:
{
  "evaluatedSubjectives": [
    {
      "index": 0,
      "awardedPoints": 3,
      "isCorrect": true,
      "rubricFeedback": "Good reasoning on core invariants.",
      "improvementTip": "Mention boundary conditions."
    }
  ]
}`;

      const evalCompletion = await generateChatCompletion({
        messages: [
          { role: 'system', content: 'You are an academic evaluator. Output JSON.' },
          { role: 'user', content: subjectivePrompt },
        ],
        response_format: { type: 'json_object' },
      });

      let parsedSubj;
      try {
        parsedSubj = JSON.parse(evalCompletion);
      } catch (err) {
        const match = evalCompletion.match(/\{[\s\S]*\}/);
        parsedSubj = match ? JSON.parse(match[0]) : { evaluatedSubjectives: [] };
      }

      const subjMap = {};
      (parsedSubj?.evaluatedSubjectives || []).forEach((item) => {
        subjMap[item.index] = item;
      });

      subjectiveEvaluationsNeeded.forEach((item) => {
        const sAns = item.studentAnswer ? item.studentAnswer.trim() : '';
        const isBad = isGibberish(sAns);

        let result = subjMap[item.index];
        if (!result) {
          if (isBad) {
            result = {
              awardedPoints: 0,
              isCorrect: false,
              rubricFeedback: 'Incorrect or non-responsive answer. No valid conceptual explanation provided.',
            };
          } else {
            result = {
              awardedPoints: Math.round(item.maxPoints * 0.75),
              isCorrect: true,
              rubricFeedback: 'Appropriate conceptual explanation covering core topic points.',
            };
          }
        } else if (isBad) {
          // Override if LLM erroneously hallucinated points for gibberish like 'abcdef'
          result.awardedPoints = 0;
          result.isCorrect = false;
          result.rubricFeedback = 'Incorrect or non-responsive answer.';
        }

        totalScore += Number(result.awardedPoints || 0);

        evaluatedQuestions.push({
          questionId: questions[item.index].questionId,
          questionType: questions[item.index].questionType || 'ShortAnswer',
          question: item.question,
          options: [],
          correctAnswerIndex: 0,
          correctTextAnswer: item.modelAnswer,
          userSelectedOption: null,
          userTextAnswer: item.studentAnswer,
          isCorrect: result.isCorrect,
          points: item.maxPoints,
          awardedPoints: result.awardedPoints,
          explanation: questions[item.index].explanation,
          rubricFeedback: result.rubricFeedback,
          topicTag: item.topicTag,
        });
      });
    }

    // Sort evaluated questions back into original index order
    evaluatedQuestions.sort((a, b) => {
      const idxA = questions.findIndex((q) => q.question === a.question);
      const idxB = questions.findIndex((q) => q.question === b.question);
      return idxA - idxB;
    });

    const percentage = Math.round((totalScore / (totalMaxPoints || 1)) * 100);

    // Extract concept names from evaluated questions for Granular Strengths and Weaknesses
    const extractConceptName = (q) => {
      let tag = (q.topicTag || '').trim();
      const generic = ['computer science', 'general', 'aptitude', 'course material test', 'assessment', subject.toLowerCase(), topic.toLowerCase()];
      if (!tag || generic.includes(tag.toLowerCase())) {
        const clean = (q.question || '')
          .replace(/^(what is|explain|describe|briefly|which of the following|calculate|find|in the|complete)\s+/i, '')
          .replace(/\?$/g, '')
          .trim();
        tag = clean.length > 55 ? clean.slice(0, 50) + '...' : clean;
      }
      return tag || 'Core Principle';
    };

    const missedItems = evaluatedQuestions.filter((q) => !q.isCorrect && q.awardedPoints < q.points * 0.6);
    const correctItems = evaluatedQuestions.filter((q) => q.isCorrect || q.awardedPoints >= q.points * 0.6);

    const weakAreas = Array.from(new Set(missedItems.map(extractConceptName))).filter(Boolean);
    const strengths = Array.from(new Set(correctItems.map(extractConceptName))).filter(Boolean);

    if (weakAreas.length === 0) weakAreas.push('Advanced Edge Cases & Complex Derivations');
    if (strengths.length === 0) strengths.push('Core Foundational Concepts');

    // Generate 100% test-result centric feedback summary
    let diagnosticFeedback = '';
    try {
      const diagPrompt = `Synthesize a 2-sentence, highly specific test-result centric feedback summary for student "${req.user.name}" who scored ${totalScore}/${totalMaxPoints} (${percentage}%) on an exam in "${subject}".
Mastered Concepts (Student Answered Correctly): ${strengths.join('; ')}
Missed Concepts (Student Answered Incorrectly): ${weakAreas.join('; ')}

Instructions:
1. Praise specific mastered concepts (${strengths.slice(0, 2).join(', ')}).
2. Specifically point out missed concepts requiring revision (${weakAreas.slice(0, 2).join(', ')}).
Return ONLY JSON: {"feedback": "2-sentence test-result centric feedback paragraph..."}`;

      const diagCompletion = await generateChatCompletion({
        messages: [
          { role: 'system', content: 'You are an academic diagnostics coach. Output JSON.' },
          { role: 'user', content: diagPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      const parsedD = JSON.parse(diagCompletion);
      diagnosticFeedback = parsedD?.feedback || parsedD?.aiDiagnosticFeedback || '';
    } catch (err) {
      console.error('[DiagnosticFeedback] LLM call failed:', err.message);
    }

    if (!diagnosticFeedback) {
      if (percentage >= 80) {
        diagnosticFeedback = `Excellent performance! ${req.user.name} scored ${totalScore}/${totalMaxPoints} (${percentage}%). Strong mastery demonstrated in ${strengths.slice(0, 2).join(' and ')}.`;
      } else if (percentage >= 50) {
        diagnosticFeedback = `${req.user.name} scored ${totalScore}/${totalMaxPoints} (${percentage}%). Good effort on ${strengths[0] || 'foundational concepts'}, but further revision is required for ${weakAreas.slice(0, 2).join(' and ')}.`;
      } else {
        diagnosticFeedback = `${req.user.name} scored ${totalScore}/${totalMaxPoints} (${percentage}%). Mastery was shown in ${strengths[0] || 'basic concepts'}, but significant improvement is needed in ${weakAreas.slice(0, 2).join(' and ')}.`;
      }
    }

    let testDoc = null;
    if (testId) {
      testDoc = await Test.findById(testId);
    }

    const isAssigned = !!testDoc;

    const testAttempt = await TestAttempt.create({
      userId: req.user._id,
      testId: isAssigned ? testDoc._id : undefined,
      professorName: isAssigned ? (testDoc.professorName || '') : '',
      courseId: isAssigned ? (testDoc.courseId || '') : '',
      subject,
      topic,
      difficulty,
      questionTypeFilter,
      sourceMaterialTitle: isAssigned ? (testDoc.title || sourceMaterialTitle) : sourceMaterialTitle,
      questions: evaluatedQuestions,
      score: totalScore,
      totalQuestions: questions.length,
      totalMaxPoints,
      percentage,
      weakAreas,
      strengths,
      recommendedRevisionTopics: isAssigned ? [] : (weakAreas),
      aiDiagnosticFeedback: diagnosticFeedback,
      timeTakenSeconds,
      isReleased: !isAssigned,
      completedAt: new Date(),
      sessionId: isAssigned ? sessionId : '',
      isSubmitted: true,
    });

    if (isAssigned) {
      // Clear active exam session upon successful submission
      await ActiveExamSession.deleteOne({ userId: req.user._id, testId: testDoc._id });

      // Create GradedSubmission for professor review
      const gradedItems = evaluatedQuestions.map((q, idx) => {
        let studentAnsText = 'No Answer';
        if (q.userSelectedOption !== null && q.userSelectedOption !== undefined) {
          studentAnsText = q.options?.[q.userSelectedOption] || String(q.userSelectedOption);
        } else if (q.userTextAnswer) {
          studentAnsText = q.userTextAnswer;
        }
        
        let refAnsText = 'N/A';
        if (q.correctAnswerIndex !== null && q.correctAnswerIndex !== undefined && q.options?.length > 0) {
          refAnsText = q.options[q.correctAnswerIndex];
        } else if (q.correctTextAnswer) {
          refAnsText = q.correctTextAnswer;
        }

        return {
          questionNumber: idx + 1,
          questionType: q.questionType || 'ShortAnswer',
          question: q.question,
          studentAnswer: studentAnsText,
          referenceAnswer: refAnsText,
          maxPoints: q.points || 1,
          awardedPoints: q.awardedPoints || 0,
          originalAwardedPoints: q.awardedPoints || 0,
          isOverridden: false,
          rubricCriterion: ['MCQ', 'TrueFalse', 'FillBlank'].includes(q.questionType) ? 'Objective Correctness' : 'AI Grading Rubric',
          evaluatorNotes: q.rubricFeedback || '',
          improvementTip: q.improvementTip || ''
        };
      });

      await GradedSubmission.create({
        professorId: testDoc.createdBy,
        studentId: req.user._id,
        studentName: req.user.name,
        testId: testDoc._id,
        testAttemptId: testAttempt._id,
        subject: testDoc.subject || subject,
        assignmentTitle: testDoc.title || 'Online Assessment',
        questionPaperText: testDoc.questions?.map((q, idx) => `${idx+1}. [${q.questionType}] ${q.question}`).join('\n') || '',
        submissionText: JSON.stringify(userAnswers),
        sourceExtractionMethod: 'OnlineSubmission',
        gradedItems,
        totalScore,
        maxScore: totalMaxPoints,
        percentage,
        overallGrade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B+' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D',
        individualizedFeedback: diagnosticFeedback,
        keyStrengths: strengths,
        areasForGrowth: weakAreas,
        isReleased: false,
      });
    }

    res.status(201).json(testAttempt);
  } catch (error) {
    console.error('[TestSubmitComprehensive] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate test submission.' });
  }
});

// Standard submit test alias
router.post('/tests/submit', async (req, res) => {
  try {
    const { subject, topic, difficulty, questions, userAnswers, timeTakenSeconds } = req.body;
    let score = 0;
    const evaluated = (questions || []).map((q, idx) => {
      const selected = userAnswers[idx];
      const isCorrect = selected === q.correctAnswerIndex;
      if (isCorrect) score += 1;
      return {
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        userSelectedOption: selected,
        isCorrect,
        explanation: q.explanation,
        topicTag: q.topicTag || topic,
      };
    });

    const total = questions.length || 1;
    const percentage = Math.round((score / total) * 100);

    const missed = evaluated.filter((q) => !q.isCorrect).map((q) => q.topicTag);
    const correct = evaluated.filter((q) => q.isCorrect).map((q) => q.topicTag);

    const attempt = await TestAttempt.create({
      userId: req.user._id,
      subject,
      topic,
      difficulty: difficulty || 'Medium',
      questions: evaluated,
      score,
      totalQuestions: total,
      totalMaxPoints: total,
      percentage,
      weakAreas: Array.from(new Set(missed)),
      strengths: Array.from(new Set(correct)),
      recommendedRevisionTopics: Array.from(new Set(missed)),
      aiDiagnosticFeedback: `Good effort! Scored ${score}/${total} (${percentage}%).`,
      timeTakenSeconds: timeTakenSeconds || 0,
      completedAt: new Date(),
    });

    res.status(201).json(attempt);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to submit test.' });
  }
});

// @route   GET /api/student/tests/history
// @desc    Get practice test history for the logged-in student
router.get('/tests/history', async (req, res) => {
  try {
    const history = await TestAttempt.find({ userId: req.user._id }).sort({ completedAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test history.' });
  }
});

// @route   DELETE /api/student/tests/history/:id
// @desc    Delete a single test attempt from student's history
router.delete('/tests/history/:id', async (req, res) => {
  try {
    // Prevent deletion of official professor-assigned exams
    const attempt = await TestAttempt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Test record not found or access denied.' });
    }

    if (attempt.testId) {
      return res.status(403).json({ error: 'Official exam attempts cannot be deleted from your records.' });
    }

    await TestAttempt.deleteOne({ _id: req.params.id });
    res.json({ message: 'Test attempt deleted successfully.', id: req.params.id });
  } catch (error) {
    console.error('[TestHistoryDeleteSingle] Error:', error);
    res.status(500).json({ error: 'Failed to delete test attempt.' });
  }
});

// @route   DELETE /api/student/tests/history
// @desc    Reset / Clear all test attempts and diagnostics for the student
router.delete('/tests/history', async (req, res) => {
  try {
    // Only delete self-practice test attempts (where testId is not present)
    const result = await TestAttempt.deleteMany({
      userId: req.user._id,
      testId: { $exists: false },
    });
    res.json({
      message: 'All self-practice test history and diagnostics have been reset successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[TestHistoryResetAll] Error:', error);
    res.status(500).json({ error: 'Failed to reset test history.' });
  }
});

// ==========================================
// 5. DOUBT CLARIFICATION CHAT WITH RAG CITATIONS
// ==========================================
// @route   POST /api/student/doubts
// @desc    Ask a doubt, retrieve syllabus/textbook chunks from student vault, answer with Groq & cite sources
router.post('/doubts', async (req, res) => {
  try {
    const {
      subject,
      subjectCode = '',
      department = 'CSE',
      query,
      selectedDocTitle = '',
    } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Question or doubt query is required.' });
    }

    // 1. Retrieve subjectCode-scoped RAG chunks (Isolated to student's knowledge vault & course syllabus)
    const relevantChunks = await retrieveRelevantChunks({
      subject: subject || 'All',
      subjectCode: subjectCode || null,
      department: department || null,
      query: `${query} ${subjectCode} ${selectedDocTitle}`,
      topK: 4,
      userId: req.user._id,
      docTitle: selectedDocTitle || null,
    });
    const groundedContext = formatGroundedContext(relevantChunks);

    const prompt = `You are the EduCopilot Academic Assistant helping a student clarify their doubt.
Subject: ${subject || 'General Academic'}
Student Question: "${query}"

RETRIEVED COURSE MATERIAL / SYLLABUS / TEXTBOOK CONTEXT:
${groundedContext}

Instructions:
- Provide a crystal-clear, structured academic explanation grounded strictly in the course material provided.
- Format using clean Markdown only. Use ## Heading for main sections, ### for subheadings, - for bullet points, and **bold text** for important terms and definitions.
- Do NOT output raw HTML tags (e.g. do NOT output <h2>, <h3>, <p>, <ul>, <li>).
- Do NOT include redundant "Core Takeaways" or "Key Takeaways" text inside the "answer" field, as they are provided separately in the keyTakeaways array.
Return ONLY valid JSON matching this structure:
{
  "answer": "Clear formatted answer with ## Section Headings, bullet points, and **bold keywords**.",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
  "suggestedFollowUps": ["Follow-up question 1?", "Follow-up question 2?"]
}`;

    const completion = await generateChatCompletion({
      action: 'solve_doubt',
      userId: req.user._id,
      role: 'STUDENT',
      payload: {
        question: query,
        query,
        subject,
        subjectCode,
        selectedDocTitle,
      },
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent academic tutor. Output ONLY JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed;
    try {
      parsed = JSON.parse(completion);
    } catch (err) {
      const jsonMatch = completion.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          parsed = null;
        }
      }
    }

    const formatToCleanMarkdown = (val, depth = 3) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val.trim();
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      if (Array.isArray(val)) {
        return val.map((item) => `- ${formatToCleanMarkdown(item, depth + 1)}`).join('\n');
      }
      if (typeof val === 'object') {
        const hashes = '#'.repeat(Math.min(depth, 4));
        return Object.entries(val)
          .map(([k, v]) => `${hashes} ${k}\n${formatToCleanMarkdown(v, depth + 1)}`)
          .join('\n\n');
      }
      return String(val);
    };

    let rawAnswer =
      (parsed && (parsed.answer || parsed.explanation || parsed.response || parsed.clarification || parsed.content || parsed.message || parsed.result)) ||
      (typeof parsed === 'string' && parsed.trim() ? parsed.trim() : '') ||
      (typeof completion === 'string' && completion.trim() ? completion.trim() : '') ||
      'Based on your course materials, here is the verified academic explanation for your doubt.';

    rawAnswer = formatToCleanMarkdown(rawAnswer);

    // Clean any trailing duplicate takeaways header from answer
    const answer = rawAnswer
      .replace(/(?:\r\n|\r|\n)+(?:#{1,4}\s*)?(?:Core|Key)\s*Takeaways[\s\S]*$/i, '')
      .trim();

    const keyTakeaways =
      (parsed && Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0 && parsed.keyTakeaways) ||
      (parsed && Array.isArray(parsed.takeaways) && parsed.takeaways.length > 0 && parsed.takeaways) ||
      [
        'Understand foundational definitions and theorems',
        'Review edge-case state transitions and system invariants',
        'Practice related test questions to test comprehension',
      ];

    const suggestedFollowUps =
      (parsed && Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0 && parsed.suggestedFollowUps) ||
      (parsed && Array.isArray(parsed.followUps) && parsed.followUps.length > 0 && parsed.followUps) ||
      [
        'How does this concept apply under extreme failure scenarios?',
        'Can you provide a step-by-step example with numbers/code?',
        'What are the primary performance and complexity trade-offs?',
      ];

    const citedSources = relevantChunks.map((c) => ({
      docTitle: c.docTitle,
      subject: c.subject,
      chunkExcerpt: (c.chunkText || '').slice(0, 250) + '...',
      relevanceScore: c.relevanceScore || 0.85,
    }));

    const doubtRecord = await Doubt.create({
      userId: req.user._id,
      subject: subject || 'General',
      query,
      answer,
      citedSources,
      keyTakeaways,
      suggestedFollowUps,
    });

    res.status(201).json(doubtRecord);
  } catch (error) {
    console.error('[DoubtClarification] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to clarify doubt.' });
  }
});

// @route   GET /api/student/doubts/history
// @desc    Get doubt clarification history for the logged-in student
router.get('/doubts/history', async (req, res) => {
  try {
    const doubts = await Doubt.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(doubts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doubt history.' });
  }
});

// @route   DELETE /api/student/doubts/history/:id
// @desc    Delete a single doubt record for the logged-in student
router.delete('/doubts/history/:id', async (req, res) => {
  try {
    const deleted = await Doubt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Doubt record not found or access denied.' });
    }

    res.json({ message: 'Doubt question deleted successfully.', id: req.params.id });
  } catch (error) {
    console.error('[DoubtDeleteSingle] Error:', error);
    res.status(500).json({ error: 'Failed to delete doubt question.' });
  }
});

// @route   DELETE /api/student/doubts/history
// @desc    Reset / Clear all doubt history for the logged-in student
router.delete('/doubts/history', async (req, res) => {
  try {
    const result = await Doubt.deleteMany({ userId: req.user._id });
    res.json({
      message: 'All doubt questions have been cleared successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[DoubtResetAll] Error:', error);
    res.status(500).json({ error: 'Failed to clear doubt history.' });
  }
});

// ==========================================
// 6. STUDENT READ-ONLY SUBJECT-SCOPED RAG SEARCH
// ==========================================
// @route   POST /api/student/rag/search
// @desc    Read-only course material RAG search & answer scoped by subjectCode
// @access  Protected (Student only)
router.post('/rag/search', async (req, res) => {
  try {
    const { subjectCode, query, subject, department = 'CSE', topK = 4 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Retrieve relevant chunks filtered strictly by subjectCode
    const relevantChunks = await retrieveRelevantChunks({
      subjectCode: subjectCode || null,
      department: department || null,
      subject: subject || 'All',
      query: query.trim(),
      topK: Number(topK) || 4,
      userId: req.user._id,
    });

    const groundedContext = formatGroundedContext(relevantChunks);

    const prompt = `You are the EduCopilot Academic Assistant providing answers grounded strictly in the course material for ${subjectCode || subject || 'the course'}.
Student Query: "${query}"

RETRIEVED COURSE MATERIAL & SYLLABUS CONTEXT:
${groundedContext}

Instructions:
- Provide a clear, intuitive, and structured academic answer grounded strictly in the retrieved course chunks.
- Format using clean Markdown only. Use ## Heading for sections, - for bullet points, and **bold text** for important definitions. Do NOT output raw HTML tags.
- Return ONLY valid JSON matching this exact structure:
{
  "answer": "Clear markdown answer with ## Section Headings and bullet points.",
  "keyTakeaways": ["Key point 1", "Key point 2"],
  "suggestedFollowUps": ["Related concept question 1?", "Related concept question 2?"]
}`;

    const completion = await generateChatCompletion({
      messages: [
        { role: 'system', content: 'You are an academic tutor. Output ONLY JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed;
    try {
      parsed = JSON.parse(completion);
    } catch (err) {
      const match = completion.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    res.json({
      query,
      subjectCode: subjectCode || '',
      subject: subject || '',
      department: department || 'CSE',
      answer: parsed?.answer || completion,
      keyTakeaways: parsed?.keyTakeaways || [],
      suggestedFollowUps: parsed?.suggestedFollowUps || [],
      relevantChunks,
    });
  } catch (error) {
    console.error('[StudentRAGSearch] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform course RAG search.' });
  }
});

module.exports = router;
