import math


def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


def top_matches(question_embedding: list[float], chunks: list[dict], limit: int = 4) -> list[dict]:
    return sorted(
        chunks,
        key=lambda chunk: cosine_similarity(question_embedding, chunk["embedding"]),
        reverse=True,
    )[:limit]
