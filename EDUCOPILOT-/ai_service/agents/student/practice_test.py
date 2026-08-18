from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.assessment_tools import tool_generate_test

class PracticeTestAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="PracticeTestAgent",
            role="STUDENT",
            purpose="Generates self-assessment student practice quizzes and calibrates difficulty.",
            permitted_rags=["course_content_rag", "question_bank_rag"],
            permitted_tools=["generate_practice_test", "evaluate_own_practice_answer", "explain_answer"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        subject = payload.get("subject", "Computer Science")
        topic = payload.get("topic", "Course Fundamentals")
        question_type = payload.get("questionType", payload.get("type", "Mixed"))
        num_questions = int(payload.get("questionCount", payload.get("numQuestions", payload.get("count", 5))))
        difficulty = payload.get("difficulty", "Medium")

        return tool_generate_test(
            subject=subject,
            topic=topic,
            question_type=question_type,
            num_questions=num_questions,
            difficulty=difficulty,
            grounded_context=grounded_context
        )
