from guardrails.policy_registry import ROLE_POLICIES

def validate_agent_authorization(agent_name: str, role: str) -> bool:
    """
    Ensures a student cannot invoke professor agents (e.g. GradingAgent, CreateTestAgent).
    """
    norm_role = (role or "PUBLIC").upper()
    if norm_role not in ROLE_POLICIES:
        norm_role = "PUBLIC"
    
    allowed_agents = ROLE_POLICIES[norm_role]["allowed_agents"]
    return agent_name in allowed_agents
