import ast
from pathlib import Path


def test_verify_does_not_persist_hash():
    tree = ast.parse(Path('main.py').read_text())
    source = Path('main.py').read_text()
    verify_fn = next(node for node in ast.walk(tree) if isinstance(node, ast.AsyncFunctionDef) and node.name == 'verify_original')
    body = ast.get_source_segment(source, verify_fn)
    assert 'write_hash_once' not in body
    assert 'sha256' in body and 'byte_count' in body
