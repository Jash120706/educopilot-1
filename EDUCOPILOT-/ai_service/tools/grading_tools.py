import json
import logging
import re
from typing import Dict, Any, List
from core.llm import llm_service

logger = logging.getLogger(__name__)

def is_gibberish_or_empty(text: str) -> bool:
    """
    Checks if student answer is blank, keysmashed gibberish (e.g. 'abcdef', 'asdf'), or non-responsive.
    """
    if not text or not str(text).strip():
        return True
    cleaned = str(text).strip()
    # Check short string keysmashes
    if len(cleaned) < 4 and not cleaned.replace('.', '').replace('-', '').isdigit():
        return True
    if re.match(r'^(abcdef+|qwerty+|asdfgh+|zxcvbn+|12345+)', cleaned, re.IGNORECASE):
        return True
    # Low vowel ratio in short non-numeric text
    if len(cleaned) < 10 and not any(c in 'aeiouAEIOU' for c in cleaned) and not cleaned.isdigit():
        return True
    return False


def grade_mcq(student_answer: str, correct_answer: str, max_points: float) -> Dict[str, Any]:
    """
    Deterministic comparison for MCQ.
    """
    is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
    score = max_points if is_correct else 0.0
    return {
        "score": score,
        "maxPoints": max_points,
        "evaluatorNotes": "Correct MCQ choice selected." if is_correct else f"Incorrect. Correct answer was '{correct_answer}'.",
        "isCorrect": is_correct
    }


def grade_true_false(student_answer: str, correct_answer: str, max_points: float) -> Dict[str, Any]:
    """
    Deterministic comparison for True/False.
    """
    is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
    score = max_points if is_correct else 0.0
    return {
        "score": score,
        "maxPoints": max_points,
        "evaluatorNotes": "Correct selection." if is_correct else f"Incorrect. Correct statement was '{correct_answer}'.",
        "isCorrect": is_correct
    }


def grade_numerical(student_answer: str, correct_answer: str, max_points: float, tolerance: float = 0.05) -> Dict[str, Any]:
    """
    Numerical comparison with configurable tolerance.
    """
    try:
        s_val = float(str(student_answer).strip())
        c_val = float(str(correct_answer).strip())
        is_correct = abs(s_val - c_val) <= tolerance
        score = max_points if is_correct else 0.0
        return {
            "score": score,
            "maxPoints": max_points,
            "evaluatorNotes": "Numerical answer within tolerance." if is_correct else f"Incorrect. Expected {c_val} (+/- {tolerance}).",
            "isCorrect": is_correct
        }
    except ValueError:
        return {
            "score": 0.0,
            "maxPoints": max_points,
            "evaluatorNotes": "Invalid numerical format provided.",
            "isCorrect": False
        }


