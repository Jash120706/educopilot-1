const mongoose = require('mongoose');

const courseDocChunkSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    docTitle: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true,
    },
    department: {
      type: String,
      default: 'CSE',
      trim: true,
      uppercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['syllabus', 'content', 'notes', 'other'],
      default: 'content',
      index: true,
    },
    courseCode: {
      type: String,
      default: '',
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    chunkText: {
      type: String,
      required: true,
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
    keywords: {
      type: [String],
      default: [],
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

courseDocChunkSchema.index({ uploadedBy: 1, subject: 1 });
courseDocChunkSchema.index({ uploadedBy: 1, subjectCode: 1 });
courseDocChunkSchema.index({ department: 1, subjectCode: 1 });
courseDocChunkSchema.index({ uploadedBy: 1, docTitle: 1 });

module.exports = mongoose.model('CourseDocChunk', courseDocChunkSchema);
