from pathlib import Path
import re


def read_document(path: Path) -> str:
    """Read a text/Markdown profile or extract text from a supplied PDF."""
    if not path.is_file():
        return ""
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader

        return "\n\n".join(page.extract_text() or "" for page in PdfReader(path).pages).strip()
    return path.read_text(encoding="utf-8").strip()


def chunk_document(text: str, max_chars: int = 1100, overlap: int = 140) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            start = 0
            while start < len(paragraph):
                chunks.append(paragraph[start : start + max_chars])
                start += max_chars - overlap
            continue
        candidate = f"{current}\n\n{paragraph}" if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
        else:
            chunks.append(current)
            carry = current[-overlap:] if overlap else ""
            current = f"{carry}\n\n{paragraph}" if carry else paragraph
    if current:
        chunks.append(current)
    return chunks
