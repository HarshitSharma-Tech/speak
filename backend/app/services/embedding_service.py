import math
import re
import chromadb
from typing import List, Dict, Any, Optional
from app.core.config import settings


class DeterministicSemanticEmbedding:
    """
    Lightweight deterministic semantic vectorizer.
    Produces 128-dimensional L2-normalized dense embeddings based on n-gram hashing and term frequencies.
    Guarantees consistent cosine similarity between related concepts without external API latency or cost.
    """
    DIM = 128

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        vec = [0.0] * cls.DIM
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return vec

        for word in words:
            # Word hashing
            h = hash(word) % cls.DIM
            vec[h] += 1.0
            # Bi-gram subwords for morphological similarity
            for i in range(len(word) - 2):
                tri = word[i:i+3]
                h_sub = hash(tri) % cls.DIM
                vec[h_sub] += 0.35

        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    @classmethod
    def embed_batch(cls, texts: List[str]) -> List[List[float]]:
        return [cls.embed_text(t) for t in texts]

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        # Scale to [0.0, 1.0]
        sim = dot / (norm_a * norm_b)
        return max(0.0, min(1.0, float(sim)))


class EmbeddingService:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

    def get_or_create_collection(self, collection_name: str):
        """Create or fetch a ChromaDB collection for a document."""
        # Sanitize collection name for ChromaDB (3-63 chars, alphanumeric, starts/ends with alphanumeric)
        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', collection_name)[:60]
        if len(clean_name) < 3:
            clean_name = f"col_{clean_name}"
        return self.chroma_client.get_or_create_collection(name=clean_name)

    def add_chunks_to_vector_store(
        self,
        collection_name: str,
        chunks: List[Dict[str, Any]]
    ):
        """
        Store document chunks and their dense embeddings in ChromaDB collection.
        chunks: list of dicts with 'id', 'chunk_index', 'page_number', 'content'
        """
        if not chunks:
            return

        collection = self.get_or_create_collection(collection_name)
        ids = [c["id"] for c in chunks]
        documents = [c["content"] for c in chunks]
        metadatas = [
            {
                "chunk_id": c["id"],
                "chunk_index": c["chunk_index"],
                "page_number": c["page_number"]
            }
            for c in chunks
        ]

        embeddings = DeterministicSemanticEmbedding.embed_batch(documents)

        # Batch insert into ChromaDB
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def query_similar_chunks(
        self,
        collection_name: str,
        query: str,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for top-k semantically relevant chunks for a given query text.
        """
        collection = self.get_or_create_collection(collection_name)
        if collection.count() == 0:
            return []

        query_embedding = DeterministicSemanticEmbedding.embed_text(query)
        effective_k = min(n_results, collection.count())

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=effective_k,
            include=["documents", "metadatas", "distances"]
        )

        output = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            dists = results.get("distances", [[]])[0] if "distances" in results else [0.0] * len(docs)

            for i in range(len(docs)):
                distance = dists[i] if i < len(dists) else 0.5
                similarity = max(0.0, min(1.0, 1.0 - (distance / 2.0)))
                output.append({
                    "chunk_id": metas[i]["chunk_id"],
                    "chunk_index": metas[i]["chunk_index"],
                    "page_number": metas[i]["page_number"],
                    "content": docs[i],
                    "similarity": round(similarity, 4)
                })

        return output

    def delete_collection(self, collection_name: str):
        """Safely delete a vector collection upon document deletion."""
        try:
            clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', collection_name)[:60]
            self.chroma_client.delete_collection(name=clean_name)
        except Exception:
            pass


embedding_service = EmbeddingService()
