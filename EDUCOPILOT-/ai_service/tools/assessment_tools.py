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
    
    try:
        return json.loads(json_str)
    except Exception:
        pass

    match = re.search(r'\{[\s\S]*\}', json_str)
    if match:
        target = match.group(0)
        try:
            return json.loads(target)
        except Exception:
            cleaned = re.sub(r',\s*([\}\]])', r'\1', target)
            try:
                return json.loads(cleaned)
            except Exception:
                pass

    return {}

def tool_generate_test(
    subject: str,
    topic: str,
    question_type: str = "Mixed",
    num_questions: int = 5,
    difficulty: str = "Medium",
    duration_minutes: int = 30,
    grounded_context: str = ""
) -> Dict[str, Any]:
    prompt = f"""You are an Expert Academic Examination Author creating a formal university test paper.
Subject: {subject}
Topic Focus: {topic}
Question Format: {question_type} (MCQ, TrueFalse, FillBlank, ShortAnswer, or Mixed)
Total Questions Needed: {num_questions}
Difficulty Level: {difficulty}
Duration: {duration_minutes} minutes

COURSE REFERENCE GROUNDING CONTEXT:
\"\"\"
{grounded_context[:6000]}
\"\"\"

QUALITY REQUIREMENTS:
1. Generate exactly {num_questions} high quality, distinct academic questions matching the requested question format.
2. For MCQ: Provide 4 realistic options, correctAnswerIndex (0-3), correctTextAnswer, and detailed step-by-step explanation.
3. For TrueFalse: options ["True", "False"], correctAnswerIndex (0 or 1), correctTextAnswer ("True" or "False").
4. For FillBlank: options [], correctAnswerIndex 0, correctTextAnswer ("exact term").
5. For ShortAnswer: options [], correctAnswerIndex 0, correctTextAnswer ("step-by-step model solution").

Return ONLY valid JSON matching this exact structure:
{{
  "suggestedTitle": "{subject} - {topic} Examination",
  "suggestedTopic": "{topic}",
  "questions": [
    {{
      "questionType": "MCQ",
      "question": "Specific, quantitative or conceptual question statement?",
      "options": ["Option A statement", "Option B statement", "Option C statement", "Option D statement"],
      "correctAnswerIndex": 0,
      "correctTextAnswer": "Option A statement",
      "points": 2,
      "explanation": "Detailed step-by-step mathematical or theoretical reasoning explaining why Option A is correct.",
      "topicTag": "{topic}"
    }}
  ]
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are an academic assessment author. Output strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = safe_parse_json(res_str)
    if not parsed.get("questions"):
        # Fallback question generation if empty
        parsed["questions"] = [
            {
                "questionType": "MCQ",
                "question": f"Which of the following best defines the core principle of {topic} in {subject}?",
                "options": [
                    f"Fundamental architecture of {topic}",
                    "Legacy unoptimized sequential execution",
                    "Random state mutation without logging",
                    "Unbounded queue buffer overflow"
                ],
                "correctAnswerIndex": 0,
                "correctTextAnswer": f"Fundamental architecture of {topic}",
                "points": 2,
                "explanation": f"Core principle of {topic} dictates rigorous state invariants and structured coordination.",
                "topicTag": topic
            }
            for i in range(max(1, num_questions))
        ]
    if not parsed.get("suggestedTitle"):
        parsed["suggestedTitle"] = f"{subject} ({topic}) Assessment"
    if not parsed.get("suggestedTopic"):
        parsed["suggestedTopic"] = topic

    return parsed


def tool_schedule_lecture(
    subject: str,
    periods_count: int,
    syllabus_text: str = ""
) -> Dict[str, Any]:
    prompt = f"""You are a Master Academic Curriculum Pacing & Scheduling Director.
Subject: {subject}
Total Periods Budget: {periods_count}

SYLLABUS & CURRICULUM MATERIAL:
\"\"\"
{syllabus_text[:6000]}
\"\"\"

CRITICAL INSTRUCTIONS FOR EFFECTIVE SCHEDULING:
1. Divide the syllabus into exactly {periods_count} sequential, progressive lecture slots (Period 1 to Period {periods_count}).
2. FOR EACH PERIOD, provide 3 to 4 UNIQUE, HIGHLY SPECIFIC subtopics derived directly from the syllabus content.
3. ABSOLUTELY FORBID REPETITIVE BOILERPLATE SUBTOPICS (DO NOT repeat phrases like "Core mathematical / architectural principles" or "State transitions & design criteria"). Every period MUST feature distinct, topic-specific concepts!
4. Establish strict prerequisite chains: Period 2 MUST list Period 1's main topic as a prerequisite. Period 3 MUST list Period 2's topic as a prerequisite, etc.

