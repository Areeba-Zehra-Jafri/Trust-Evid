from main import ensure_original_hash
import pytest


def test_matching_original_hash_is_allowed():
    ensure_original_hash("ABC", "abc")


def test_conflicting_original_hash_is_rejected():
    with pytest.raises(ValueError, match="original_hash_mismatch"):
        ensure_original_hash("abc", "def")


def test_empty_recorded_hash_is_write_once_candidate():
    ensure_original_hash(None, "abc")
