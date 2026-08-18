from typing import Dict, Any

def validate_agent_output(output_payload: Dict[str, Any], agent_name: str) -> Dict[str, Any]:
    """
    Output guardrail validating payload integrity and preventing data leakage.
    """
    if not isinstance(output_payload, dict):
        return {
            "success": False,
            "error": {
                "code": "INVALID_OUTPUT_SCHEMA",
                "message": f"Agent '{agent_name}' produced an invalid non-dictionary payload."
            }
        }
    
    # Check for leaked internal keys or raw exception strings
    str_repr = str(output_payload)
    if "INTERNAL_AI_SERVICE_TOKEN" in str_repr or "GROQ_API_KEY" in str_repr:
        return {
            "success": False,
            "error": {
                "code": "SECURITY_DATA_LEAK_PREVENTED",
                "message": "Security guardrail intercepted data leakage attempt."
            }
        }

    return {
        "success": True,
        "payload": output_payload
    }
