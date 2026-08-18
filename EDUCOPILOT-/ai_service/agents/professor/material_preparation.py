from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.assessment_tools import tool_generate_materials

class MaterialPreparationAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="MaterialPreparationAgent",
            role="PROFESSOR",
            purpose="Generates course slide outlines, lecture notes, assignments, and practice question banks.",
            permitted_rags=["syllabus_rag", "course_content_rag", "question_bank_rag"],
            permitted_tools=["generate_notes", "generate_slides_outline", "create_assignment", "generate_examples"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        topic = payload.get("topic", "Lecture Topic")
        subject = payload.get("subject", "General")
        material_type = payload.get("type", payload.get("materialType", "slides"))
        question_count = int(payload.get("questionCount", 5))
        points_per_question = int(payload.get("pointsPerQuestion", 10))
        slide_count = int(payload.get("slideCount", 5))

        return tool_generate_materials(
            topic=topic,
            subject=subject,
            material_type=material_type,
            question_count=question_count,
            points_per_question=points_per_question,
            slide_count=slide_count,
            grounded_context=grounded_context
        )
