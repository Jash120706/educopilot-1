const { orchestrateAiRequest } = require('./pythonAiService');

/**
 * Unified Express -> Python AI Microservice bridge.
 * Executes requests through Python FastAPI LangGraph Orchestrator & Guardrails.
 * Returns structured errors on AI service failure without fake mock fallbacks.
 */
const generateChatCompletion = async ({
  messages,
  temperature = 0.5,
  max_tokens = 2048,
  response_format = null,
  role = 'STUDENT',
  userId = 'system_user',
  action = null,
  payload = {},
}) => {
  const lastUserMsg = messages && messages.length > 0
    ? messages[messages.length - 1].content
    : '';

  // Intelligently infer action if caller did not explicitly specify
  let targetAction = action;
  if (!targetAction) {
    const textLower = (lastUserMsg + ' ' + JSON.stringify(payload)).toLowerCase();
    if (textLower.includes('study plan') || textLower.includes('roadmap') || textLower.includes('plandays')) {
      targetAction = 'generate_study_plan';
    } else if (textLower.includes('practice test') || textLower.includes('question') || textLower.includes('quiz') || textLower.includes('mcq')) {
      targetAction = 'generate_practice_test';
    } else if (textLower.includes('schedule') || textLower.includes('period')) {
      targetAction = 'schedule_lecture';
    } else if (textLower.includes('slide') || textLower.includes('material') || textLower.includes('notes')) {
      targetAction = 'prepare_material';
    } else if (textLower.includes('support') || textLower.includes('mentor') || textLower.includes('help')) {
      targetAction = 'public_chat';
    } else {
      targetAction = 'solve_doubt';
    }
  }

  // Defensively infer role priority:
  // 1. Explicit role argument (if not default 'STUDENT' when targetAction is a professor action)
  // 2. Professor actions automatically map to PROFESSOR
  let targetRole = role;
  const professorActions = ['schedule_lecture', 'prepare_material', 'create_test', 'grade_submission'];
  const studentActions = ['generate_study_plan', 'generate_practice_test', 'solve_doubt'];

  if (professorActions.includes(targetAction)) {
    targetRole = 'PROFESSOR';
  } else if (studentActions.includes(targetAction)) {
    targetRole = 'STUDENT';
  }

  // Delegate request to Python FastAPI AI microservice orchestrator
  const pyResult = await orchestrateAiRequest({
    userId,
    role: targetRole,
    action: targetAction,
    payload: {
      ...payload,
      messages,
      temperature,
      max_tokens,
      userPrompt: lastUserMsg,
    },
    userPrompt: lastUserMsg,
  });

  if (pyResult.success && pyResult.data) {
    if (typeof pyResult.data === 'string') {
      return pyResult.data;
    }
    // If output is structured JSON object
    return JSON.stringify(pyResult.data);
  }

  // Structured Error return when Python service is unavailable or rejected by guardrails
  const errorCode = pyResult.error?.code || 'AI_SERVICE_UNAVAILABLE';
  const errorMessage = pyResult.error?.message || 'AI service is temporarily unavailable.';
  
  const err = new Error(errorMessage);
  err.code = errorCode;
  err.status = 503;
  throw err;
};

module.exports = {
  generateChatCompletion,
};
