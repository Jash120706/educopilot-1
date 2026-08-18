from typing import Dict, Any, List
from agents.base_agent import BaseAgent
from tools.grading_tools import tool_grade_submission

class GradingAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="GradingAgent",
            role="PROFESSOR",
            purpose="Evaluates multi-format student test submissions using deterministic comparison and LLM rubric grading.",
            permitted_rags=["answer_key_rubric_rag", "course_content_rag", "student_records_rag"],
            permitted_tools=[
                "grade_mcq", "grade_true_false", "grade_objective",
                "grade_numerical", "grade_subjective", "aggregate_score", "generate_feedback"
            ]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        questions = payload.get("questions", [])
        student_answers = payload.get("studentAnswers", payload.get("answers", {}))

        return tool_grade_submission(
            questions=questions,
            student_answers=student_answers,
            grounded_context=grounded_context
        )
