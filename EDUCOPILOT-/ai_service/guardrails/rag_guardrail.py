from guardrails.policy_registry import ROLE_POLICIES

def validate_rag_authorization(rag_collection: str, role: str) -> bool:
    """
    Ensures students are strictly denied access to answer_key_rubric_rag.
    """
    norm_role = (role or "PUBLIC").upper()
    if norm_role not in ROLE_POLICIES:
        norm_role = "PUBLIC"

    denied = ROLE_POLICIES[norm_role]["denied_rags"]
    if rag_collection in denied:
        return False
    
    allowed = ROLE_POLICIES[norm_role]["allowed_rags"]
    return rag_collection in allowed
