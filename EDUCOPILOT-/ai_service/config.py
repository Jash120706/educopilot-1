import os
from dotenv import load_dotenv

# Load from server/.env if local .env doesn't exist
server_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server", ".env"))
if os.path.exists(server_env):
    load_dotenv(server_env)
else:
    load_dotenv()

# Server Settings
PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")

# Security Token (Internal Express <-> Python Communication)
INTERNAL_AI_SERVICE_TOKEN = os.getenv(
    "INTERNAL_AI_SERVICE_TOKEN", "educopilot_internal_ai_secret_token_2026"
).strip("'\"")

# Groq LLM Configuration
raw_key = os.getenv("GROQ_API_KEY", "")
GROQ_API_KEY = raw_key.strip("'\"") if raw_key else ""

# Primary active Groq model
GROQ_MODEL = "groq/compound-mini"
FALLBACK_GROQ_MODEL = "groq/compound"

# RAG & Embedding Settings
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
VECTOR_DIMENSION = 384
DEFAULT_TOP_K = 4
