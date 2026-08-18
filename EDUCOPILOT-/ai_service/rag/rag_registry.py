"""
Centralized RAG Registry defining logical Knowledge Base collections and access restrictions.
"""
from typing import Dict, Any, List

RAG_COLLECTIONS = {
    "syllabus_rag": {
        "description": "Course syllabus, learning objectives, topic sequence, exam blueprint",
        "professor_access": True,
        "student_access": True,
        "pre_signin_access": True
    },
    "course_content_rag": {
        "description": "Textbooks, lecture notes, slides, course materials",
        "professor_access": True,
        "student_access": True,
        "pre_signin_access": False
    },
    "question_bank_rag": {
        "description": "Practice questions, past questions, difficulty metadata",
        "professor_access": True,
        "student_access": True,
        "pre_signin_access": False
    },
    "answer_key_rubric_rag": {
        "description": "Model answers, marking schemes, grading rubrics (PROFESSOR ONLY)",
        "professor_access": True,
        "student_access": False,  # STRICT DENY FOR STUDENTS
        "pre_signin_access": False
    },
    "student_records_rag": {
        "description": "Student performance, grades, feedback, submission history",
        "professor_access": True,
        "student_access": True,  # Strictly isolated to own student_id
        "pre_signin_access": False
    },
    "academic_policy_rag": {
        "description": "Academic calendar, policies, scheduling information",
        "professor_access": True,
        "student_access": True,
        "pre_signin_access": True
    }
}

def is_rag_permitted_for_role(rag_name: str, role: str) -> bool:
    """
    Validates if a given role is allowed to query a specific logical RAG collection.
    """
    collection = RAG_COLLECTIONS.get(rag_name)
    if not collection:
        return False
    
    normalized_role = (role or "").upper()
    if normalized_role == "PROFESSOR":
        return collection["professor_access"]
    elif normalized_role == "STUDENT":
        return collection["student_access"]
    elif normalized_role in ["PUBLIC", "GUEST", "ANONYMOUS"]:
        return collection["pre_signin_access"]
    
    return False
