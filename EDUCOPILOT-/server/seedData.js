const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const CourseDocChunk = require('./models/CourseDocChunk');
const StudyPlan = require('./models/StudyPlan');
const TestAttempt = require('./models/TestAttempt');
const LectureSchedule = require('./models/LectureSchedule');
const Material = require('./models/Material');
const Curriculum = require('./models/Curriculum');
const Test = require('./models/Test');
const { ingestDocument } = require('./services/ragService');

dotenv.config();

const seedDatabase = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/educopilot';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seeder] Connected to MongoDB');

    // 0. Seed Curriculum Collection
    await Curriculum.deleteMany({});
    const curriculumData = [
      {
        department: 'CSE',
        year: '1st',
        semester: '1',
        subjectCodes: ['CS101', 'MA101', 'PH101'],
        subjects: [
          { subjectCode: 'CS101', title: 'Introduction to Programming' },
          { subjectCode: 'MA101', title: 'Calculus & Linear Algebra' },
          { subjectCode: 'PH101', title: 'Engineering Physics' },
        ],
      },
      {
        department: 'CSE',
        year: '1st',
        semester: '2',
        subjectCodes: ['CS102', 'CS103', 'MA102'],
        subjects: [
          { subjectCode: 'CS102', title: 'Object Oriented Programming' },
          { subjectCode: 'CS103', title: 'Digital Logic Design' },
          { subjectCode: 'MA102', title: 'Differential Equations' },
        ],
      },
      {
        department: 'CSE',
        year: '2nd',
        semester: '3',
        subjectCodes: ['CS201', 'CS202', 'CS203'],
        subjects: [
          { subjectCode: 'CS201', title: 'Data Structures & Algorithms' },
          { subjectCode: 'CS202', title: 'Discrete Mathematics' },
          { subjectCode: 'CS203', title: 'Computer Organization' },
        ],
      },
      {
        department: 'CSE',
        year: '2nd',
        semester: '4',
        subjectCodes: ['CS204', 'CS205', 'CS206'],
        subjects: [
          { subjectCode: 'CS204', title: 'Database Management Systems' },
          { subjectCode: 'CS205', title: 'Theory of Computation' },
          { subjectCode: 'CS206', title: 'Software Engineering' },
        ],
      },
      {
        department: 'CSE',
        year: '3rd',
        semester: '5',
        subjectCodes: ['CS301', 'CS302', 'CS303'],
        subjects: [
          { subjectCode: 'CS301', title: 'Distributed Systems & Operating Systems' },
          { subjectCode: 'CS302', title: 'Computer Networks' },
          { subjectCode: 'CS303', title: 'Compiler Design' },
        ],
      },
      {
        department: 'CSE',
        year: '3rd',
        semester: '6',
        subjectCodes: ['CS304', 'CS305', 'CS306'],
        subjects: [
          { subjectCode: 'CS304', title: 'Artificial Intelligence & GenAI' },
          { subjectCode: 'CS305', title: 'Cryptography & Security' },
          { subjectCode: 'CS306', title: 'Web Frameworks' },
        ],
      },
      {
        department: 'ECE',
        year: '2nd',
        semester: '3',
        subjectCodes: ['EC201', 'EC202'],
        subjects: [
          { subjectCode: 'EC201', title: 'Signals & Systems' },
          { subjectCode: 'EC202', title: 'Analog Circuits' },
        ],
      },
    ];

    await Curriculum.insertMany(curriculumData);
    console.log('[Seeder] Seeded Curriculum collection');

    // 1. Create or ensure Demo Professor (Prof. Marcus Vance)
    let prof = await User.findOne({ email: 'vance@professor.edu' });
    if (!prof) {
      prof = await User.create({
        name: 'Prof. Marcus Vance',
        email: 'vance@professor.edu',
        password: 'password123',
        role: 'professor',
        department: 'CSE',
        gradeOrClass: 'Department of Computer Science',
        subjects: ['CS301', 'CS201', 'Computer Science'],
      });
      console.log('[Seeder] Created Professor Prof. Marcus Vance');
    } else {
      prof.department = 'CSE';
      await prof.save();
    }

    // 2. Create or update Demo Student 1 (Alex Rivera: CSE, 3rd Year, Sem 5)
    let student1 = await User.findOne({ email: 'alex@student.edu' });
    if (!student1) {
      student1 = await User.create({
        name: 'Alex Rivera',
        email: 'alex@student.edu',
        password: 'password123',
        role: 'student',
        department: 'CSE',
        year: '3rd',
        semester: '5',
        enrolledSubjects: ['CS301', 'CS302', 'CS303'],
        gradeOrClass: 'CSE - 3rd Year',
        subjects: ['CS301', 'CS302', 'CS303'],
      });
      console.log('[Seeder] Created Student Alex Rivera');
    } else {
      student1.department = 'CSE';
      student1.year = '3rd';
      student1.semester = '5';
      student1.enrolledSubjects = ['CS301', 'CS302', 'CS303'];
      await student1.save();
    }

    // 3. Create or update Demo Student 2 (Sophia Chen: CSE, 2nd Year, Sem 3)
    let student2 = await User.findOne({ email: 'sophia@student.edu' });
    if (!student2) {
      student2 = await User.create({
        name: 'Sophia Chen',
        email: 'sophia@student.edu',
        password: 'password123',
        role: 'student',
        department: 'CSE',
        year: '2nd',
        semester: '3',
        enrolledSubjects: ['CS201', 'CS202', 'CS203'],
        gradeOrClass: 'CSE - 2nd Year',
        subjects: ['CS201', 'CS202', 'CS203'],
      });
      console.log('[Seeder] Created Student Sophia Chen');
    } else {
      student2.department = 'CSE';
      student2.year = '2nd';
      student2.semester = '3';
      student2.enrolledSubjects = ['CS201', 'CS202', 'CS203'];
      await student2.save();
    }

    // 4. Ingest Separate Isolated RAG Documents for each persona
    const professorSyllabus = `COURSE: CS301 Distributed Systems & Operating Systems
PROFESSOR: Prof. Marcus Vance

CHAPTER 1: Fundamental Distributed Systems Theory
- The CAP Theorem: Formulated by Eric Brewer. In an asynchronous network with arbitrary partition faults (P), a distributed data system cannot simultaneously guarantee Linearizable Consistency (C) and High Availability (A).
- Linearizability provides real-time recency guarantee: once a write finishes, all subsequent reads must observe it.
- Eventual Consistency allows replicas to diverge temporarily, converging once updates propagate.

CHAPTER 2: Consensus Protocols & Fault Tolerance
- The Raft Consensus Algorithm: Designed for understandability. Elects a single leader via randomized election timeouts (150-300ms). Follower nodes increment currentTerm and cast votes via RequestVote RPCs.
- Log Invariants: If two entries in different logs have identical index and term, they store the same command and their logs are identical in all preceding entries.
- Paxos vs Raft: Paxos utilizes independent proposal sequence numbers with dual phases (Prepare-Promise, Accept-Accepted).`;

    await ingestDocument({
      uploadedBy: prof._id,
      docTitle: 'CS301 Master Course Textbook & Syllabus',
      subject: 'Distributed Systems',
      subjectCode: 'CS301',
      department: 'CSE',
      type: 'syllabus',
      rawText: professorSyllabus,
    });
    console.log('[Seeder] Ingested isolated syllabus into Prof. Marcus Vance RAG Vault');

    // 5. Seed Professor-created Tests (for Option A & Option B testing)
    await Test.deleteMany({});

    // Test 1: Open Test for 3rd Year CSE (CS301) — No Access Code
    await Test.create({
      title: 'CS301 Midterm Quiz — Distributed Consensus & CAP Theorem',
      topic: 'Raft & CAP Theorem',
      department: 'CSE',
      year: '3rd',
      semester: '5',
      subjectCode: 'CS301',
      subject: 'Distributed Systems',
      createdBy: prof._id,
      durationMinutes: 15,
      difficulty: 'Medium',
      accessCode: '', // No code required
      isPublished: true,
      questions: [
        {
          questionType: 'MCQ',
          question: 'Which property guarantees that once a write completes, all subsequent reads observe the value?',
          options: ['Eventual Consistency', 'Linearizability', 'Causal Consistency', 'Read Uncommitted'],
          correctAnswerIndex: 1,
          correctTextAnswer: 'Linearizability',
          points: 2,
          explanation: 'Linearizability provides strong real-time recency guarantees.',
          topicTag: 'CAP Theorem',
        },
        {
          questionType: 'MCQ',
          question: 'In the Raft consensus algorithm, what is the purpose of randomized election timeouts (150-300ms)?',
          options: [
            'To accelerate log replication',
            'To prevent split-vote scenarios during leader election',
            'To compress log entries',
            'To encrypt RPC packets',
          ],
          correctAnswerIndex: 1,
          correctTextAnswer: 'To prevent split-vote scenarios during leader election',
          points: 2,
          explanation: 'Randomized timers stagger candidate elections so one node collects majority votes.',
          topicTag: 'Raft Protocol',
        },
        {
          questionType: 'TrueFalse',
          question: 'Under the CAP theorem, a distributed system under network partition can provide both 100% Availability and Linearizable Consistency.',
          options: ['True', 'False'],
          correctAnswerIndex: 1,
          correctTextAnswer: 'False',
          points: 2,
          explanation: 'CAP theorem proves CP or AP trade-off under partition P.',
          topicTag: 'CAP Theorem',
        },
      ],
    });

    // Test 2: Protected Test for 3rd Year CSE (CS301) — Requires Access Code "RAFT2026"
    await Test.create({
      title: 'CS301 Honors Examination — Advanced Raft Safety & Paxos',
      topic: 'Advanced Distributed Protocols',
      department: 'CSE',
      year: '3rd',
      semester: '5',
      subjectCode: 'CS301',
      subject: 'Distributed Systems',
      createdBy: prof._id,
      durationMinutes: 20,
      difficulty: 'Hard',
      accessCode: 'RAFT2026', // Option B Access Code required
      isPublished: true,
      questions: [
        {
          questionType: 'MCQ',
          question: 'What invariant ensures a Raft leader never overwrites log entries in its own log?',
          options: ['Leader Append-Only Invariant', 'Log Matching Invariant', 'State Machine Safety', 'Election Safety'],
          correctAnswerIndex: 0,
          correctTextAnswer: 'Leader Append-Only Invariant',
          points: 3,
          explanation: 'A Raft leader only appends to its log and never overwrites existing entries.',
          topicTag: 'Raft Safety',
        },
        {
          questionType: 'ShortAnswer',
          question: 'Explain how Paxos dual-phase prepare/promise phase guarantees consensus correctness.',
          options: [],
          correctAnswerIndex: 0,
          correctTextAnswer: 'Prepare phase reserves proposal number; promise phase returns highest numbered proposal accepted.',
          points: 4,
          explanation: 'Prevents conflicting proposals from overriding committed values.',
          topicTag: 'Paxos',
        },
      ],
    });

    // Test 3: Test for 2nd Year CSE (CS201) — Requires Access Code "DS100" (Matched for Sophia Chen)
    await Test.create({
      title: 'CS201 Data Structures & Algorithms Benchmark Test',
      topic: 'Trees & Graph Traversal',
      department: 'CSE',
      year: '2nd',
      semester: '3',
      subjectCode: 'CS201',
      subject: 'Data Structures & Algorithms',
      createdBy: prof._id,
      durationMinutes: 15,
      difficulty: 'Medium',
      accessCode: 'DS100', // Option B Access Code required
      isPublished: true,
      questions: [
        {
          questionType: 'MCQ',
          question: 'What is the worst-case time complexity of inserting into an unbalanced Binary Search Tree?',
          options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
          correctAnswerIndex: 2,
          correctTextAnswer: 'O(N)',
          points: 2,
          explanation: 'In the worst case, an unbalanced BST degenerates into a linked list of depth N.',
          topicTag: 'BST',
        },
      ],
    });

    console.log('[Seeder] Seeded sample Scoped Tests with Option A & Option B gating');

    console.log('[Seeder] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error.message);
    process.exit(0);
  }
};

seedDatabase();
