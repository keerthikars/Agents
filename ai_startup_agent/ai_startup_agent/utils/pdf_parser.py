"""
utils/pdf_parser.py
Extracts plain text from an uploaded startup idea / pitch deck / business
plan PDF so it can be fed into the agent pipeline the same way a typed
idea description would be.
"""

from pypdf import PdfReader
import io


def extract_text_from_pdf(file_bytes: bytes, max_chars: int = 15000) -> str:
    """Extract text from a PDF's bytes. Truncates to max_chars so we don't
    blow past LLM context limits on huge decks; the agents only need the
    substantive description, not every appendix page."""
    reader = PdfReader(io.BytesIO(file_bytes))
    chunks = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text.strip():
            chunks.append(text.strip())

    full_text = "\n\n".join(chunks).strip()

    if not full_text:
        raise ValueError(
            "Couldn't extract any text from this PDF. It may be a scanned "
            "image-only document. Try pasting the idea as text instead."
        )

    if len(full_text) > max_chars:
        full_text = full_text[:max_chars] + "\n\n[...truncated for length...]"

    return full_text
