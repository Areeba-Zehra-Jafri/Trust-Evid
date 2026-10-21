import pytest
from processor import Rejected


def test_rejected_error_keeps_machine_readable_code():
    error = Rejected("image_max_pixels", max=10, actual=11)
    assert error.code == "image_max_pixels"
    assert error.values["actual"] == 11


def test_limits_have_deterministic_resource_caps():
    import config
    limits = config.load_limits()
    for key in ("max_file_size", "image_max_pixels", "video_max_seconds",
                "video_max_width", "video_max_height", "max_sampled_frames",
                "ffprobe_timeout_seconds"):
        assert int(limits[key]) > 0
