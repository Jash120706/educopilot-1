const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateChatCompletion } = require('../services/groqService');

// Protect support assistant route
router.use(protect);

/**
 * Detailed Feature Knowledge Base for Student Role
 */
const STUDENT_KNOWLEDGE_BASE = `
STUDENT WORKSPACE FEATURE MANUAL:

1. Dashboard (/student/dashboard):
   - Overview: Displays daily study momentum, target exam countdown, active study plans, and diagnostic performance metrics.

2. View Study Plans (/student/study-plans):
   - How it works: Visualizes generated multi-day study roadmaps in card layout.
   - Usage: Toggle task status (Pending, In Progress, Completed) and track overall milestone completion percentage.

3. Generate Study Plan (/student/study-plans/generate):
   - How it works: Upload a course syllabus PDF or paste raw syllabus text.
   - Settings: Specify daily study hours and target exam date.
   - Output: AI generates a structured multi-day study plan breaking syllabus units into daily topics with estimated study times.

4. Practice Tests (/student/practice-tests):
   - How it works: Self-assessment diagnostic test generator.
   - Difficulties: Easy, Medium, Hard, and Adaptive (dynamically adjusts question difficulty based on correct/incorrect answers).
   - Features: Real-time countdown timer, instant AI diagnostic explanation after submission, score calculation, and history saving.

5. Prof Exams (/student/prof-exams):
   - How it works: Official exams created by your professor.
   - Access Code: Enter the secure Access Code (e.g., EXAM-84920) provided by your instructor to unlock the exam.
   - Features: Timed test interface, answer submission, and viewing released grades with AI rubric feedback once graded by your professor.

6. Ask a Doubt (/student/doubt-chat):
   - How it works: 24/7 RAG syllabus-grounded Q&A tutor.
   - Features: Type any conceptual question; the AI searches your course knowledge base chunks to provide textbook-grounded answers with formulas and step-by-step reasoning.

7. Course Knowledge RAG (/student/materials-rag):
   - How it works: Upload personal lecture notes, textbook PDFs, or text files.
   - Features: Embeds documents into vector storage so Ask a Doubt can reference your exact course materials.

8. Test History (/student/test-history):
   - How it works: Analytics dashboard for all past practice tests and official exams.
   - Features: Score progress charts, accuracy breakdown, time per question, and Weak Area Diagnostics identifying units needing revision.
`;

/**
 * Detailed Feature Knowledge Base for Professor Role
 */
const PROFESSOR_KNOWLEDGE_BASE = `
PROFESSOR TEACHING SUITE FEATURE MANUAL:

1. Dashboard (/professor/dashboard):
   - Overview: Course summary, uploaded syllabus documents count, total student test submissions, recent lecture sequences, and quick action cards.

2. Course Materials RAG (/professor/materials-rag):
   - How it works: Upload course syllabi, PDF textbooks, lecture notes, or raw text chunks.
   - Features: Chunks and embeds documents into the vector database. Powers the Schedule Generator, Material Prep, and Question Generator with authoritative course context.

3. View Lecture Schedules (/professor/schedules):
   - How it works: Displays saved slot-by-slot lecture timetables in card layout.
   - Vault: Browse past schedule sequences, prerequisite timelines, and slot breakdowns.

4. Generate Schedule (/professor/scheduling/generate):
   - How it works: Select uploaded syllabus material from Knowledge Base or paste syllabus text.
   - Inputs: Set Number of Periods (e.g., 20, 30, 45 slots) and Minutes Per Period (type multi-digit numbers freely).
   - Output: AI computes a slot-by-slot timetable enforcing prerequisite dependency ordering (foundational units first, advanced topics later), complete with subtopics, key formulas, schematics, and slot durations.

5. Material Prep (/professor/material-prep):
   - How it works: Select a syllabus topic and generate teaching assets:
     - Slide Deck Outlines: Multi-slide structure with bullet points and comprehensive speaker notes.
     - Lecture Notes: 800-1200+ word textbook-quality markdown lecture notes with equations, worked examples, and key takeaways.
     - Practice Question Banks: Itemized short-answer, formula, and conceptual practice questions with answer keys and grading rubrics.

6. Share Notes via Gmail (/professor/share-notes):
   - How it works: Enter note title, description, and formatted note content. Add recipient student emails or upload an Excel student roster (.xlsx / .csv). Attach optional PDF notes.
   - Features: Dispatches study materials directly to students' inboxes via Nodemailer Gmail SMTP (Port 465 SSL) with dispatch delivery logs.

7. Assessment & Grading (/professor/grading):
   - How it works: Review student answer sheet submissions for published prof exams.
   - Features: AI Rubric Auto-Grading evaluates student answers against master rubrics, generates feedback per question, calculates total scores, and permits manual grade overrides before releasing grades.

8. Create & Manage Tests (/professor/create-test):
   - How it works: Create official scoped exams by selecting course topics, setting question counts, difficulty weights, time limits, and test title.
   - Access Code: Automatically generates a secure Access Code (e.g., EXAM-93821).
   - Dispatch: Send test invitation emails containing the Access Code directly to enrolled students.
`;

