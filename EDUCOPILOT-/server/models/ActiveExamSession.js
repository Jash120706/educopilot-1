const mongoose = require('mongoose');

const activeExamSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },
    violationCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

activeExamSessionSchema.index({ userId: 1, testId: 1 });

module.exports = mongoose.model('ActiveExamSession', activeExamSessionSchema);
