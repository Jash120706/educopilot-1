from typing import Dict, Any
from agents.base_agent import BaseAgent
from tools.assessment_tools import tool_schedule_lecture

class SchedulingAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="SchedulingAgent",
            role="PROFESSOR",
            purpose="Optimizes course topic sequence and builds slot-by-slot pedagogical lecture timelines.",
            permitted_rags=["syllabus_rag", "academic_policy_rag"],
            permitted_tools=["suggest_topic_sequence", "schedule_lecture"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        subject = payload.get("subject", "Course Topic")
        periods_count = int(payload.get("periodsCount", payload.get("totalPeriods", 5)))
        syllabus_text = payload.get("syllabusText", "")

        return tool_schedule_lecture(
            subject=subject,
            periods_count=periods_count,
            syllabus_text=syllabus_text
        )
