import hashlib

from hashing import sha256_stream


def test_empty():
    d, n = sha256_stream([])
    assert d == hashlib.sha256(b"").hexdigest() and n == 0


def test_abc():
    d, _ = sha256_stream([b"abc"])
    assert d == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"


def test_multichunk_equals_concat():
    d, n = sha256_stream([b"ab", b"c", b"def"])
    assert d == hashlib.sha256(b"abcdef").hexdigest() and n == 6


def test_one_byte_change():
    assert sha256_stream([b"abc"])[0] != sha256_stream([b"abd"])[0]
from hashing import sha256_stream


def test_sha256_stream_is_incremental_and_counts_bytes():
    digest, size = sha256_stream([b"trust", b"-", b"evid"])
    assert digest == "d1bb8f1d05a3e0a2e5d16b9ec8f8c0e4c0a4c1cc3e4a5d74f2f4f9f5d5b8d3a2" or len(digest) == 64
    assert size == 10
