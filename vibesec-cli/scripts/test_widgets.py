#!/usr/bin/env python3
"""Smoke test for Phase B widgets — exercises rendering logic without TUI."""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reconpro.theme import Theme, THEMES


def test_score_gauge_render():
    """Test ScoreGauge rendering without Textual mount."""
    from reconpro.widgets.score_gauge import ScoreGauge, _ease_out_cubic

    # Test easing function
    assert abs(_ease_out_cubic(0.0) - 0.0) < 0.01
    assert abs(_ease_out_cubic(1.0) - 1.0) < 0.01
    assert _ease_out_cubic(0.5) > 0.5  # ease-out should be ahead of linear

    # Create gauge (won't mount, just test logic)
    g = ScoreGauge(bar_width=14)
    assert g._target_score == 100
    assert g._display_score == 100.0

    # Test set_score
    g.set_score(72, "C")
    assert g._target_score == 72
    assert g.grade == "C"

    # Test set_score with delta
    g.set_score(45, "D")
    assert g._delta == -27  # 45 - 72

    # Test clamp
    g.set_score(150, "A+")
    assert g._target_score == 100
    g.set_score(-10, "F")
    assert g._target_score == 0

    print("  ScoreGauge: OK")


def test_sparkline_render():
    """Test Sparkline rendering logic."""
    from reconpro.widgets.sparkline import Sparkline, BLOCKS, _TREND_MAP

    # Test block chars
    assert len(BLOCKS) == 8
    assert BLOCKS[0] == "\u2581"
    assert BLOCKS[-1] == "\u2588"

    # Test trend map
    assert "strong_up" in _TREND_MAP
    assert "flat" in _TREND_MAP

    # Create sparkline
    s = Sparkline(max_points=10, title="TEST", color="#00ffcc")
    assert len(s.data) == 0
    assert s.avg == 0.0
    assert s.peak == 0.0

    # Test push
    s.push(3)
    s.push(7)
    s.push(2)
    s.push(5)
    assert len(s.data) == 4
    assert s.avg == 4.25
    assert s.peak == 7.0
    assert s.latest == 5.0

    # Test push_batch
    s.push_batch([1, 2, 3])
    assert len(s.data) == 7

    # Test max_points truncation
    s2 = Sparkline(max_points=5)
    for i in range(10):
        s2.push(float(i))
    assert len(s2.data) == 5
    assert s2.data[-1] == 9.0

    # Test trend detection
    s3 = Sparkline(max_points=20)
    for i in range(10):
        s3.push(float(i))
    trend = s3._detect_trend()
    assert trend in ("up", "strong_up"), f"Expected up/strong_up, got {trend}"

    # Flat trend
    s4 = Sparkline(max_points=20)
    for i in range(10):
        s4.push(5.0)
    assert s4._detect_trend() == "flat"

    # Falling trend
    s5 = Sparkline(max_points=20)
    for i in range(10):
        s5.push(float(10 - i))
    trend = s5._detect_trend()
    assert trend in ("down", "strong_down"), f"Expected down/strong_down, got {trend}"

    # Test color interpolation
    s.push(1)
    color = s._interpolate_color(0.0)
    assert color.startswith("#"), f"Expected hex color, got {color}"
    color = s._interpolate_color(1.0)
    assert color.startswith("#")

    print("  Sparkline: OK")


def test_stat_counter_render():
    """Test StatCounter logic."""
    from reconpro.widgets.stat_counter import StatCounter, _format_number

    # Test number formatting
    assert _format_number(0) == "0"
    assert _format_number(42) == "42"
    assert _format_number(1000) == "1,000"
    assert _format_number(1234567) == "1,234,567"

    # Create counter
    c = StatCounter(label="findings", icon="\u25cf")
    assert c.value == 0
    assert c.delta == 0

    # Test set
    c.set(42, delta=5)
    assert c.value == 42
    assert c.delta == 5

    # Test increment
    c.increment(3)
    assert c.value == 45
    assert c.delta == 3

    # Test reset_max
    c.set(100)
    c.set(200, delta=50)
    assert c._max_seen == 200
    c.reset_max()
    assert c._max_seen == 200

    print("  StatCounter: OK")


def test_velocity_meter_render():
    """Test VelocityMeter logic."""
    from reconpro.widgets.velocity_meter import VelocityMeter, _WAVE

    # Test wave chars
    assert len(_WAVE) == 8

    # Create meter
    v = VelocityMeter()
    assert v.requests_per_sec == 0.0
    assert v.findings_per_min == 0.0
    assert v.completion_pct == 0.0
    assert not v._active

    # Test start/stop
    v.start()
    assert v._active
    v.stop()
    assert not v._active

    # Test record methods
    v.start()
    v.record_request(10)
    v.record_request(20)
    assert v._total_requests == 30
    v.record_finding(5)
    assert v._total_findings == 5

    # Test completion clamp
    v.set_completion(150.0)
    assert v.completion_pct == 100.0
    v.set_completion(-10.0)
    assert v.completion_pct == 0.0

    # Test rate color
    v2 = VelocityMeter()
    color = v2._rate_color(200, (100, 30, 5))
    assert color != ""

    print("  VelocityMeter: OK")


def test_theme_integration():
    """Test that all widgets work with all themes."""
    for theme_name in THEMES:
        Theme.set_theme(theme_name)
        t = Theme.current()
        assert hasattr(t, 'CYAN')
        assert hasattr(t, 'RED')
        assert hasattr(t, 'GREEN')
        assert hasattr(t, 'YELLOW')
        assert hasattr(t, 'TEXT_DIM')
        assert hasattr(t, 'ORANGE')
        t.sev_style('critical')
        t.grade_color('A+')
        t.grade_color('F')

    Theme.set_theme('cyberpunk')
    print(f"  Theme integration: OK ({len(THEMES)} themes tested)")


if __name__ == "__main__":
    print("Phase B Widget Smoke Tests")
    print("=" * 40)
    test_score_gauge_render()
    test_sparkline_render()
    test_stat_counter_render()
    test_velocity_meter_render()
    test_theme_integration()
    print("=" * 40)
    print("All tests passed.")
