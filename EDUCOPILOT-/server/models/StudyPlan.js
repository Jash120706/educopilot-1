const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
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
    targetExamDate: {
      type: String,
      default: '',
    },
    syllabusRef: {
      type: String,
      default: '',
    },
    durationDays: {
      type: Number,
      default: 7,
    },
    planDays: [
      {
        day: Number,
        title: String,
        focus: String,
        subject: String,
        priority: {
          type: String,
          enum: ['High', 'Medium', 'Low'],
          default: 'High',
        },
        scheduledDate: {
          type: String,
          default: '',
        },
        recommendedStudyMinutes: {
          type: Number,
          default: 90,
        },
        tasks: [String],
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    topicSummary: {
      type: String,
      default: '',
    },
    revisionNotes: {
      type: String,
      default: '',
    },
    progressPercent: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
