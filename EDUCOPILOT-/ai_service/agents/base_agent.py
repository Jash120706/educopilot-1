from typing import Dict, Any, List

class BaseAgent:
    def __init__(self, name: str, role: str, purpose: str, permitted_rags: List[str], permitted_tools: List[str]):
        self.name = name
        self.role = role
        self.purpose = purpose
        self.permitted_rags = permitted_rags
        self.permitted_tools = permitted_tools

    def execute(self, payload: Dict[str, Any], grounded_context: str = "") -> Dict[str, Any]:
        raise NotImplementedError("Subclasses must implement execute method.")
