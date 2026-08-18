from guardrails.policy_registry import ROLE_POLICIES

def validate_rbac_role(role: str) -> bool:
    """
    Validates if role is recognized in system policy.
    """
    norm_role = (role or "").upper()
    return norm_role in ROLE_POLICIES or norm_role in ["GUEST", "ANONYMOUS"]
