"""Streaming SHA-256 that never loads a whole file into memory."""
import hashlib
from typing import Iterable


def sha256_stream(chunks: Iterable[bytes]) -> tuple[str, int]:
    h = hashlib.sha256()
    total = 0
    for chunk in chunks:
        h.update(chunk)
        total += len(chunk)
    return h.hexdigest(), total
