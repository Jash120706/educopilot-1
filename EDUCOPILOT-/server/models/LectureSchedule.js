const mongoose = require('mongoose');

const lectureScheduleSchema = new mongoose.Schema(
  {
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      default: '09:00 AM',
      trim: true,
    },
    classOrSection: {
      type: String,
      default: 'Section A',
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    topics: {
      type: [String],
      default: [],
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    aiSequencingNotes: {
      type: String,
      default: '',
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Draft'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LectureSchedule', lectureScheduleSchema);
