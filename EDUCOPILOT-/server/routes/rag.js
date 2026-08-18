const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const CourseDocChunk = require('../models/CourseDocChunk');
const { ingestDocument } = require('../services/ragService');

// Multer memory storage for uploaded documents/PDFs
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// @route   POST /api/rag/upload
// @desc    Upload & ingest course syllabus, textbook, or student notes into RAG vector chunks
// @access  Protected (Student & Professor)
router.post(
  '/upload',
  protect,
  upload.single('file'),
  async (req, res) => {
    try {
      const {
        docTitle,
        subject,
        subjectCode,
        department = 'CSE',
        type = 'content',
        courseCode,
        rawText,
      } = req.body;

      if (!docTitle || !subject) {
        return res.status(400).json({ error: 'Document title and subject are required.' });
      }

      let fileBuffer = null;
      let textToIngest = rawText || '';

      if (req.file) {
        fileBuffer = req.file.buffer;
      }

      if (!fileBuffer && (!textToIngest || textToIngest.trim().length < 20)) {
        return res
          .status(400)
          .json({ error: 'Please upload a PDF file or provide course text (min 20 characters).' });
      }

      const result = await ingestDocument({
        uploadedBy: req.user._id,
        docTitle,
        subject,
        subjectCode: subjectCode || courseCode || '',
        department: department || 'CSE',
        type: type || 'content',
        courseCode: subjectCode || courseCode || '',
        rawText: textToIngest,
        fileBuffer,
      });

      res.status(201).json({
        message: `Successfully indexed "${docTitle}" into ${result.totalChunks} RAG chunks.`,
        ...result,
      });
    } catch (error) {
      console.error('[RAGUpload] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to ingest course document.' });
    }
  }
);

// @route   GET /api/rag/documents
// @desc    List distinct documents indexed in this user's isolated RAG vault
// @access  Protected (Student & Professor)
router.get('/documents', protect, async (req, res) => {
  try {
    const { subject, subjectCode, department } = req.query;
    // Strict isolation: users only see documents in their own vault
    const filter = { uploadedBy: req.user._id };
    if (subject && subject !== 'All') {
      filter.subject = subject;
    }
    if (subjectCode && subjectCode !== 'All') {
      filter.subjectCode = { $regex: new RegExp(`^${subjectCode.trim()}$`, 'i') };
    }
    if (department && department !== 'All') {
      filter.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
    }

    const chunks = await CourseDocChunk.find(filter)
      .select('docTitle subject subjectCode department type courseCode tokenCount createdAt chunkIndex')
      .sort({ createdAt: -1 });

    // Group by docTitle
    const docMap = {};
    chunks.forEach((c) => {
      const key = `${c.subject}:::${c.docTitle}`;
      if (!docMap[key]) {
        docMap[key] = {
          docTitle: c.docTitle,
          subject: c.subject,
          subjectCode: c.subjectCode || c.courseCode || '',
          department: c.department || 'CSE',
          type: c.type || 'content',
          courseCode: c.subjectCode || c.courseCode || '',
          chunkCount: 0,
          totalTokens: 0,
          createdAt: c.createdAt,
        };
      }
      docMap[key].chunkCount += 1;
      docMap[key].totalTokens += c.tokenCount || 0;
    });

    res.json(Object.values(docMap));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

// @route   DELETE /api/rag/documents/:docTitle
// @desc    Delete an indexed document from user's vault
// @access  Protected (Student & Professor)
router.delete('/documents/:docTitle', protect, async (req, res) => {
  try {
    const { subject } = req.query;
    // Strict per-user scoping
    const filter = {
      docTitle: req.params.docTitle,
      uploadedBy: req.user._id,
    };
    if (subject) filter.subject = subject;

    const result = await CourseDocChunk.deleteMany(filter);
    res.json({ message: `Deleted ${result.deletedCount} chunks for "${req.params.docTitle}".` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
