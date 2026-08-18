const mongoose = require('mongoose');

const citedSourceSchema = new mongoose.Schema({
  docTitle: String,
  subject: String,
  chunkExcerpt: String,
  relevanceScore: Number,
});

const doubtSchema = new mongoose.Schema(
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
    query: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    citedSources: [citedSourceSchema],
    keyTakeaways: [String],
    suggestedFollowUps: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doubt', doubtSchema);
