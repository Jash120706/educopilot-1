import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        self.documents = []  # List of dicts containing metadata, text, embedding
        self.use_faiss = False
        self.faiss_index = None
        self._init_faiss()

    def _init_faiss(self):
        try:
            import faiss
            self.faiss_index = faiss.IndexFlatIP(384)  # Inner Product for normalized cosine similarity
            self.use_faiss = True
            logger.info("[VectorStore] FAISS Vector Index initialized.")
        except Exception as e:
            logger.info(f"[VectorStore] Using Numpy Cosine Vector Store ({e}).")

    def add_documents(self, docs: List[Dict[str, Any]]):
        """
        Ingests document chunks with metadata and embeddings.
        Expected format per item:
        {
           "doc_id": "...",
           "doc_title": "...",
           "chunk_index": 1,
           "chunk_text": "...",
           "embedding": [... 384 floats ...],
           "metadata": {
               "subject_code": "CS101",
               "department": "CSE",
               "user_id": "...",
               "role": "PROFESSOR",
               "document_type": "syllabus" / "content" / "notes",
               "visibility": "course" / "private",
               "rag_collection": "syllabus_rag" / "course_content_rag" / etc.
           }
        }
        """
        for doc in docs:
            emb = np.array(doc["embedding"], dtype=np.float32)
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            doc["normalized_embedding"] = emb
            self.documents.append(doc)

            if self.use_faiss and self.faiss_index is not None:
                self.faiss_index.add(np.expand_dims(emb, axis=0))

        logger.info(f"[VectorStore] Added {len(docs)} documents to vector index. Total documents: {len(self.documents)}")

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes vector similarity search with strict metadata filtering.
        """
        if not self.documents:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        norm = np.linalg.norm(q_vec)
        if norm > 0:
            q_vec = q_vec / norm

        candidates = []
        for doc in self.documents:
            # Check metadata filters
            if metadata_filter:
                match = True
                meta = doc.get("metadata", {})
                for k, v in metadata_filter.items():
                    if v is None or v == "All" or v == "":
                        continue
                    meta_val = meta.get(k) or doc.get(k)
                    if meta_val is not None and str(meta_val).lower() != str(v).lower():
                        match = False
                        break
                if not match:
                    continue

            # Compute Cosine Similarity
            doc_vec = doc["normalized_embedding"]
            similarity = float(np.dot(q_vec, doc_vec))
            
            candidates.append({
                "doc_title": doc.get("doc_title", "Untitled Document"),
                "subject": doc.get("metadata", {}).get("subject", "General"),
                "subject_code": doc.get("metadata", {}).get("subject_code", ""),
                "department": doc.get("metadata", {}).get("department", "CSE"),
                "document_type": doc.get("metadata", {}).get("document_type", "content"),
                "chunk_index": doc.get("chunk_index", 1),
                "chunk_text": doc.get("chunk_text", ""),
                "relevance_score": round(max(min(similarity, 1.0), 0.0), 4),
                "metadata": doc.get("metadata", {})
            })

        # Sort by relevance score descending
        candidates.sort(key=lambda x: x["relevance_score"], reverse=True)
        return candidates[:top_k]

    def delete_documents(self, metadata_filter: Dict[str, Any]) -> int:
        """
        Deletes documents matching specified metadata criteria.
        """
        initial_count = len(self.documents)
        new_docs = []
        for doc in self.documents:
            meta = doc.get("metadata", {})
            match = True
            for k, v in metadata_filter.items():
                if str(meta.get(k, "")).lower() == str(v).lower():
                    continue
                else:
                    match = False
                    break
            if not match:
                new_docs.append(doc)

        deleted = initial_count - len(new_docs)
        self.documents = new_docs
        
        # Re-build FAISS index if used
        if self.use_faiss and self.faiss_index is not None and deleted > 0:
            import faiss
            self.faiss_index = faiss.IndexFlatIP(384)
            for d in self.documents:
                self.faiss_index.add(np.expand_dims(d["normalized_embedding"], axis=0))

        logger.info(f"[VectorStore] Deleted {deleted} documents matching filter {metadata_filter}.")
        return deleted

vector_store = VectorStore()
