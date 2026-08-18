from typing import Dict, Any
from agents.base_agent import BaseAgent
from core.llm import llm_service

class PublicSupportAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="PublicSupportAgent",
            role="PUBLIC",
            purpose="Answers pre-sign-in and in-app user support queries about EduCopilot platform features.",
            permitted_rags=["syllabus_rag", "academic_policy_rag"],
            permitted_tools=["answer_doubt"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        query = payload.get("query", payload.get("message", payload.get("userPrompt", "")))
        user_role = (payload.get("userRole") or payload.get("role") or "student").lower()
        user_name = payload.get("userName") or "User"

        system_prompt = f"""You are EduCopilot's AI Platform Assistant.
You guide users on how to use EduCopilot effectively based on their role ({user_role.upper()}).

STUDENT FEATURES:
- View & Generate Study Plans (/student/study-plans): Multi-day roadmaps from course syllabi & notes.
- Practice Tests (/student/practice-tests): Adaptive quizzes with real-time timers and weak area diagnostics (No fullscreen required).
- Prof Exams (/student/prof-exams): Official exams created by professors using secure Access Codes. Requires Fullscreen Mode & strict navigation monitoring.
- Ask a Doubt (/student/doubt-chat): 24/7 RAG syllabus-grounded AI tutor.
- Course Knowledge (/student/materials-rag): Upload notes & textbooks to expand your personal RAG vault.
- Test History (/student/test-history): Diagnostic analytics and weak area tracking.

PROFESSOR FEATURES:
- Course Materials RAG (/professor/materials-rag): Upload syllabi, notes, textbooks for vector search.
- Generate Schedule (/professor/scheduling/generate): Slot-by-slot prerequisite lecture sequencer.
- Material Prep (/professor/material-prep): Auto-draft slides, comprehensive notes, and question banks.
- Share Notes via Gmail (/professor/share-notes): Dispatch study materials directly to student emails.
- Assessment & Grading (/professor/grading): AI rubric auto-grading for student submissions.
- Create Tests (/professor/create-test): Create scoped exams with custom Access Codes.

OFFICIAL ASSESSMENT FULLSCREEN & INTEGRITY SECURITY POLICY:
- Applicable ONLY to official professor-assigned exams (/student/prof-exams). DOES NOT apply to practice tests, study plans, or doubt chat.
- Requires Access Code provided by professor to unlock.
- Automatically enters Browser Fullscreen Mode upon starting test.
- Navigation restrictions: Exiting fullscreen, switching browser tabs, or opening other windows during official exams is strictly prohibited.
- Violation Policy:
  * 1st Violation: Warning 1 (Alerts student of fullscreen / navigation prohibition).
  * 2nd Violation: Warning 2 (Final Warning: Next violation will auto-submit exam).
  * 3rd Violation (>2 Violations): Immediate Auto-Submission of exam, locks attempt, saves current answers, deletes active session, and notifies professor.
- Authoritative Server State: Violation count is maintained in MongoDB (TestAttempt & ActiveExamSession). Browser refreshes DO NOT reset the violation counter.
- Single Active Session: Only one active exam session allowed per student; duplicate concurrent logins are rejected.

RULES:
- The user is already logged in as {user_name} ({user_role}).
- Never ask them to log in or sign up.
- Provide clean, structured Markdown response with subheadings, bullet points, and step-by-step instructions.
- Do NOT output raw JSON code blocks or raw JSON strings. Output plain Markdown text."""

        user_prompt = f"User Question: '{query}'\nProvide a clear, helpful Markdown response explaining how to use EduCopilot for this query."

        try:
            res = llm_service.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            return {"answer": res}
        except Exception as e:
            return {
                "answer": f"### 💡 EduCopilot Platform Guide\n\nHello **{user_name}**! EduCopilot provides personalized study planning, adaptive practice tests, 24/7 RAG doubt tutoring, automated lecture scheduling, and AI rubric grading. Select a feature from your left sidebar to get started!"
            }
