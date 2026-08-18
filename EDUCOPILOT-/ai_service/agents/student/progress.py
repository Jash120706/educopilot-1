from typing import Dict, Any
from agents.base_agent import BaseAgent

class ProgressAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ProgressAgent",
            role="STUDENT",
            purpose="Analyzes student's own historical test scores and identifies weak spots.",
            permitted_rags=["student_records_rag"],
            permitted_tools=["analyze_own_performance", "identify_weak_topics"]
        )

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        test_attempts = payload.get("testAttempts", [])
        weak_areas = set()
        strengths = set()
        total_score = 0.0

        for attempt in test_attempts:
            total_score += float(attempt.get("percentage", 0))
            for w in attempt.get("weakAreas", []):
                weak_areas.add(w)
            for s in attempt.get("strengths", []):
                strengths.add(s)

        avg_score = round(total_score / (len(test_attempts) or 1.0), 1)

        return {
            "avgScore": avg_score,
            "totalAttemptsAnalyzed": len(test_attempts),
            "weakAreas": list(weak_areas)[:5],
            "strengths": list(strengths)[:5],
            "recommendation": "Focus review on weak areas identified in practice test diagnostics."
        }
