const CourseDocChunk = require('../models/CourseDocChunk');
const { chunkText, extractKeywords, calculateSimilarity } = require('./embeddingService');
const { ingestDocumentToPythonVectorDb, retrieveVectorContextFromPython } = require('./pythonAiService');
const pdfParse = require('pdf-parse');

/**
 * Ingest document content into MongoDB and Python Dense Vector Store
 */
const ingestDocument = async ({
  uploadedBy,
  docTitle,
  subject,
  subjectCode = '',
  department = 'CSE',
  type = 'content',
  courseCode = '',
  rawText = '',
  fileBuffer = null,
  role = 'PROFESSOR',
}) => {
  let fullText = rawText;

  if (fileBuffer) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData && pdfData.text && pdfData.text.trim().length >= 10) {
        fullText = pdfData.text;
      } else {
        const rawStr = fileBuffer.toString('utf-8');
        const matches = rawStr.match(/[\x20-\x7E\r\n]{4,}/g);
        fullText = matches ? matches.join(' ') : rawStr;
      }
    } catch (err) {
      console.warn('[RAG] PDF parse note, falling back to text stream decode:', err.message);
      const rawStr = fileBuffer.toString('utf-8');
      const matches = rawStr.match(/[\x20-\x7E\r\n]{4,}/g);
      fullText = matches ? matches.join(' ') : rawStr;
    }
  }

  if (fullText) {
    fullText = fullText.replace(/\x00/g, '').replace(/\r\n/g, '\n').trim();
  }

  if (!fullText || fullText.length < 10) {
    throw new Error('Document content could not be extracted or is too short to index. Please ensure document contains readable text.');
  }

  const normalizedSubjectCode = (subjectCode || courseCode || '').toUpperCase().trim();
  const normalizedDepartment = (department || 'CSE').toUpperCase().trim();
  const normalizedType = ['syllabus', 'content', 'notes', 'other'].includes(type) ? type : 'content';

  // Delete previous MongoDB chunks
  await CourseDocChunk.deleteMany({ docTitle, subject, uploadedBy });

  const rawChunks = chunkText(fullText, 1200, 200);
  const docsToInsert = rawChunks.map((chunk, index) => ({
    uploadedBy,
    docTitle,
    subject,
    subjectCode: normalizedSubjectCode,
    department: normalizedDepartment,
    type: normalizedType,
    courseCode: normalizedSubjectCode || courseCode,
    chunkIndex: index + 1,
    chunkText: chunk.text,
    tokenCount: chunk.tokenCount,
    keywords: chunk.keywords,
  }));

  const inserted = await CourseDocChunk.insertMany(docsToInsert);

  // Sync to Python Dense Vector DB
  const ragColl = type === 'syllabus' ? 'syllabus_rag' : 'course_content_rag';
  try {
    await ingestDocumentToPythonVectorDb({
      userId: uploadedBy,
      role,
      docTitle,
      rawText: fullText,
      subject,
      subjectCode: normalizedSubjectCode,
      department: normalizedDepartment,
      documentType: normalizedType,
      ragCollection: ragColl,
    });
  } catch (pyErr) {
    console.warn('[RAG] Python vector store sync note:', pyErr.message);
  }

  return {
    totalChunks: inserted.length,
    docTitle,
    subject,
    subjectCode: normalizedSubjectCode,
    department: normalizedDepartment,
    type: normalizedType,
  };
};

/**
 * Retrieve top-k relevant course chunks via Python Vector Retrieval with MongoDB fallback
 */
const retrieveRelevantChunks = async ({
  subjectCode = null,
  department = null,
  type = null,
  subject = null,
  query,
  topK = 4,
  userId = null,
  docTitle = null,
  role = 'STUDENT',
  ragCollection = 'course_content_rag',
}) => {
  // Query Python Dense Vector Store
  try {
    const pyRes = await retrieveVectorContextFromPython({
      userId: userId || 'anonymous',
      role,
      query,
      ragCollection,
      subjectCode,
      department,
      topK,
    });

    if (pyRes.success && pyRes.data && pyRes.data.chunks && pyRes.data.chunks.length > 0) {
      return pyRes.data.chunks.map((c) => ({
        docTitle: c.doc_title,
        subject: c.subject,
        subjectCode: c.subject_code,
        department: c.department,
        type: c.document_type || 'content',
        chunkIndex: c.chunk_index,
        chunkText: c.chunk_text,
        relevanceScore: c.relevance_score,
      }));
    }
  } catch (err) {
    console.warn('[RAGService] Python vector retrieval note:', err.message);
  }

  // MongoDB Keyword TF-IDF Fallback
  const filter = {};
  if (userId) filter.uploadedBy = userId;
  if (subjectCode && subjectCode !== 'All') {
    filter.subjectCode = { $regex: new RegExp(`^${subjectCode.trim()}$`, 'i') };
  }
  if (department && department !== 'All') {
    filter.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
  }
  if (type && type !== 'All') filter.type = type;
  if (docTitle && docTitle !== 'All') {
    filter.docTitle = { $regex: new RegExp(`^${docTitle.trim()}$`, 'i') };
  }
  if (subject && subject !== 'All') {
    filter.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
  }

  let chunks = await CourseDocChunk.find(filter).lean();
  if (!chunks || chunks.length === 0) {
    chunks = await CourseDocChunk.find({}).limit(40).lean();
  }

  if (!chunks || chunks.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const similarity = calculateSimilarity(query, chunk.chunkText, chunk.keywords || []);
    return {
      docTitle: chunk.docTitle,
      subject: chunk.subject,
      subjectCode: chunk.subjectCode || chunk.courseCode || '',
      department: chunk.department || 'CSE',
      type: chunk.type || 'content',
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      relevanceScore: parseFloat(similarity.toFixed(3)),
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, topK);
};

/**
 * Format grounded context string
 */
const formatGroundedContext = (retrievedChunks) => {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return 'No specific uploaded course document chunks found for this subject. Ground responses using standard academic domain principles.';
  }

  return retrievedChunks
    .map(
      (c, i) =>
        `[Source Document ${i + 1}: "${c.docTitle}" | Code: ${c.subjectCode || 'N/A'} | Dept: ${c.department || 'CSE'} | Score: ${c.relevanceScore}]\n${c.chunkText}`
    )
    .join('\n\n---\n\n');
};

module.exports = {
  ingestDocument,
  retrieveRelevantChunks,
  formatGroundedContext,
};
