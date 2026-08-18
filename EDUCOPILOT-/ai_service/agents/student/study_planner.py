from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.study_tools import tool_create_study_plan

class StudyPlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="StudyPlannerAgent",
            role="STUDENT",
            purpose="Generates multi-day grounded study plans from course materials and syllabi.",
            permitted_rags=["syllabus_rag", "course_content_rag"],
            permitted_tools=["create_study_plan", "summarize_topic"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        subject = payload.get("subject", "Computer Science")
        topic = payload.get("topic", "Exam Prep")
        target_exam_date = payload.get("targetExamDate", "Upcoming Exam")
        duration_days = int(payload.get("durationDays", payload.get("days", 7)))
        
        return tool_create_study_plan(
            subject=subject,
            topic=topic,
            target_exam_date=target_exam_date,
            duration_days=duration_days,
            grounded_context=grounded_context
        )
