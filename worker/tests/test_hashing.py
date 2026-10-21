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
