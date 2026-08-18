const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  questionType: {
    type: String,
    enum: ['MCQ', 'TrueFalse', 'FillBlank', 'ShortAnswer', 'Descriptive'],
    default: 'MCQ',
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    default: [],
  },
  correctAnswerIndex: {
    type: Number,
    default: 0,
  },
  correctTextAnswer: {
    type: String,
    default: '',
  },
  userSelectedOption: {
    type: Number,
    default: null,
  },
  userTextAnswer: {
    type: String,
    default: '',
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 1,
  },
  awardedPoints: {
    type: Number,
    default: 0,
  },
  explanation: {
    type: String,
    default: '',
  },
  rubricFeedback: {
    type: String,
    default: '',
  },
  topicTag: {
    type: String,
    default: '',
  },
});

const testAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Adaptive'],
      default: 'Medium',
    },
    questionTypeFilter: {
      type: String,
      default: 'Mixed',
    },
    sourceMaterialTitle: {
      type: String,
      default: '',
    },
    questions: [questionSchema],
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalMaxPoints: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    weakAreas: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    recommendedRevisionTopics: {
      type: [String],
      default: [],
    },
    aiDiagnosticFeedback: {
      type: String,
      default: '',
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      index: true,
    },
    isReleased: {
      type: Boolean,
      default: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    professorName: {
      type: String,
      default: '',
      trim: true,
    },
    courseId: {
      type: String,
      default: '',
      trim: true,
    },
    sessionId: {
      type: String,
      default: '',
    },
    isSubmitted: {
      type: Boolean,
      default: true,
    },
    violationCount: {
      type: Number,
      default: 0,
    },
    violations: [
      {
        violationType: { type: String, default: 'FullscreenExit' },
        timestamp: { type: Date, default: Date.now },
        actionTaken: { type: String, default: 'Warning' },
      },
    ],
    submitReason: {
      type: String,
      enum: ['ManualSubmit', 'ViolationAutoSubmit', 'TimeExpired', 'ProfessorEnded'],
      default: 'ManualSubmit',
    },
  },
  { timestamps: true }
);

testAttemptSchema.index({ userId: 1, testId: 1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
