const mongoose = require('mongoose');

const rubricGradingItemSchema = new mongoose.Schema({
  questionNumber: Number,
  questionType: {
    type: String,
    enum: ['MCQ', 'TrueFalse', 'FillBlank', 'ShortAnswer', 'Descriptive'],
    default: 'ShortAnswer',
  },
  question: String,
  studentAnswer: String,
  referenceAnswer: String,
  maxPoints: Number,
  awardedPoints: Number,
  originalAwardedPoints: Number,
  isOverridden: {
    type: Boolean,
    default: false,
  },
  rubricCriterion: String,
  evaluatorNotes: String,
  improvementTip: String,
});

const gradedSubmissionSchema = new mongoose.Schema(
  {
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    assignmentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    questionPaperText: {
      type: String,
      default: '',
    },
    submissionText: {
      type: String,
      default: '',
    },
    sourceExtractionMethod: {
      type: String,
      default: 'OnlineSubmission',
    },
    gradedItems: [rubricGradingItemSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    overallGrade: {
      type: String,
      default: '',
    },
    individualizedFeedback: {
      type: String,
      default: '',
    },
    keyStrengths: [String],
    areasForGrowth: [String],
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      index: true,
    },
    testAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestAttempt',
      index: true,
    },
    isReleased: {
      type: Boolean,
      default: false,
    },
    gradedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GradedSubmission', gradedSubmissionSchema);
