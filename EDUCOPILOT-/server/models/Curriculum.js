const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    year: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectCodes: {
      type: [String],
      default: [],
    },
    subjects: [
      {
        subjectCode: { type: String, required: true },
        title: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index for department + year + semester
curriculumSchema.index({ department: 1, year: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Curriculum', curriculumSchema);
