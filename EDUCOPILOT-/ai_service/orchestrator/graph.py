import logging
from typing import Dict, Any, TypedDict, Optional
from guardrails.rbac_guardrail import validate_rbac_role
from guardrails.agent_guardrail import validate_agent_authorization
from guardrails.rag_guardrail import validate_rag_authorization
from guardrails.input_guardrail import sanitize_and_validate_input
from guardrails.output_guardrail import validate_agent_output
from orchestrator.agent_registry import resolve_agent_by_action, get_agent_by_name
from rag.retriever import retrieve_relevant_context

logger = logging.getLogger(__name__)

class GraphState(TypedDict):
    user_id: str
    role: str
    action: str
    agent_name: Optional[str]
    user_prompt: str
    payload: Dict[str, Any]
    grounded_context: str
    status: str  # "PROCESSING", "AUTHORIZED", "DENIED", "ERROR", "COMPLETED"
    error: Optional[Dict[str, str]]
    output: Optional[Dict[str, Any]]

def node_validate_request_and_role(state: GraphState) -> GraphState:
    """Node 1: Internal Request & Role Verification"""
    role = state.get("role", "")
    if not validate_rbac_role(role):
        state["status"] = "DENIED"
        state["error"] = {
            "code": "RBAC_ROLE_UNAUTHORIZED",
            "message": f"Role '{role}' is invalid or unrecognized."
        }
        return state
    state["status"] = "PROCESSING"
    return state

def node_input_guardrail(state: GraphState) -> GraphState:
    """Node 2: Deterministic Input Guardrail & Prompt Security Check"""
    if state["status"] == "DENIED":
        return state
    
    prompt = state.get("user_prompt") or state.get("payload", {}).get("question") or state.get("payload", {}).get("topic") or ""
    role = state.get("role", "STUDENT")
    
    guard_res = sanitize_and_validate_input(prompt, role)
    if not guard_res["safe"]:
        state["status"] = "DENIED"
        state["error"] = {
            "code": "INPUT_SECURITY_VIOLATION",
            "message": guard_res["reason"]
        }
        return state
    
    state["user_prompt"] = guard_res["sanitized_prompt"]
    return state

def node_select_and_validate_agent(state: GraphState) -> GraphState:
    """Node 3: Intent Router & Role-Aware Agent Authorization"""
    if state["status"] == "DENIED":
        return state
    
    action = state.get("action", "")
    agent = resolve_agent_by_action(action)
    
    if not agent:
        state["status"] = "DENIED"
        state["error"] = {
            "code": "UNKNOWN_AGENT_ACTION",
            "message": f"No specialized agent registered for action '{action}'."
        }
        return state

    # Validate Agent RBAC Permission
    if not validate_agent_authorization(agent.name, state.get("role", "")):
        logger.warning(f"[Orchestrator] Security Denial: Role '{state.get('role')}' attempted to invoke '{agent.name}'.")
        state["status"] = "DENIED"
        state["error"] = {
            "code": "AGENT_ACCESS_DENIED",
            "message": f"Role '{state.get('role')}' is not authorized to execute agent '{agent.name}'."
        }
        return state

    state["agent_name"] = agent.name
    return state

def node_retrieve_rag_context(state: GraphState) -> GraphState:
    """Node 4: Authorized Dense Vector RAG Retrieval"""
    if state["status"] == "DENIED":
        return state
    
    agent = get_agent_by_name(state.get("agent_name", ""))
    if not agent or not agent.permitted_rags:
        state["grounded_context"] = ""
        return state

    # Choose primary permitted RAG collection
    target_rag = agent.permitted_rags[0]
    
    # Enforce RAG Guardrail
    if not validate_rag_authorization(target_rag, state.get("role", "")):
        logger.warning(f"[Orchestrator] RAG Denial: Role '{state.get('role')}' denied access to RAG '{target_rag}'.")
        state["grounded_context"] = "RAG context restricted by security policy."
        return state

    payload = state.get("payload", {})
    query = state.get("user_prompt") or payload.get("topic") or payload.get("subject") or "course content"
    
    rag_res = retrieve_relevant_context(
        query=query,
        role=state.get("role", ""),
        user_id=state.get("user_id", ""),
        rag_collection=target_rag,
        subject_code=payload.get("subjectCode"),
        department=payload.get("department"),
        top_k=4
    )
    
    state["grounded_context"] = rag_res.get("formatted_context", "")
    return state

def node_execute_agent(state: GraphState) -> GraphState:
    """Node 5: Execute Agent Reasoning & Tool Access"""
    if state["status"] == "DENIED":
        return state

    agent = get_agent_by_name(state.get("agent_name", ""))
    if not agent:
        state["status"] = "ERROR"
        state["error"] = {"code": "AGENT_EXECUTION_FAILED", "message": "Agent instance missing."}
        return state

    try:
        res = agent.execute(
            payload=state.get("payload", {}),
            grounded_context=state.get("grounded_context", "")
        )
        state["output"] = res
    except Exception as e:
        logger.error(f"[Orchestrator] Exception during agent execution '{agent.name}': {e}")
        state["status"] = "ERROR"
        state["error"] = {
            "code": "AGENT_RUNTIME_ERROR",
            "message": f"Execution error in agent '{agent.name}': {str(e)}"
        }
    return state

def node_output_guardrail(state: GraphState) -> GraphState:
    """Node 6: Output Validation & Payload Sanitization"""
    if state["status"] in ["DENIED", "ERROR"]:
        return state

    output = state.get("output")
    agent_name = state.get("agent_name", "UnknownAgent")
    
    val_res = validate_agent_output(output, agent_name)
    if not val_res["success"]:
        state["status"] = "ERROR"
        state["error"] = val_res["error"]
        return state

    state["status"] = "COMPLETED"
    state["output"] = val_res["payload"]
    return state
