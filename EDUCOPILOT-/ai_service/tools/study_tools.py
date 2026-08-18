import json
import re
from typing import Dict, Any, List
from core.llm import llm_service

def safe_parse_json(json_str: str) -> Dict[str, Any]:
    """
    Safely parses JSON strings returned by LLM, handling formatting errors, trailing commas, and unescaped newlines.
    """
    if not json_str or not json_str.strip():
        return {}
    
    # Direct attempt
    try:
        return json.loads(json_str)
    except Exception:
        pass

    # Extract JSON object substring using regex
    match = re.search(r'\{[\s\S]*\}', json_str)
    if match:
        target = match.group(0)
        try:
            return json.loads(target)
        except Exception:
            # Clean trailing commas before closing braces/brackets
            cleaned = re.sub(r',\s*([\}\]])', r'\1', target)
            try:
                return json.loads(cleaned)
            except Exception:
                pass

    # Fallback default plan structure if JSON repair fails
    return {}

def tool_create_study_plan(
    subject: str,
    topic: str,
    target_exam_date: str,
    duration_days: int,
    grounded_context: str
) -> Dict[str, Any]:
    prompt = f"""You are an Expert AI Academic Coach creating a personalized study planner.
Subject: {subject}
Focus Topic: {topic}
Target Exam Date: {target_exam_date}
Duration: {duration_days} days

COURSE SYLLABUS & GROUNDING MATERIAL:
\"\"\"
{grounded_context[:6000]}
\"\"\"

Generate an actionable, day-by-day study roadmap for {duration_days} days.
Return ONLY valid JSON matching this exact structure:
{{
  "topicSummary": "Concise high-yield topic overview",
  "planDays": [
    {{
      "day": 1,
      "title": "Day 1 Title",
      "subject": "{subject}",
      "focus": "Daily objective",
      "priority": "High",
      "scheduledDate": "2026-08-17",
      "recommendedStudyMinutes": 90,
      "tasks": ["Read Chapter 1", "Solve 5 problems", "Draft summary notes"]
    }}
  ],
  "revisionNotes": "Markdown formatted cheat sheet with key formulas, core theorems, and common traps."
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are an academic study planner. Output strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = safe_parse_json(res_str)
    
    # Ensure planDays array is non-empty with fallback if parsing produced empty list
    if not parsed.get("planDays"):
        parsed["planDays"] = [
            {
                "day": i + 1,
                "title": f"Day {i+1}: {topic} Core Concepts",
                "subject": subject,
                "focus": f"Master key principles for {topic}",
                "priority": "High" if i == 0 else "Medium",
                "scheduledDate": "2026-08-17",
                "recommendedStudyMinutes": 90,
                "tasks": [
                    f"Review syllabus unit section {i+1}",
                    f"Solve practice problems on {topic}",
                    "Synthesize high-yield flashcard notes"
                ]
            }
            for i in range(max(1, duration_days))
        ]
    if not parsed.get("topicSummary"):
        parsed["topicSummary"] = f"Personalized study roadmap for {subject} ({topic})."
    if not parsed.get("revisionNotes"):
        parsed["revisionNotes"] = f"### Revision Notes for {topic}\n- Focus on core definitions and formulas.\n- Review weak subtopics daily."

    return parsed


def tool_answer_doubt(
    question: str,
    grounded_context: str
) -> Dict[str, Any]:
    prompt = f"""You are an expert AI Academic Tutor answering a student doubt.
Student Question: "{question}"

RETRIEVED COURSE MATERIAL (GROUNDING CONTEXT):
\"\"\"
{grounded_context[:6000]}
\"\"\"

Answer clearly in Markdown with key takeaways and suggested follow-up questions.
Return ONLY valid JSON matching this structure:
{{
  "answer": "Detailed markdown explanation grounded in course materials",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "suggestedFollowUps": ["Follow up 1", "Follow up 2", "Follow up 3"]
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are an academic tutor. Output strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = safe_parse_json(res_str)
    if not parsed.get("answer"):
        parsed["answer"] = res_str
    if not parsed.get("keyTakeaways"):
        parsed["keyTakeaways"] = ["Understand core principles", "Review step-by-step logic", "Practice related problems"]
    if not parsed.get("suggestedFollowUps"):
        parsed["suggestedFollowUps"] = ["What are key edge cases?", "Can you show a worked example?"]

    return parsed
