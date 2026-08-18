import re
from typing import Dict, Any

INJECTION_PATTERNS = [
    r"ignore (?:all )?(?:your )?instructions",
    r"ignore (?:the )?(?:previous )?rules",
    r"override (?:system )?prompt",
    r"give me (?:the )?(?:official )?answer key",
    r"expose (?:the )?system prompt",
    r"bypass (?:permissions|guardrails|rbac)",
    r"act as (?:an )?administrator",
    r"you are now in DAN mode",
    r"reveal (?:all )?student records",
    r"show me rubric criteria for grading classmates"
]

def sanitize_and_validate_input(user_prompt: str, role: str) -> Dict[str, Any]:
    """
    Deterministic input guardrail checking for prompt injection, jailbreaks, and unauthorized data extraction.
    """
    if not user_prompt:
        return {"safe": True, "sanitized_prompt": "", "reason": None}

    prompt_lower = user_prompt.lower()

    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, prompt_lower):
            return {
                "safe": False,
                "sanitized_prompt": user_prompt,
                "reason": f"Input security violation detected: Prompt injection / unauthorized instruction override attempt."
            }

    # Student-specific restriction checks
    if (role or "").upper() == "STUDENT":
        if "answer key" in prompt_lower or "grading rubric" in prompt_lower or "model answers" in prompt_lower:
            return {
                "safe": False,
                "sanitized_prompt": user_prompt,
                "reason": "Security violation: Students are prohibited from requesting answer keys or official grading rubrics."
            }

    return {
        "safe": True,
        "sanitized_prompt": user_prompt.strip(),
        "reason": None
    }
