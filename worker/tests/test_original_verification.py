import hashlib
import pytest
import processor


def test_verify_hashes_stream_and_enforces_recorded_size(monkeypatch, tmp_path):
    source = tmp_path / 'original.bin'
    source.write_bytes(b'trust-evid-bytes')

    monkeypatch.setattr(processor, '_stream_original', lambda client, path, limits: (
        str(source), hashlib.sha256(source.read_bytes()).hexdigest(), source.stat().st_size))
    digest, size = processor.verify_stored_original(None, {
        'storage_path': 'case/evidence/file', 'file_size': source.stat().st_size,
        'media_type': 'image/png'
    }, {'image_max_bytes': 100, 'video_max_bytes': 100, 'max_file_size': 100})
    assert digest == hashlib.sha256(b'trust-evid-bytes').hexdigest()
    assert size == len(b'trust-evid-bytes')


def test_verify_rejects_recorded_size_mismatch(monkeypatch, tmp_path):
    source = tmp_path / 'original.bin'
    source.write_bytes(b'bytes')
    monkeypatch.setattr(processor, '_stream_original', lambda *args: (str(source), 'a' * 64, 5))
    with pytest.raises(processor.Rejected) as exc:
        processor.verify_stored_original(None, {'storage_path': 'x', 'file_size': 6, 'media_type': 'video/mp4'},
                                         {'image_max_bytes': 100, 'video_max_bytes': 100, 'max_file_size': 100})
    assert exc.value.code == 'recorded_size_mismatch'


def test_verify_rejects_media_specific_limit(monkeypatch):
    monkeypatch.setattr(processor, '_stream_original', lambda *args: ('unused', 'a' * 64, 11))
    with pytest.raises(processor.Rejected) as exc:
        processor.verify_stored_original(None, {'storage_path': 'x', 'file_size': 11, 'media_type': 'image/png'},
                                         {'image_max_bytes': 10, 'video_max_bytes': 100, 'max_file_size': 100})
    assert exc.value.code == 'image_max_bytes'
