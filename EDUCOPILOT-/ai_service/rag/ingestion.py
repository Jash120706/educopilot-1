import logging
from typing import Dict, Any, List
from rag.embeddings import embedding_service
from vector_db.vector_store import vector_store

logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Splits text into overlapping semantic windows.
    """
    if not text:
        return []
    clean = text.replace('\r\n', '\n').strip()
    chunks = []
    start = 0
    while start < len(clean):
        end = start + chunk_size
        if end < len(clean):
            next_nl = clean.find('\n', end - 100)
            next_pt = clean.find('. ', end - 100)
            if next_nl != -1 and next_nl < end + 100:
                end = next_nl + 1
            elif next_pt != -1 and next_pt < end + 100:
                end = next_pt + 2
        chunk_str = clean[start:end].strip()
        if len(chunk_str) > 40:
            chunks.append(chunk_str)
        start = end - overlap
        if start >= len(clean) - 50:
            break
    return chunks

def ingest_course_document(
    doc_title: str,
    raw_text: str,
    subject: str = "General",
    subject_code: str = "",
    department: str = "CSE",
    document_type: str = "content",
    user_id: str = "",
    role: str = "PROFESSOR",
    rag_collection: str = "course_content_rag"
) -> Dict[str, Any]:
    """
    Chunks document, generates dense embeddings, and indexes into Vector DB.
    """
    chunks = chunk_text(raw_text)
    if not chunks:
        return {"success": False, "chunks_indexed": 0, "error": "Document contains no readable text."}

    # Delete prior vectors for same document title and user
    vector_store.delete_documents({"doc_title": doc_title, "user_id": user_id})

    embeddings = embedding_service.embed_batch(chunks)

    docs = []
    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        docs.append({
            "doc_title": doc_title,
            "chunk_index": idx + 1,
            "chunk_text": chunk,
            "embedding": emb,
            "user_id": user_id,
            "metadata": {
                "subject": subject,
                "subject_code": subject_code,
                "department": department,
                "document_type": document_type,
                "user_id": user_id,
                "role": role,
                "rag_collection": rag_collection
            }
        })

    vector_store.add_documents(docs)
    logger.info(f"[Ingestion] Document '{doc_title}' successfully indexed with {len(docs)} chunks.")

    return {
        "success": True,
        "doc_title": doc_title,
        "subject": subject,
        "subject_code": subject_code,
        "department": department,
        "chunks_indexed": len(docs),
        "rag_collection": rag_collection
    }
