"""
Centralized Tool Registry defining available tools and role/agent permissions.
"""
from typing import Dict, Any, List

TOOL_REGISTRY = {
    # Student Tools
    "create_study_plan": {"role": "STUDENT", "description": "Generate multi-day structured study roadmap"},
    "summarize_topic": {"role": "STUDENT", "description": "Synthesize revision notes and topic summaries"},
    "generate_practice_test": {"role": "STUDENT", "description": "Generate self-assessment student practice quiz"},
    "evaluate_own_practice_answer": {"role": "STUDENT", "description": "Instant scoring of own practice test answer"},
    "explain_answer": {"role": "STUDENT", "description": "Step-by-step academic answer explanation"},
    "answer_doubt": {"role": "STUDENT", "description": "RAG-grounded academic doubt clarification"},
    "worked_example": {"role": "STUDENT", "description": "Generate step-by-step solved academic example"},
    "analyze_own_performance": {"role": "STUDENT", "description": "Analyze student's own historical test metrics"},
    "identify_weak_topics": {"role": "STUDENT", "description": "Detect student's weak conceptual areas"},

    # Professor Tools
    "generate_notes": {"role": "PROFESSOR", "description": "Draft comprehensive course lecture notes"},
    "generate_slides_outline": {"role": "PROFESSOR", "description": "Draft slide deck outline with speaker notes"},
    "create_assignment": {"role": "PROFESSOR", "description": "Generate assignment questions and marking rubrics"},
    "generate_examples": {"role": "PROFESSOR", "description": "Draft classroom demonstration examples"},
    "suggest_topic_sequence": {"role": "PROFESSOR", "description": "Optimize pedagogical topic prerequisite ordering"},
    "schedule_lecture": {"role": "PROFESSOR", "description": "Generate slot-by-slot lecture timeline plan"},
    "generate_mcq": {"role": "PROFESSOR", "description": "Generate multiple-choice test questions"},
    "generate_true_false": {"role": "PROFESSOR", "description": "Generate True/False assessment questions"},
    "generate_objective": {"role": "PROFESSOR", "description": "Generate fill-in-the-blank / objective questions"},
    "generate_subjective": {"role": "PROFESSOR", "description": "Generate short-answer / essay assessment questions"},
    "generate_mixed_test": {"role": "PROFESSOR", "description": "Generate full multi-format course exam paper"},
    "grade_mcq": {"role": "PROFESSOR", "description": "Deterministic MCQ answer evaluation"},
    "grade_true_false": {"role": "PROFESSOR", "description": "Deterministic True/False answer evaluation"},
    "grade_objective": {"role": "PROFESSOR", "description": "Normalized string key evaluation"},
    "grade_numerical": {"role": "PROFESSOR", "description": "Numerical value evaluation with tolerance"},
    "grade_subjective": {"role": "PROFESSOR", "description": "Rubric & RAG-grounded short answer grading"},
    "aggregate_score": {"role": "PROFESSOR", "description": "Compute section weights & final percentage"},
    "generate_feedback": {"role": "PROFESSOR", "description": "Synthesize non-generic constructive feedback"}
}

def is_tool_permitted_for_role(tool_name: str, role: str) -> bool:
    """
    Verifies if a tool is authorized for execution by the specified role.
    """
    tool_info = TOOL_REGISTRY.get(tool_name)
    if not tool_info:
        return False
    
    required_role = tool_info["role"].upper()
    user_role = (role or "").upper()
    
    if required_role == "STUDENT" and user_role == "STUDENT":
        return True
    if required_role == "PROFESSOR" and user_role == "PROFESSOR":
        return True
    
    return False
