from guardrails.policy_registry import ROLE_POLICIES

def validate_tool_authorization(tool_name: str, role: str) -> bool:
    """
    Ensures student role cannot execute professor tools (e.g. grade_subjective).
    """
    norm_role = (role or "PUBLIC").upper()
    if norm_role not in ROLE_POLICIES:
        norm_role = "PUBLIC"

    denied = ROLE_POLICIES[norm_role]["denied_tools"]
    if tool_name in denied:
        return False
    
    allowed = ROLE_POLICIES[norm_role]["allowed_tools"]
    return tool_name in allowed
