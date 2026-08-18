const mongoose = require('mongoose');

const lecturePlanSchema = new mongoose.Schema(
  {
    professorId: {
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
    courseCode: {
      type: String,
      default: 'ENV-401',
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    syllabus: {
      type: String,
      default: '',
    },
    numPeriods: {
      type: Number,
      default: 5,
    },
    minutesPerPeriod: {
      type: Number,
      default: 60,
    },
    deadline: {
      type: String,
      default: '',
    },
    plan: [
      {
        period: Number,
        type: {
          type: String,
          default: 'lecture',
        },
        topic: String,
        subtopics: [String],
        prerequisites: [String],
        date: String,
        time: String,
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    at_risk_topics: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Archived'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LecturePlan', lecturePlanSchema);
