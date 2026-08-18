const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
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
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['slides', 'notes', 'assignment', 'practice_questions', 'quiz', 'question_bank'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed, // structured JSON or markdown text
      required: true,
    },
    syllabusRef: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
