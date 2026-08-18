import os
from dotenv import load_dotenv


# =====================================================
# LOAD ENVIRONMENT VARIABLES
# =====================================================

# Local development:
# ai_service/config.py
#       |
#       └── ../server/.env

server_env = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "server",
        ".env"
    )
)

if os.path.exists(server_env):
    load_dotenv(server_env)
else:
    load_dotenv()


# =====================================================
# PYTHON AI SERVICE SETTINGS
# =====================================================

# Python runs internally inside the same Docker container.
# Node.js will communicate with:
#
# http://127.0.0.1:8000
#
AI_PORT = int(
    os.getenv("AI_SERVICE_PORT", "8000")
)

AI_HOST = os.getenv(
    "AI_SERVICE_HOST",
    "127.0.0.1"
)

# Keep these names because main.py imports PORT and HOST.
PORT = AI_PORT
HOST = AI_HOST


# =====================================================
# INTERNAL SECURITY TOKEN
# =====================================================

INTERNAL_AI_SERVICE_TOKEN = os.getenv(
    "INTERNAL_AI_SERVICE_TOKEN",
    "educopilot_internal_ai_secret_token_2026"
).strip("'\"")


# =====================================================
# GROQ CONFIGURATION
# =====================================================

raw_key = os.getenv(
    "GROQ_API_KEY",
    ""
)

GROQ_API_KEY = (
    raw_key.strip("'\"")
    if raw_key
    else ""
)


# Primary Groq model
GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "groq/compound-mini"
)

FALLBACK_GROQ_MODEL = os.getenv(
    "FALLBACK_GROQ_MODEL",
    "groq/compound"
)


# =====================================================
# RAG / EMBEDDING SETTINGS
# =====================================================

EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "all-MiniLM-L6-v2"
)

VECTOR_DIMENSION = int(
    os.getenv("VECTOR_DIMENSION", "384")
)

DEFAULT_TOP_K = int(
    os.getenv("DEFAULT_TOP_K", "4")
)


# =====================================================
# DEBUG INFORMATION
# =====================================================

print("=========================================")
print("EduCopilot AI Configuration")
print("=========================================")
print(f"AI Host       : {HOST}")
print(f"AI Port       : {PORT}")
print(f"Groq Config   : {bool(GROQ_API_KEY)}")
print(f"Groq Model    : {GROQ_MODEL}")
print(f"Embedding     : {EMBEDDING_MODEL_NAME}")
print(f"Vector Dim    : {VECTOR_DIMENSION}")
print(f"Top K         : {DEFAULT_TOP_K}")
print("=========================================")
