import logging
import uvicorn
from fastapi import FastAPI
from config import PORT, HOST, GROQ_API_KEY, GROQ_MODEL
from api.routes import router
from vector_db.vector_store import vector_store
from orchestrator.agent_registry import AGENT_REGISTRY

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("EduCopilot-AI-Service")

app = FastAPI(
    title="EduCopilot Python AI Microservice",
    description="LangGraph, LangChain, RAG, Vector DB & Guardrails Microservice",
    version="1.0.0"
)

# Register internal API routes
app.include_router(router)

@app.get("/health")
def health_check():
    """
    Public Health Check Endpoint for Python AI Service.
    """
    return {
        "status": "ok",
        "service": "EduCopilot Python AI Microservice",
        "groqConfigured": bool(GROQ_API_KEY),
        "groqModel": GROQ_MODEL,
        "vectorStoreCount": len(vector_store.documents),
        "agentsRegistered": len(AGENT_REGISTRY),
        "agents": list(AGENT_REGISTRY.keys())
    }

if __name__ == "__main__":
    logger.info(f"🚀 Starting EduCopilot Python AI Microservice on port {PORT}...")
    uvicorn.run(app, host=HOST, port=PORT)