router.post('/assistant', async (req, res) => {
  try {
    const { query } = req.body;
    // Extract role and name from body first (from active AuthContext state), falling back to JWT user
    const userRole = req.body.role || req.user?.role || 'student';
    const userName = req.body.name || req.user?.name || (userRole === 'student' ? 'Student' : 'Professor');

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query prompt is required.' });
    }

    const queryLower = query.toLowerCase().trim();

    // ----------------------------------------------------
    // 1. ETHICAL SAFEGUARD PATTERNS
    // ----------------------------------------------------
    let isUnethical = false;
    let unethicalType = '';
    let unethicalReason = '';
    let suggestedFeatureLink = '';
    let suggestedFeatureLabel = '';

    if (userRole === 'student') {
      if (
        queryLower.includes('cheat') ||
        queryLower.includes('hack') ||
        queryLower.includes('bypass timer') ||
        queryLower.includes('time hack') ||
        queryLower.includes('live exam answer') ||
        queryLower.includes('answer key for prof exam') ||
        queryLower.includes('give me answers for test') ||
        queryLower.includes('crack access code') ||
        queryLower.includes('steal exam') ||
        queryLower.includes('illegal') ||
        queryLower.includes('offensive')
      ) {
        isUnethical = true;
        unethicalType = 'Academic Integrity Violation';
        unethicalReason = 'EduCopilot enforces strict academic integrity policies. Bypassing exam timers, requesting direct live exam answers, or cracking test access codes is strictly prohibited.';
        suggestedFeatureLink = '/student/practice-tests';
        suggestedFeatureLabel = 'Explore Adaptive Practice Tests';
      }
    } else {
      if (
        queryLower.includes('forge') ||
        queryLower.includes('fake marks') ||
        queryLower.includes('fake grades') ||
        queryLower.includes('alter student score secretly') ||
        queryLower.includes('spam emails') ||
        queryLower.includes('expose student private data') ||
        queryLower.includes('discriminatory question') ||
        queryLower.includes('illegal')
      ) {
        isUnethical = true;
        unethicalType = 'Institutional Policy & Ethics Violation';
        unethicalReason = 'EduCopilot Teaching Suite strictly enforces institutional compliance and data privacy. Falsifying grade records, bulk spamming un-enrolled emails, or exposing private student records is strictly prohibited.';
        suggestedFeatureLink = '/professor/grading';
        suggestedFeatureLabel = 'Explore Assessment & Grading';
      }
    }

    if (isUnethical) {
      const ethicalReply = `### ⚠️ Policy & Ethics Advisory

Hello **${userName}**, 

${unethicalReason}

#### 💡 How to Use EduCopilot Effectively:
Instead of seeking restricted or unethical workarounds, we strongly encourage you to explore our legitimate learning and teaching tools:

${
  userRole === 'student'
    ? `- 📝 **Practice Tests**: Generate adaptive quizzes to test your knowledge before exams.\n- 💬 **Ask a Doubt**: Ask syllabus-grounded questions over your course materials.\n- 📅 **Study Plans**: Create step-by-step learning roadmaps tailored to your timetable.`
    : `- 🎓 **Assessment & Grading**: Review AI rubric evaluation and provide constructive student feedback.\n- 📚 **Material Prep**: Auto-draft comprehensive slides, lecture notes, and practice question banks.\n- 📧 **Share Notes**: Safely dispatch study materials directly to your enrolled students via Gmail.`
}

👉 Click **${suggestedFeatureLabel}** below to explore this feature!`;

      return res.json({
        reply: ethicalReply,
        isUnethical: true,
        unethicalType,
        suggestedFeatureLink,
        suggestedFeatureLabel,
      });
    }

    // ----------------------------------------------------
    // 2. NON-EXISTENT FEATURE INTERCEPTIONS (Strict App Reality)
    // ----------------------------------------------------
    if (
      queryLower.includes('other professor login') ||
      queryLower.includes('shared professor') ||
      queryLower.includes('multiple professor login') ||
      queryLower.includes('share professor account') ||
      queryLower.includes('collaborative login') ||
      queryLower.includes('share account')
    ) {
      const reply = `### ℹ️ Feature Not Provided (Strict Data Isolation)

Hello **${userName}**,

**EduCopilot does NOT support multi-professor shared logins or shared account access.**

EduCopilot enforces **Strict Account Data Isolation**. All course materials, lecture schedules, notes, tests, and student grades are scoped strictly and privately to your individual account ID. No cross-account access or shared login is permitted.

#### 🏛️ Available Features in your Professor Teaching Suite:
- 📚 **Course Materials (RAG)**: Upload syllabi & knowledge chunks for your courses.
- 🗓️ **Generate Schedule**: Compute slot-by-slot prerequisite lecture timetables.
- 📝 **Material Prep**: Auto-draft slides, lecture notes, and practice question banks.
- 📧 **Share Notes**: Safely dispatch notes directly to enrolled student emails via Gmail.
- 🎓 **Assessment & Grading**: AI rubric evaluation for student answer sheets.
- 📝 **Create & Manage Tests**: Create scoped tests with custom Access Codes for your students.`;

      return res.json({
        reply,
        isUnethical: false,
        suggestedFeatureLink: '/professor/dashboard',
        suggestedFeatureLabel: 'Go to Professor Dashboard',
      });
    }

    if (
      queryLower.includes('video call') ||
      queryLower.includes('live stream') ||
      queryLower.includes('zoom') ||
      queryLower.includes('google meet') ||
      queryLower.includes('attendance') ||
      queryLower.includes('qr scanner') ||
      queryLower.includes('peer chat room') ||
      queryLower.includes('discussion forum')
    ) {
      const reply = `### ℹ️ Feature Not Provided in EduCopilot

Hello **${userName}**,

This feature (**"${query.trim()}"**) is **currently not provided** in EduCopilot.

EduCopilot is an AI-powered course copilot focused on personalized study planning, adaptive practice tests, RAG doubt solving, automated lecture scheduling, material preparation, Gmail notes dispatch, and AI assessment.

#### 💡 Features Available in EduCopilot:
${
  userRole === 'student'
    ? `- 📅 **Generate Study Plan**: AI roadmap generator from syllabus text or PDF.\n- 📝 **Practice Tests**: Adaptive quizzes across Easy/Medium/Hard/Adaptive.\n- 🎓 **Prof Exams**: Take official tests using Access Codes from your professor.\n- 💬 **Ask a Doubt**: 24/7 RAG syllabus-grounded AI tutor.\n- 📊 **Test History**: Score breakdown & weak area diagnostics.`
    : `- 📚 **Course Materials (RAG)**: Knowledge base upload.\n- 🗓️ **Generate Schedule**: Prerequisite slot sequencer.\n- 📝 **Material Prep**: Auto-draft slides, notes & practice questions.\n- 📧 **Share Notes**: Send PDF study notes via Gmail.\n- 🎓 **Assessment & Grading**: AI rubric auto-grading.\n- 📝 **Create & Manage Tests**: Scoped test creator with Access Codes.`
}`;

      return res.json({
        reply,
        isUnethical: false,
        suggestedFeatureLink: userRole === 'student' ? '/student/dashboard' : '/professor/dashboard',
        suggestedFeatureLabel: userRole === 'student' ? 'Go to Student Dashboard' : 'Go to Professor Dashboard',
      });
    }

    // ----------------------------------------------------
    // 3. ROLE CROSS-ACCESS INTERCEPTIONS (Strict Role Isolation)
    // ----------------------------------------------------
    if (userRole === 'student') {
      if (
        queryLower.includes('other student grade') ||
        queryLower.includes('other student') ||
        queryLower.includes('another student') ||
        queryLower.includes('friend grade') ||
        queryLower.includes('peer grade')
      ) {
        const reply = `### 🔒 Data Privacy Advisory (Strict Data Isolation)

Hello **${userName}**,

**EduCopilot enforces Strict Account Data Isolation.** You cannot view, access, or evaluate other students' grades or test submissions.

Each student's test history, practice scores, and official exam results are scoped strictly and privately to their own account ID.

#### 🎓 Features Available in your Student Workspace:
- 📊 **Test History**: View your own practice test diagnostics, score trends, and weak areas.
- 🎓 **Prof Exams**: View your own official exam scores and professor feedback once released.
- 📅 **Generate Study Plan**: Create a personalized study roadmap from your syllabus.
- 📝 **Practice Tests**: Take self-assessment quizzes to test your knowledge.`;

        return res.json({
          reply,
          isUnethical: false,
          suggestedFeatureLink: '/student/test-history',
          suggestedFeatureLabel: 'Open Test History Analytics',
        });
      }

      if (
        queryLower.includes('question paper') ||
        queryLower.includes('create test') ||
        queryLower.includes('manage test') ||
        queryLower.includes('create exam') ||
        queryLower.includes('grade') ||
        queryLower.includes('grading') ||
        queryLower.includes('auto grade') ||
        queryLower.includes('rubric') ||
        queryLower.includes('material prep') ||
        queryLower.includes('generate schedule') ||
        queryLower.includes('share notes') ||
        queryLower.includes('gmail notes') ||
        queryLower.includes('professor') ||
        queryLower.includes('teaching suite')
      ) {
        const reply = `### 🔒 Role Access Restriction (Professor Feature)

Hello **${userName}**,

The feature you asked about (**"${query.trim()}"**) belongs to the **Professor Teaching Suite** and is **not accessible from a Student account**.

As a **Student**, your account gives you access strictly to the **Student Learning Workspace**:

#### 🎓 Features Available in your Student Workspace:
- 📅 **Generate Study Plan**: Upload syllabus text or PDFs to create a personalized study roadmap.
- 📝 **Practice Tests**: Take adaptive practice quizzes (Easy, Medium, Hard, Adaptive) with real-time feedback.
- 🎓 **Prof Exams**: Access official tests assigned by your professor using your secure **Access Code** and view your released grades.
- 💬 **Ask a Doubt**: Ask syllabus-grounded questions using our RAG AI tutor.
- 📊 **Test History**: Review diagnostic performance and track your weak areas.

If you are trying to take a test assigned by your professor, please go to **Prof Exams** and enter the **Access Code** provided by your instructor!`;

        return res.json({
          reply,
          isUnethical: false,
          suggestedFeatureLink: '/student/prof-exams',
          suggestedFeatureLabel: 'Open Prof Exams Workspace',
        });
      }
    } else {
      if (
        queryLower.includes('take practice test') ||
        queryLower.includes('my study plan') ||
        queryLower.includes('take prof exam as student') ||
        queryLower.includes('student practice quiz')
      ) {
        const reply = `### 🔒 Role Access Restriction (Student Feature)

Hello **Prof. ${userName}**,

Student practice test-taking and personal study plan generation belong to the **Student Learning Workspace** and cannot be accessed from a Professor account.

As a **Professor**, your account gives you access strictly to the **Professor Teaching Suite**:

#### 🏛️ Features Available in your Professor Suite:
- 📚 **Course Materials (RAG)**: Upload syllabus & textbook PDFs to build your course knowledge base.
- 🗓️ **Generate Schedule**: Auto-sequence slot-by-slot lecture timelines based on prerequisites.
- 📝 **Material Prep**: Auto-draft slide decks, comprehensive notes, and practice question banks.
- 📧 **Share Notes**: Dispatch study notes & PDFs directly to enrolled student emails via Gmail.
- 🎓 **Assessment & Grading**: Evaluate student answer sheets with AI rubrics & manual overrides.
- 📝 **Create & Manage Tests**: Publish official tests and generate secure **Access Codes** for your students.`;

        return res.json({
          reply,
          isUnethical: false,
          suggestedFeatureLink: '/professor/create-test',
          suggestedFeatureLabel: 'Open Test Creator Workspace',
        });
      }
    }

    // ----------------------------------------------------
    // 4. VALID QUERY: COMPREHENSIVE LLM TRAINED SYSTEM PROMPT
    // ----------------------------------------------------
    const systemPrompt = userRole === 'student'
      ? `You are EduCopilot's Student Support Mentor. You are an expert on every feature in the Student Learning Workspace.

YOUR GOAL: Clearly explain, guide, and resolve any doubt about Student features in EduCopilot.

CRITICAL IN-APP CONTEXT RULES:
1. THE USER IS ALREADY LOGGED IN AND ALREADY INSIDE THEIR EDUCOPILOT STUDENT ACCOUNT!
2. NEVER TELL THE USER TO "Log in to your account", "Log in to your EduCopilot account", or "Sign in".
3. ALWAYS START STEP-BY-STEP INSTRUCTIONS DIRECTLY IN-APP: e.g., "Step 1: Click **[Feature Name]** on your left sidebar..." or "Step 1: Go to **[Feature Name]**...".

STRICT ROLE & APP REALITY RULES:
1. You are talking to a STUDENT. Answer ONLY about Student features. Never talk about Professor features (creating question papers, auto-grading, material prep, generating lecture schedules, sharing notes via Gmail). If asked about professor tools, state clearly that it belongs to the Professor Teaching Suite and is not accessible from a Student account.
2. Only discuss actual EduCopilot student features.
3. Be structured, encouraging, and clear. Use Markdown subheadings, bold terms, and numbered step-by-step walkthroughs.

STUDENT FEATURE KNOWLEDGE BASE:
${STUDENT_KNOWLEDGE_BASE}`
      : `You are EduCopilot's Professor Support Mentor. You are an expert on every feature in the Professor Teaching Suite.

YOUR GOAL: Clearly explain, guide, and resolve any doubt about Professor teaching tools in EduCopilot.

CRITICAL IN-APP CONTEXT RULES:
1. THE USER IS ALREADY LOGGED IN AND ALREADY INSIDE THEIR EDUCOPILOT PROFESSOR ACCOUNT!
2. NEVER TELL THE USER TO "Log in to your account", "Log in to your EduCopilot account", "Sign in", or "Log in and navigate to Teaching Suite".
3. ALWAYS START STEP-BY-STEP INSTRUCTIONS DIRECTLY IN-APP: e.g., "Step 1: Click **[Feature Name]** on your left sidebar..." or "Step 1: Go to **[Feature Name]**...".

STRICT ROLE & APP REALITY RULES:
1. You are talking to a PROFESSOR. Answer ONLY about Professor Teaching Suite features. Never talk about Student-only tools (taking student practice tests, personal student study plans).
2. Only discuss actual EduCopilot professor features. EduCopilot does NOT support multi-professor shared account logins due to Strict Account Data Isolation.
3. Be professional, academic, and clear. Use Markdown subheadings, bold terms, and numbered step-by-step walkthroughs.

PROFESSOR FEATURE KNOWLEDGE BASE:
${PROFESSOR_KNOWLEDGE_BASE}`;

    const userPrompt = `User Name: ${userName}
User Role: ${userRole.toUpperCase()}
Student/Professor Doubt Query: "${query}"

Provide an expert, comprehensive, and step-by-step Markdown response answering the user's doubt about EduCopilot features strictly for their role. Start steps directly within the app without telling the user to log in.`;

    let reply = '';
    try {
      const completion = await generateChatCompletion({
        action: 'public_chat',
        userId: req.user?._id || 'guest',
        role: userRole.toUpperCase(),
        payload: {
          query,
          message: query,
          userRole,
          userName,
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      // Unwrap JSON if returned as JSON object or stringified JSON
      let textContent = completion;
      if (typeof completion === 'string') {
        try {
          const parsed = JSON.parse(completion);
          if (parsed && (parsed.answer || parsed.reply || parsed.text || parsed.message)) {
            textContent = parsed.answer || parsed.reply || parsed.text || parsed.message;
          }
        } catch (e) {
          // Raw markdown string, keep as is
        }
      } else if (completion && typeof completion === 'object') {
        textContent = completion.answer || completion.reply || completion.text || completion.message || JSON.stringify(completion);
      }

      reply = textContent;
    } catch (err) {
      console.warn('[SupportAssistant] LLM fallback:', err.message);
      reply = getFallbackSupportReply(queryLower, userRole, userName);
    }

    // ----------------------------------------------------
    // 5. HARDENED POST-PROCESSING ROLE & IN-APP SANITIZER
    // ----------------------------------------------------
    if (userRole === 'student') {
      if (
        reply.includes('As a Professor') ||
        reply.includes('as a professor') ||
        reply.includes('Assessment & Grading') ||
        reply.includes('Material Prep') ||
        reply.includes('Teaching Suite') ||
        reply.includes('Creating a Question Paper')
      ) {
        reply = `### 🔒 Role Access Restriction (Professor Feature)

Hello **${userName}**,

The feature you asked about belongs to the **Professor Teaching Suite** and is **not accessible from a Student account**.

As a **Student**, your account gives you access strictly to the **Student Learning Workspace**:

#### 🎓 Features Available in your Student Workspace:
- 📅 **Generate Study Plan**: Upload syllabus text or PDFs to create a personalized study roadmap.
- 📝 **Practice Tests**: Take adaptive practice quizzes (Easy, Medium, Hard, Adaptive) with real-time feedback.
- 🎓 **Prof Exams**: Access official tests assigned by your professor using your secure **Access Code** and view your released grades.
- 💬 **Ask a Doubt**: Ask syllabus-grounded questions using our RAG AI tutor.
- 📊 **Test History**: Review diagnostic performance and track your weak areas.`;
      }
    }

    // Strip any accidental "Log in to your account" instructions from responses
    reply = reply
      .replace(/Log in to your EduCopilot (Student|Professor)? account and navigate to /gi, 'Go to ')
      .replace(/Log in to your EduCopilot (Student|Professor)? account and /gi, 'Go to ')
      .replace(/Log in to your EduCopilot (Student|Professor)? account\.?/gi, 'Navigate directly within your sidebar.')
      .replace(/Log in to your account and /gi, 'Go to ')
      .replace(/Log in to your account/gi, 'Navigate within your workspace');

    const featureMatch = matchFeatureLink(queryLower, userRole);

    res.json({
      reply,
      isUnethical: false,
      suggestedFeatureLink: featureMatch.link,
      suggestedFeatureLabel: featureMatch.label,
    });
  } catch (error) {
    console.error('[SupportAssistant] Error:', error);
    res.status(500).json({ error: 'Failed to process support request.' });
  }
});

function getFallbackSupportReply(queryLower, userRole, userName) {
  if (userRole === 'student') {
    if (queryLower.includes('study plan') || queryLower.includes('roadmap')) {
      return `### 📅 How to Use Study Plans\n\nHi **${userName}**, you can generate a personalized multi-day study roadmap directly in **Generate Study Plan**:\n\n1. Click **Generate Study Plan** on your left sidebar.\n2. Paste your syllabus text or upload a syllabus PDF.\n3. Choose your daily study hours and target exam date.\n4. Click **Generate Study Roadmap** to create structured daily tasks!\n\nView your progress anytime under **View Study Plans**.`;
    }
    if (queryLower.includes('test') || queryLower.includes('quiz') || queryLower.includes('exam')) {
      return `### 📝 Taking Tests on EduCopilot\n\n- **Practice Tests**: Select **Practice Tests** from your sidebar to take quizzes across Easy, Medium, Hard, or Adaptive difficulty.\n- **Prof Exams**: Select **Prof Exams** from your sidebar and enter the Access Code from your professor.\n- **Test History**: Click **Test History** to track score trends and identify weak areas.`;
    }
    if (queryLower.includes('doubt') || queryLower.includes('rag') || queryLower.includes('ask')) {
      return `### 💬 How to Use Ask a Doubt\n\nHi **${userName}**, you can ask 24/7 syllabus-grounded questions directly in **Ask a Doubt**:\n\n1. Click **Ask a Doubt** on your left sidebar.\n2. Upload notes in **Course Knowledge (RAG)** if you want the tutor to reference your exact course PDFs.\n3. Type your conceptual question to get textbook-grounded answers with formulas and step-by-step explanations!`;
    }
    return `### 🎓 EduCopilot Student Support Mentor\n\nHello **${userName}**! I am here to help you master all features in your **Student Learning Workspace**:\n\n- 📅 **Generate Study Plan**: Multi-day study roadmap generator.\n- 📝 **Practice Tests**: Adaptive diagnostic quizzes with real-time timers.\n- 🎓 **Prof Exams**: Take official tests using Access Codes.\n- 💬 **Ask a Doubt**: 24/7 RAG syllabus AI tutor.\n- 📊 **Test History**: Weak area analytics.\n\nWhich feature can I guide you on?`;
  } else {
    if (queryLower.includes('schedule') || queryLower.includes('timetable') || queryLower.includes('period')) {
      return `### 📅 Generating Lecture Schedules\n\nHi **Prof. ${userName}**, you can generate a slot-by-slot lecture timeline directly in **Generate Schedule**:\n\n1. Click **Generate Schedule** on your left sidebar.\n2. Upload your syllabus PDF or select a course document from Knowledge Base.\n3. Set your **Number of Periods** and **Minutes Per Period**.\n4. Click **Generate & Store Slot-by-Slot Plan** to compute prerequisite order!\n\nView saved schedules anytime under **View Lecture Schedules**.`;
    }
    if (queryLower.includes('notes') || queryLower.includes('gmail') || queryLower.includes('share')) {
      return `### 📧 Sharing Notes via Gmail\n\n1. Click **Share Notes** on your left sidebar.\n2. Enter your note title and content.\n3. Type recipient student emails or upload an Excel student roster (.xlsx / .csv).\n4. Attach optional PDF notes and click **Dispatch Notes via Gmail**!\n\nDelivery status logs will confirm your dispatch.`;
    }
    if (queryLower.includes('prep') || queryLower.includes('slide') || queryLower.includes('lecture notes')) {
      return `### 📝 Material Preparation Suite\n\n1. Click **Material Prep** on your left sidebar.\n2. Select your course topic.\n3. Choose output type: **Slide Deck Outlines** (with speaker notes), **Lecture Notes** (800-1200+ word textbook content), or **Practice Question Banks**.`;
    }
    if (queryLower.includes('grade') || queryLower.includes('rubric') || queryLower.includes('mark')) {
      return `### 🎓 Assessment & Auto-Grading\n\n1. Click **Assessment & Grading** on your left sidebar.\n2. Select a submitted student answer sheet.\n3. Click **Evaluate with AI Rubric** to calculate scores, generate itemized feedback, and apply manual grade overrides.`;
    }
    return `### 🏛️ EduCopilot Professor Support Mentor\n\nHello **Prof. ${userName}**! I am here to assist your teaching workflow across all features in your **Professor Teaching Suite**:\n\n- 📚 **Course Materials (RAG)**: Knowledge base upload.\n- 🗓️ **Generate Schedule**: Prerequisite slot sequencer.\n- 📝 **Material Prep**: Auto-draft slides, notes & practice questions.\n- 📧 **Share Notes**: Send PDF study notes via Gmail.\n- 🎓 **Assessment & Grading**: AI rubric auto-grading.\n- 📝 **Create & Manage Tests**: Scoped test creator with Access Codes.\n\nWhich feature would you like me to clarify today?`;
  }
}

function matchFeatureLink(queryLower, userRole) {
  if (userRole === 'student') {
    if (queryLower.includes('plan') || queryLower.includes('roadmap')) {
      return { link: '/student/study-plans/generate', label: 'Open Study Plan Generator' };
    }
    if (queryLower.includes('quiz') || queryLower.includes('practice')) {
      return { link: '/student/practice-tests', label: 'Open Practice Tests' };
    }
    if (queryLower.includes('prof exam') || queryLower.includes('access code')) {
      return { link: '/student/prof-exams', label: 'Open Prof Exams Workspace' };
    }
    if (queryLower.includes('doubt') || queryLower.includes('ask') || queryLower.includes('question')) {
      return { link: '/student/doubt-chat', label: 'Open Ask a Doubt' };
    }
    if (queryLower.includes('history') || queryLower.includes('weak') || queryLower.includes('score') || queryLower.includes('grade')) {
      return { link: '/student/test-history', label: 'Open Test History Analytics' };
    }
    return { link: '/student/dashboard', label: 'Go to Student Dashboard' };
  } else {
    if (queryLower.includes('schedule') || queryLower.includes('sequence')) {
      return { link: '/professor/scheduling/generate', label: 'Open Schedule Generator' };
    }
    if (queryLower.includes('slide') || queryLower.includes('note') || queryLower.includes('prep')) {
      return { link: '/professor/material-prep', label: 'Open Material Preparation' };
    }
    if (queryLower.includes('share') || queryLower.includes('gmail') || queryLower.includes('email')) {
      return { link: '/professor/share-notes', label: 'Open Share Notes' };
    }
    if (queryLower.includes('grade') || queryLower.includes('rubric') || queryLower.includes('mark')) {
      return { link: '/professor/grading', label: 'Open Assessment & Grading' };
    }
    if (queryLower.includes('create test') || queryLower.includes('access code')) {
      return { link: '/professor/create-test', label: 'Open Test Creator' };
    }
    return { link: '/professor/dashboard', label: 'Go to Professor Dashboard' };
  }
}

module.exports = router;
