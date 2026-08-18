from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.study_tools import tool_answer_doubt

class DoubtSolverAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="DoubtSolverAgent",
            role="STUDENT",
            purpose="Answers student course doubts grounded strictly in uploaded professor RAG materials.",
            permitted_rags=["course_content_rag", "syllabus_rag"],
            permitted_tools=["answer_doubt", "worked_example"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        # Extract question reliably from multiple payload keys or prompt
        question = (
            payload.get("question")
            or payload.get("query")
            or payload.get("doubt")
            or payload.get("userPrompt")
            or payload.get("prompt")
            or "What are the core concepts covered in this course material?"
        )
        return tool_answer_doubt(
            question=question,
            grounded_context=grounded_context
        )
