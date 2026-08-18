from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.assessment_tools import tool_generate_test

class CreateTestAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="CreateTestAgent",
            role="PROFESSOR",
            purpose="Generates formal course exam papers (MCQ, True/False, Fill Blank, Short Answer, Mixed) for professor review & edit.",
            permitted_rags=["syllabus_rag", "course_content_rag", "question_bank_rag"],
            permitted_tools=[
                "generate_mcq", "generate_true_false", "generate_objective",
                "generate_subjective", "generate_mixed_test"
            ]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        subject = payload.get("subject", "Course Exam")
        topic = payload.get("topic", "Comprehensive Assessment")
        question_type = payload.get("questionType", payload.get("questionFormat", "Mixed"))
        num_questions = int(payload.get("questionCount", payload.get("numQuestions", payload.get("totalQuestions", 5))))
        difficulty = payload.get("difficulty", "Medium")
        duration_minutes = int(payload.get("durationMinutes", 30))

        return tool_generate_test(
            subject=subject,
            topic=topic,
            question_type=question_type,
            num_questions=num_questions,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            grounded_context=grounded_context
        )
