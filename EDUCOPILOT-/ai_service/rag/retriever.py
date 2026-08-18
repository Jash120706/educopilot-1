import logging
from typing import Dict, Any, List, Optional
from rag.embeddings import embedding_service
from rag.rag_registry import is_rag_permitted_for_role
from vector_db.vector_store import vector_store

logger = logging.getLogger(__name__)

def retrieve_relevant_context(
    query: str,
    role: str,
    user_id: str = "",
    rag_collection: str = "course_content_rag",
    subject_code: Optional[str] = None,
    department: Optional[str] = None,
    doc_title: Optional[str] = None,
    top_k: int = 4
) -> Dict[str, Any]:
    """
    Retrieves authorized course context using dense vector similarity search.
    Enforces strict RAG RBAC permission rules.
    """
    # 1. Enforce RAG RBAC Policy
    if not is_rag_permitted_for_role(rag_collection, role):
        logger.warning(f"[RAG Retriever] Access DENIED to RAG collection '{rag_collection}' for role '{role}'.")
        return {
            "authorized": False,
            "error": f"Role '{role}' is not authorized to access RAG collection '{rag_collection}'.",
            "chunks": [],
            "formatted_context": "No authorized RAG context available due to role permission restrictions."
        }

    # 2. Build metadata filter
    metadata_filter = {}
    if subject_code and subject_code != "All":
        metadata_filter["subject_code"] = subject_code
    if department and department != "All":
        metadata_filter["department"] = department
    if doc_title and doc_title != "All":
        metadata_filter["doc_title"] = doc_title

    # Student records isolation: Students can only view their own records
    if rag_collection == "student_records_rag" and role.upper() == "STUDENT":
        metadata_filter["user_id"] = user_id

    # 3. Generate dense embedding vector for user query
    query_vector = embedding_service.embed_text(query)

    # 4. Search Vector Store
    results = vector_store.search(
        query_embedding=query_vector,
        top_k=top_k,
        metadata_filter=metadata_filter if metadata_filter else None
    )

    # 5. Format grounded context string for agent
    if not results:
        formatted = "No specific uploaded course document chunks found matching this query in the vector store."
    else:
        formatted_list = []
        for i, c in enumerate(results):
            formatted_list.append(
                f"[Source Document {i+1}: '{c['doc_title']}' | Code: {c['subject_code']} | Dept: {c['department']} | Score: {c['relevance_score']}]\n{c['chunk_text']}"
            )
        formatted = "\n\n---\n\n".join(formatted_list)

    return {
        "authorized": True,
        "rag_collection": rag_collection,
        "chunks": results,
        "formatted_context": formatted
    }
