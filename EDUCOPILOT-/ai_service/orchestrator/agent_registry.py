"""
Centralized Agent Registry instantiating all 8 core specialized agents + public support agent.
"""
from typing import Dict, Any
from agents.base_agent import BaseAgent
from agents.student.study_planner import StudyPlannerAgent
from agents.student.practice_test import PracticeTestAgent
from agents.student.doubt_solver import DoubtSolverAgent
from agents.student.progress import ProgressAgent
from agents.professor.material_preparation import MaterialPreparationAgent
from agents.professor.scheduling import SchedulingAgent
from agents.professor.create_test import CreateTestAgent
from agents.professor.grading import GradingAgent
from agents.public.public_support import PublicSupportAgent

# Instantiate agent instances
STUDENT_AGENTS = {
    "StudyPlannerAgent": StudyPlannerAgent(),
    "PracticeTestAgent": PracticeTestAgent(),
    "DoubtSolverAgent": DoubtSolverAgent(),
    "ProgressAgent": ProgressAgent()
}

PROFESSOR_AGENTS = {
    "MaterialPreparationAgent": MaterialPreparationAgent(),
    "SchedulingAgent": SchedulingAgent(),
    "CreateTestAgent": CreateTestAgent(),
    "GradingAgent": GradingAgent()
}

PUBLIC_AGENTS = {
    "PublicSupportAgent": PublicSupportAgent()
}

# Master Agent Registry
AGENT_REGISTRY: Dict[str, BaseAgent] = {
    **STUDENT_AGENTS,
    **PROFESSOR_AGENTS,
    **PUBLIC_AGENTS
}

# Alias mapping for intent routing
ACTION_TO_AGENT_MAP = {
    "generate_study_plan": "StudyPlannerAgent",
    "generate_practice_test": "PracticeTestAgent",
    "solve_doubt": "DoubtSolverAgent",
    "analyze_progress": "ProgressAgent",
    "prepare_material": "MaterialPreparationAgent",
    "schedule_lecture": "SchedulingAgent",
    "create_test": "CreateTestAgent",
    "grade_submission": "GradingAgent",
    "public_chat": "PublicSupportAgent"
}

def get_agent_by_name(agent_name: str) -> BaseAgent:
    """
    Retrieves agent instance by name from central registry.
    """
    return AGENT_REGISTRY.get(agent_name)

def resolve_agent_by_action(action: str) -> BaseAgent:
    """
    Resolves agent instance from requested action string.
    """
    agent_name = ACTION_TO_AGENT_MAP.get(action)
    if agent_name:
        return AGENT_REGISTRY.get(agent_name)
    # Direct name lookup fallback
    return AGENT_REGISTRY.get(action)
