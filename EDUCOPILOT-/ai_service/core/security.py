from fastapi import Header, HTTPException, status
from config import INTERNAL_AI_SERVICE_TOKEN

def verify_internal_token(x_internal_token: str = Header(None, alias="X-Internal-Token")):
    """
    Ensures the request originated directly from the Express API Gateway.
    Direct browser calls without the secret token are strictly rejected.
    """
    if not x_internal_token or x_internal_token != INTERNAL_AI_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED_INTERNAL_REQUEST",
                    "message": "Invalid or missing internal service authorization token."
                }
            }
        )
    return True
