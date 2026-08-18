import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from core.security import verify_internal_token
from orchestrator.orchestrator import orchestrator
from rag.ingestion import ingest_course_document
from rag.retriever import retrieve_relevant_context
from vector_db.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/ai", dependencies=[Depends(verify_internal_token)])

# Pydantic Schemas
class OrchestrateRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user originating request")
    role: str = Field(..., description="User role: STUDENT, PROFESSOR, or PUBLIC")
    action: str = Field(..., description="Target action: generate_study_plan, solve_doubt, create_test, grade_submission, etc.")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Action payload parameters")
    user_prompt: Optional[str] = Field(default="", description="User input prompt or question")
    request_id: Optional[str] = Field(default="", description="Correlation request ID")

class IngestRequest(BaseModel):
    user_id: str = Field(..., description="Professor ID uploading document")
    role: str = Field(default="PROFESSOR", description="Role uploading document")
    doc_title: str = Field(..., description="Title of course document")
    raw_text: str = Field(..., description="Extracted plain text of document")
    subject: str = Field(default="General", description="Subject name")
    subject_code: Optional[str] = Field(default="", description="Subject code e.g. CS101")
    department: Optional[str] = Field(default="CSE", description="Department e.g. CSE")
    document_type: Optional[str] = Field(default="content", description="syllabus, content, or notes")
    rag_collection: Optional[str] = Field(default="course_content_rag", description="Target logical RAG collection")

class RetrieveRequest(BaseModel):
    user_id: str = Field(..., description="User ID requesting retrieval")
    role: str = Field(..., description="User role: STUDENT or PROFESSOR")
    query: str = Field(..., description="Search query string")
    rag_collection: str = Field(default="course_content_rag", description="Target RAG collection")
    subject_code: Optional[str] = Field(default=None)
    department: Optional[str] = Field(default=None)
    doc_title: Optional[str] = Field(default=None)
    top_k: int = Field(default=4)


@router.post("/orchestrate")
def orchestrate_ai_request(req: OrchestrateRequest):
    """
    Main LangGraph orchestrator endpoint. Routes requests through RBAC, Guardrails, Agents, RAG, and Tools.
    """
    try:
        result = orchestrator.orchestrate(
            user_id=req.user_id,
            role=req.role,
            action=req.action,
            payload=req.payload,
            user_prompt=req.user_prompt or ""
        )
        return result
    except Exception as e:
        logger.error(f"[API] Error during orchestration: {e}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ORCHESTRATION_ERROR",
                "message": f"AI service failed to execute request: {str(e)}"
            }
        }


@router.post("/ingest")
def ingest_document_endpoint(req: IngestRequest):
    """
    Ingests course document into dense vector store with role & metadata scoping.
    """
    try:
        res = ingest_course_document(
            doc_title=req.doc_title,
            raw_text=req.raw_text,
            subject=req.subject,
            subject_code=req.subject_code or "",
            department=req.department or "CSE",
            document_type=req.document_type or "content",
            user_id=req.user_id,
            role=req.role,
            rag_collection=req.rag_collection or "course_content_rag"
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"[API] Ingestion error: {e}")
        return {
            "success": False,
            "error": {
                "code": "DOCUMENT_INGESTION_FAILED",
                "message": str(e)
            }
        }


@router.post("/retrieve")
def retrieve_vector_context_endpoint(req: RetrieveRequest):
    """
    Direct RAG vector similarity search with RBAC verification.
    """
    try:
        res = retrieve_relevant_context(
            query=req.query,
            role=req.role,
            user_id=req.user_id,
            rag_collection=req.rag_collection,
            subject_code=req.subject_code,
            department=req.department,
            doc_title=req.doc_title,
            top_k=req.top_k
        )
        return {"success": True, "data": res}
    except Exception as e:
        return {
            "success": False,
            "error": {
                "code": "VECTOR_RETRIEVAL_FAILED",
                "message": str(e)
            }
        }


@router.delete("/documents/{doc_title}")
def delete_document_vectors(doc_title: str, user_id: str):
    """
    Deletes document vector embeddings when professor removes course material.
    """
    try:
        count = vector_store.delete_documents({"doc_title": doc_title, "user_id": user_id})
        return {"success": True, "deletedCount": count}
    except Exception as e:
        return {"success": False, "error": {"code": "DELETE_FAILED", "message": str(e)}}
