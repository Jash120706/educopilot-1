const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';
const INTERNAL_AI_SERVICE_TOKEN = process.env.INTERNAL_AI_SERVICE_TOKEN || 'educopilot_internal_ai_secret_token_2026';

/**
 * HTTP Client to send AI Orchestration requests to Python FastAPI microservice.
 */
const orchestrateAiRequest = async ({
  userId,
  role,
  action,
  payload = {},
  userPrompt = '',
  requestId = '',
}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${PYTHON_AI_SERVICE_URL}/internal/ai/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_AI_SERVICE_TOKEN,
      },
      body: JSON.stringify({
        user_id: String(userId),
        role: String(role).toUpperCase(),
        action: String(action),
        payload,
        user_prompt: userPrompt,
        request_id: requestId || `req_${Date.now()}`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.success === true) {
        return {
          success: true,
          data: data.data,
          agentUsed: data.agent_used,
        };
      }
      return {
        success: false,
        error: data?.error || {
          code: 'AI_EXECUTION_REJECTED',
          message: 'AI request was rejected by security guardrails.',
        },
      };
    }

    const errData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errData.error || {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'AI service is temporarily unavailable.',
      },
    };
  } catch (error) {
    console.error('[PythonAiService] Error communicating with Python microservice:', error.message);
    return {
      success: false,
      error: {
        code: 'AI_SERVICE_UNAVAILABLE',
        message: 'AI service is temporarily unavailable.',
        detail: error.message,
      },
    };
  }
};

/**
 * Send course document to Python AI microservice for dense vector chunking and indexing.
 */
const ingestDocumentToPythonVectorDb = async ({
  userId,
  role = 'PROFESSOR',
  docTitle,
  rawText,
  subject = 'General',
  subjectCode = '',
  department = 'CSE',
  documentType = 'content',
  ragCollection = 'course_content_rag',
}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${PYTHON_AI_SERVICE_URL}/internal/ai/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_AI_SERVICE_TOKEN,
      },
      body: JSON.stringify({
        user_id: String(userId),
        role: String(role).toUpperCase(),
        doc_title: docTitle,
        raw_text: rawText,
        subject,
        subject_code: subjectCode,
        department,
        document_type: documentType,
        rag_collection: ragCollection,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    console.error('[PythonAiService] Vector ingestion error:', error.message);
    return {
      success: false,
      error: {
        code: 'VECTOR_INGESTION_UNAVAILABLE',
        message: 'AI document ingestion service is temporarily unavailable.',
      },
    };
  }
};

/**
 * Execute vector similarity RAG search via Python AI microservice.
 */
const retrieveVectorContextFromPython = async ({
  userId,
  role,
  query,
  ragCollection = 'course_content_rag',
  subjectCode = null,
  department = null,
  topK = 4,
}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${PYTHON_AI_SERVICE_URL}/internal/ai/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_AI_SERVICE_TOKEN,
      },
      body: JSON.stringify({
        user_id: String(userId),
        role: String(role).toUpperCase(),
        query,
        rag_collection: ragCollection,
        subject_code: subjectCode,
        department,
        top_k: topK,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    console.error('[PythonAiService] Vector retrieval error:', error.message);
    return {
      success: false,
      error: {
        code: 'VECTOR_RETRIEVAL_UNAVAILABLE',
        message: 'AI vector search service is temporarily unavailable.',
      },
    };
  }
};

module.exports = {
  orchestrateAiRequest,
  ingestDocumentToPythonVectorDb,
  retrieveVectorContextFromPython,
};
