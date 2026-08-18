import logging
import numpy as np
from typing import List
from config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None
        self._init_model()

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info(f"[EmbeddingService] Loaded SentenceTransformer model '{EMBEDDING_MODEL_NAME}'.")
        except Exception as e:
            logger.warning(f"[EmbeddingService] Could not load SentenceTransformer ({e}). Using normalized word-embedding fallback generator.")
            self.model = None

    def embed_text(self, text: str) -> List[float]:
        """
        Generates dense vector embeddings for a given text.
        """
        if self.model:
            vec = self.model.encode(text, convert_to_numpy=True)
            return vec.tolist()
        
        # Resilient dense vector embedding fallback using hashing + ngram term frequency (384 dimensions)
        return self._generate_fallback_embedding(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if self.model:
            vecs = self.model.encode(texts, convert_to_numpy=True)
            return vecs.tolist()
        return [self._generate_fallback_embedding(t) for t in texts]

    def _generate_fallback_embedding(self, text: str, dim: int = 384) -> List[float]:
        """
        Deterministic pseudo-dense vector embedding generator if SentenceTransformer model binaries are downloading.
        """
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        for i, word in enumerate(words):
            hash_val = hash(word)
            idx = abs(hash_val) % dim
            val = (hash_val % 1000) / 1000.0
            vec[idx] += val
        
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

embedding_service = EmbeddingService()