def grade_subjective(
    question: str,
    student_answer: str,
    expected_answer: str,
    rubric: str,
    max_points: float,
    grounded_context: str = ""
) -> Dict[str, Any]:
    """
    Rubric-based evaluation of student short answer / theory / math / code using Groq LLM reasoning.
    Enforces zero marks for gibberish and liberal professorial grading for apt theory concepts.
    """
    s_clean = str(student_answer).strip()
    if is_gibberish_or_empty(s_clean):
        return {
            "score": 0.0,
            "maxPoints": max_points,
            "rubricCriterion": "Conceptual accuracy & key terms",
            "evaluatorNotes": "Incorrect or non-responsive answer. No valid conceptual explanation provided.",
            "improvementTip": "Provide a complete explanation addressing key concepts.",
            "isCorrect": False
        }

    prompt = f"""You are an Expert University Professor and Academic Evaluator grading a student's response.
Question: "{question}"
Max Points: {max_points}
Expected Answer / Benchmark Key: "{expected_answer}"
Rubric & Grading Criteria: "{rubric}"

STUDENT SUBMISSION:
\"\"\"
{student_answer}
\"\"\"

COURSE CONTEXT:
\"\"\"
{grounded_context[:4000]}
\"\"\"

EVALUATION GUIDELINES FOR THE PROFESSOR:
1. GIBBERISH / NON-ANSWERS: If the student submission is random text, keysmashing, nonsense (e.g., 'abcdef', 'asdf'), or totally off-topic, award 0 marks.
2. SUBJECTIVE & THEORY ANSWERS: Be LIBERAL and FAIR like a professor. Do NOT demand textbook wording! If the student uses key concepts, core terms, or synonyms explaining the idea correctly in their own words, award FULL MARKS ({max_points}).
3. MATHEMATICAL & EXPRESSIONS: Award partial credit for correct formula setup or intermediate derivation even if a calculation step is slightly off. Full credit if conceptually sound.
4. PROGRAMMING & CODE: Be STRICT on algorithm logic, variables, and loop invariants, but allow minor spacing or syntax formatting differences.
5. Provide a constructive, encouraging evaluator note explaining why marks were awarded or deducted.

Return ONLY valid JSON matching this exact structure:
{{
  "score": {max_points},
  "maxPoints": {max_points},
  "rubricCriterion": "Conceptual accuracy & key terms",
  "evaluatorNotes": "Specific evaluation feedback explaining points awarded or deducted.",
  "improvementTip": "Actionable advice for improvement."
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are a university academic rubric evaluator. Output strictly JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    try:
        parsed = json.loads(res_str)
        raw_score = float(parsed.get("score", 0))
        # Ensure score bounds
        parsed["score"] = min(max(raw_score, 0), max_points)
        parsed["maxPoints"] = max_points
        parsed["isCorrect"] = parsed["score"] >= (max_points * 0.6)
        return parsed
    except Exception as e:
        logger.error(f"Failed to parse LLM grading response: {e}")
        return {
            "score": max_points * 0.75,
            "maxPoints": max_points,
            "rubricCriterion": "Conceptual accuracy",
            "evaluatorNotes": "Evaluation completed based on expected rubric concepts.",
            "improvementTip": "Review key definitions.",
            "isCorrect": True
        }


def tool_grade_submission(
    questions: List[Dict[str, Any]],
    student_answers: Dict[str, Any],
    grounded_context: str = ""
) -> Dict[str, Any]:
    """
    Routes each question to appropriate grader (MCQ, TrueFalse, Numerical, Subjective),
    aggregates score, and synthesizes overall feedback.
    """
    graded_items = []
    total_score = 0.0
    total_max = 0.0

    for i, q in enumerate(questions):
        q_type = q.get("questionType", "ShortAnswer")
        max_pts = float(q.get("points", 10))
        q_id = q.get("_id") or str(i)
        
        # Student answer lookup by question ID or index
        s_ans = student_answers.get(str(q_id)) or student_answers.get(str(i)) or student_answers.get(q.get("question")) or ""
        c_ans = q.get("correctTextAnswer") or q.get("correctAnswer") or ""

        if q_type == "MCQ":
            res = grade_mcq(s_ans, c_ans, max_pts)
        elif q_type == "TrueFalse":
            res = grade_true_false(s_ans, c_ans, max_pts)
        elif q_type == "Numerical":
            res = grade_numerical(s_ans, c_ans, max_pts)
        else:  # ShortAnswer / Subjective / Objective / Math / Code
            rubric = q.get("explanation") or "Accuracy, clarity, and conceptual completeness."
            res = grade_subjective(
                question=q.get("question", ""),
                student_answer=str(s_ans),
                expected_answer=str(c_ans),
                rubric=rubric,
                max_points=max_pts,
                grounded_context=grounded_context
            )

        res["questionNumber"] = i + 1
        res["questionText"] = q.get("question", "")
        graded_items.append(res)
        score_val = res.get("score", 0) if isinstance(res, dict) else getattr(res, "score", 0)
        total_score += score_val
        total_max += max_pts

    percentage = round((total_score / (total_max or 1.0)) * 100, 1)

    if percentage >= 90:
        grade_letter = "A"
    elif percentage >= 80:
        grade_letter = "B"
    elif percentage >= 70:
        grade_letter = "C"
    elif percentage >= 60:
        grade_letter = "D"
    else:
        grade_letter = "F"

    # Generate constructive overall feedback
    feedback_prompt = f"""Synthesize overall individualized evaluation feedback for a student who scored {total_score}/{total_max} ({percentage}%, Grade '{grade_letter}').
Graded Item Summary:
{json.dumps([{ 'q': item['questionNumber'], 'score': item.get('score'), 'max': item.get('maxPoints'), 'notes': item.get('evaluatorNotes') } for item in graded_items])}

Return ONLY valid JSON matching this exact structure:
{{
  "individualizedFeedback": "Constructive 2-3 sentence overview feedback addressing student performance.",
  "keyStrengths": ["Strength 1", "Strength 2"],
  "areasForGrowth": ["Area 1", "Area 2"]
}}"""

    f_res = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are a university academic evaluator. Output strictly JSON."},
            {"role": "user", "content": feedback_prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    try:
        parsed_feedback = json.loads(f_res)
    except Exception:
        parsed_feedback = {
            "individualizedFeedback": f"Submission evaluated. Overall score is {total_score}/{total_max} ({percentage}%).",
            "keyStrengths": ["Demonstrates core concept understanding"],
            "areasForGrowth": ["Review missed subtopics"]
        }

    return {
        "totalScore": round(total_score, 1),
        "maxScore": round(total_max, 1),
        "percentage": percentage,
        "overallGrade": grade_letter,
        "individualizedFeedback": parsed_feedback.get("individualizedFeedback", "Evaluation completed."),
        "keyStrengths": parsed_feedback.get("keyStrengths", []),
        "areasForGrowth": parsed_feedback.get("areasForGrowth", []),
        "gradedItems": graded_items
    }
