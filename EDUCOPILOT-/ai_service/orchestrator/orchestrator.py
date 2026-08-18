import logging
from typing import Dict, Any
from orchestrator.graph import (
    GraphState,
    node_validate_request_and_role,
    node_input_guardrail,
    node_select_and_validate_agent,
    node_retrieve_rag_context,
    node_execute_agent,
    node_output_guardrail
)

logger = logging.getLogger(__name__)

class LangGraphOrchestrator:
    def __init__(self):
        self._init_graph()

    def _init_graph(self):
        try:
            from langgraph.graph import StateGraph, END
            workflow = StateGraph(GraphState)
            workflow.add_node("validate_role", node_validate_request_and_role)
            workflow.add_node("input_guardrail", node_input_guardrail)
            workflow.add_node("select_agent", node_select_and_validate_agent)
            workflow.add_node("retrieve_rag", node_retrieve_rag_context)
            workflow.add_node("execute_agent", node_execute_agent)
            workflow.add_node("output_guardrail", node_output_guardrail)

            workflow.set_entry_point("validate_role")
            workflow.add_edge("validate_role", "input_guardrail")
            workflow.add_edge("input_guardrail", "select_agent")
            workflow.add_edge("select_agent", "retrieve_rag")
            workflow.add_edge("retrieve_rag", "execute_agent")
            workflow.add_edge("execute_agent", "output_guardrail")
            workflow.add_edge("output_guardrail", END)

            self.compiled_graph = workflow.compile()
            logger.info("[LangGraphOrchestrator] Compiled LangGraph StateGraph pipeline successfully.")
        except Exception as e:
            logger.warning(f"[LangGraphOrchestrator] Using direct sequential pipeline fallback ({e}).")
            self.compiled_graph = None

    def orchestrate(
        self,
        user_id: str,
        role: str,
        action: str,
        payload: Dict[str, Any],
        user_prompt: str = ""
    ) -> Dict[str, Any]:
        """
        Runs request through LangGraph stateful orchestrator pipeline.
        """
        initial_state: GraphState = {
            "user_id": user_id,
            "role": role,
            "action": action,
            "agent_name": None,
            "user_prompt": user_prompt,
            "payload": payload,
            "grounded_context": "",
            "status": "PROCESSING",
            "error": None,
            "output": None
        }

        if self.compiled_graph:
            final_state = self.compiled_graph.invoke(initial_state)
        else:
            # Sequential pipeline execution
            s1 = node_validate_request_and_role(initial_state)
            s2 = node_input_guardrail(s1)
            s3 = node_select_and_validate_agent(s2)
            s4 = node_retrieve_rag_context(s3)
            s5 = node_execute_agent(s4)
            final_state = node_output_guardrail(s5)

        if final_state.get("status") == "DENIED":
            return {
                "success": False,
                "error": final_state.get("error") or {"code": "ACCESS_DENIED", "message": "Request denied by guardrails."}
            }
        elif final_state.get("status") == "ERROR":
            return {
                "success": False,
                "error": final_state.get("error") or {"code": "AI_ORCHESTRATION_ERROR", "message": "Orchestrator encountered error."}
            }

        return {
            "success": True,
            "agent_used": final_state.get("agent_name"),
            "data": final_state.get("output")
        }

orchestrator = LangGraphOrchestrator()