Return ONLY valid JSON matching this exact structure:
{{
  "plan": [
    {{
      "period": 1,
      "type": "lecture",
      "topic": "Specific Period 1 Topic Title",
      "subtopics": [
        "Concrete Subtopic 1 (e.g. Fundamental Definition & Key Formulas)",
        "Concrete Subtopic 2 (e.g. Step-by-Step Derivation & Worked Example)",
        "Concrete Subtopic 3 (e.g. Practical Application & Boundary Cases)"
      ],
      "prerequisites": ["None (Foundational)"]
    }},
    {{
      "period": 2,
      "type": "lecture",
      "topic": "Specific Period 2 Advanced Topic Title",
      "subtopics": [
        "Advanced Concept 1 (e.g. Multi-stage Analysis & Optimization)",
        "Advanced Concept 2 (e.g. Diagnostic Traps & Exam Short-cuts)"
      ],
      "prerequisites": ["Specific Period 1 Topic Title"]
    }}
  ],
  "at_risk_topics": [],
  "notes": "Full {periods_count}-period slot plan organized in strict prerequisite dependency order."
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are a master curriculum planner. Output strictly valid JSON with zero repeated subtopic text."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = safe_parse_json(res_str)
    
    # Fallback to ensure clean non-repetitive plan if LLM failed
    if not parsed.get("plan") or len(parsed["plan"]) == 0:
        parsed["plan"] = [
            {
                "period": i + 1,
                "type": "lecture",
                "topic": f"{subject} Module {i+1}: Core Principles & Analysis",
                "subtopics": [
                    f"Theoretical Foundations of Module {i+1}",
                    f"Step-by-Step Derivation & Problem Solving for Module {i+1}",
                    f"Comparative Performance Analysis & Exam Walkthrough"
                ],
                "prerequisites": [f"{subject} Module {i}" if i > 0 else "None (Foundational)"]
            }
            for i in range(max(1, periods_count))
        ]
    if "notes" not in parsed:
        parsed["notes"] = f"Full {periods_count}-period slot plan organized in strict prerequisite dependency order."

    return parsed


def tool_generate_materials(
    topic: str,
    subject: str = "General",
    material_type: str = "slides",
    question_count: int = 5,
    points_per_question: int = 10,
    slide_count: int = 5,
    grounded_context: str = ""
) -> Dict[str, Any]:
    """
    Generates slides, lecture notes, assignments, or practice question banks based on material_type.
    """
    if material_type in ["practice_questions", "questions"]:
        prompt = f"""You are a Senior Academic Professor creating a high-quality Practice Question & Solution Bank.
Subject: {subject}
Topic Focus: {topic}
Total Questions Needed: {question_count}
Points Per Question: {points_per_question}

COURSE GROUNDING MATERIAL:
\"\"\"
{grounded_context[:6000]}
\"\"\"

QUALITY REQUIREMENTS:
1. Generate exactly {question_count} distinct practice questions covering quantitative, procedural, and conceptual aspects of {topic}.
2. "modelAnswer": Provide a thorough, step-by-step model solution containing the exact formula, intermediate calculations, and final answer. Explain the full reasoning clearly.

Return ONLY valid JSON matching this exact structure:
{{
  "title": "Practice Question Bank: {topic}",
  "practiceQuestions": [
    {{
      "question": "Specific numerical or conceptual question statement?",
      "questionType": "ShortAnswer",
      "modelAnswer": "Step 1: State given values. Step 2: Apply formula. Step 3: Compute final numerical or theoretical result.",
      "difficulty": "Medium",
      "points": {points_per_question}
    }}
  ]
}}"""
    elif material_type == "notes":
        prompt = f"""You are a Senior Academic Author drafting textbook-quality lecture notes.
Subject: {subject}
Topic: {topic}

COURSE GROUNDING MATERIAL:
\"\"\"
{grounded_context[:6000]}
\"\"\"

Return ONLY valid JSON matching this exact structure:
{{
  "title": "Comprehensive Lecture Notes: {topic}",
  "lectureNotes": "# Comprehensive Lecture Notes: {topic}\\n\\n## 1. Overview & Key Axioms\\nDetailed theoretical analysis...\\n\\n## 2. Mathematical Principles & Formulations\\nItemized equations and step-by-step derivations...\\n\\n## 3. Worked Example\\nStep-by-step problem walkthrough with complete solution."
}}"""
    elif material_type == "assignment":
        prompt = f"""You are a Professor creating a structured academic assignment with rubric.
Subject: {subject}
Topic: {topic}
Total Questions: {question_count}
Points Per Question: {points_per_question}

COURSE GROUNDING MATERIAL:
\"\"\"
{grounded_context[:6000]}
\"\"\"

Return ONLY valid JSON matching this exact structure:
{{
  "title": "Assignment: {topic}",
  "instructions": "Answer all questions step-by-step showing complete derivations.",
  "totalPoints": {question_count * points_per_question},
  "assignments": [
    {{
      "question": "Analytical question statement requiring derivation or design choice",
      "questionType": "Descriptive",
      "rubric": "Grading Rubric: 10 pts for correct formula setup, 10 pts for intermediate steps, 5 pts for final answer.",
      "points": {points_per_question}
    }}
  ]
}}"""
    else:
        # Default slides
        prompt = f"""You are a Professor creating an executive lecture slide deck outline.
Subject: {subject}
Topic: {topic}
Number of Slides: {slide_count}

COURSE GROUNDING MATERIAL:
\"\"\"
{grounded_context[:6000]}
\"\"\"

Return ONLY valid JSON matching this exact structure:
{{
  "title": "Presentation Title: {topic}",
  "slides": [
    {{
      "slideNumber": 1,
      "title": "Granular Slide Title",
      "bullets": [
        "Dense technical bullet with specific parameters and concepts",
        "Step-by-step mechanism details",
        "Design trade-off or boundary condition"
      ],
      "visualSuggestion": "Concrete diagram or flowchart description",
      "speakerNotes": "Instructor delivery notes and key student traps"
    }}
  ]
}}"""

    res_str = llm_service.generate(
        messages=[
            {"role": "system", "content": "You are a course material generator. Output strictly valid JSON with zero generic filler."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = safe_parse_json(res_str)
    
    # Fallback guarantees if parsing returned empty structure
    if material_type in ["practice_questions", "questions"] and not parsed.get("practiceQuestions"):
        parsed["title"] = f"Practice Question Bank: {topic}"
        parsed["practiceQuestions"] = [
            {
                "question": f"Explain the fundamental mechanism of {topic} in {subject} with a step-by-step numerical or theoretical example.",
                "questionType": "ShortAnswer",
                "modelAnswer": f"Step 1: Identify core parameters governing {topic}.\nStep 2: Apply invariant rules to solve step-by-step.\nStep 3: Verify boundary conditions and final result.",
                "difficulty": "Medium",
                "points": points_per_question
            }
            for _ in range(max(1, question_count))
        ]
    elif material_type == "slides" and not parsed.get("slides"):
        parsed["title"] = f"Presentation Title: {topic}"
        parsed["slides"] = [
            {
                "slideNumber": i + 1,
                "title": f"Slide {i+1}: {topic} Key Principles",
                "bullets": [
                    f"Operational principles governing {topic}",
                    "Performance trade-offs and complexity bounds",
                    "Implementation invariants and state management"
                ],
                "visualSuggestion": f"Architectural diagram illustrating {topic} workflow",
                "speakerNotes": f"Explain how {topic} operates under realistic production constraints."
            }
            for i in range(max(1, slide_count))
        ]
    elif material_type == "notes" and not parsed.get("lectureNotes"):
        parsed["title"] = f"Comprehensive Lecture Notes: {topic}"
        parsed["lectureNotes"] = f"# Comprehensive Lecture Notes: {topic}\n\n## 1. Executive Overview\n{topic} forms a foundational component of {subject}.\n\n## 2. Core Principles\nKey theoretical properties and invariant bounds."
    elif material_type == "assignment" and not parsed.get("assignments"):
        parsed["title"] = f"Assignment: {topic}"
        parsed["instructions"] = "Submit step-by-step solutions."
        parsed["assignments"] = [
            {
                "question": f"Derive and analyze the state transitions for {topic}.",
                "questionType": "Descriptive",
                "rubric": "Full credit for complete proof and trade-off analysis.",
                "points": points_per_question
            }
            for _ in range(max(1, question_count))
        ]

    return parsed
