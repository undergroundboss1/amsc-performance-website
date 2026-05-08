"""
AMSC Performance Engine
Optional fields: cmj_cm, broad_cm, split_0_60, split_0_80, split_0_100
If missing, those metrics are skipped and returned as None.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Literal, Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime
import pandas as pd

import os
ENGINE_MODE = os.getenv("AMSC_ENGINE_MODE", "local")

from engine.settings import (
    ACCELERATION,
    MAX_VELOCITY,
    TOTAL_100M,
    CMJ,
    BROAD_JUMP,
    SPEED_MAINTENANCE,
    RSI_DOUBLE,
    RSI_SINGLE,
    RSI_ASYMMETRY_THRESHOLD,
)

Gender = Literal["male", "female"]


class Tier(str, Enum):
    DEVELOPING  = "Developing"
    COMPETITIVE = "Competitive"
    ADVANCED    = "Advanced"


class SpeedMaintenance(str, Enum):
    EFFICIENT   = "Efficient"
    MODERATE    = "Moderate Drop-Off"
    SIGNIFICANT = "Significant Drop-Off"


@dataclass
class SpeedMaintenanceThresholds:
    efficient_max_delta: float
    moderate_max_delta:  float


SPEED_MAINT_THRESHOLDS = SpeedMaintenanceThresholds(
    efficient_max_delta=SPEED_MAINTENANCE["efficient_max_delta"],
    moderate_max_delta=SPEED_MAINTENANCE["moderate_max_delta"],
)


# ── Input Validation ───────────────────────────────────────────

def validate_inputs(
    name:        str,
    split_0_20:  float,
    split_0_40:  float,
    split_0_60:  Optional[float],
    split_0_80:  Optional[float],
    split_0_100: Optional[float],
    fly10:       float,
    cmj_cm:      Optional[float],
    broad_cm:    Optional[float],
) -> List[str]:
    errors = []

    present_splits = [
        ("0-20m",  split_0_20),
        ("0-40m",  split_0_40),
    ]
    if split_0_60 is not None:
        present_splits.append(("0-60m", split_0_60))
    if split_0_80 is not None:
        present_splits.append(("0-80m", split_0_80))
    if split_0_100 is not None:
        present_splits.append(("0-100m", split_0_100))

    for i in range(len(present_splits) - 1):
        if present_splits[i][1] >= present_splits[i + 1][1]:
            errors.append(
                f"Split times out of order: {present_splits[i][0]} "
                f"({present_splits[i][1]:.2f}s) >= "
                f"{present_splits[i+1][0]} ({present_splits[i+1][1]:.2f}s)"
            )

    if fly10 <= 0:
        errors.append(f"Fly10 must be a positive number, got {fly10}")

    if cmj_cm is not None and not (20 <= cmj_cm <= 120):
        errors.append(f"CMJ ({cmj_cm}cm) is outside realistic range (20–120cm)")

    if broad_cm is not None and not (100 <= broad_cm <= 400):
        errors.append(f"Broad jump ({broad_cm}cm) is outside realistic range (100–400cm)")

    return errors


# ── Error Logging ──────────────────────────────────────────────

LOG_PATH = Path(__file__).resolve().parent.parent / "data" / "errors_log.txt"


def _write_error_log(errors: List[Dict[str, Any]]):
    """
    Log batch errors.
    - local mode (default): writes to data/errors_log.txt
    - serverless mode:      prints to console only (no filesystem writes)
    """
    if ENGINE_MODE == "serverless":
        print(f"Batch run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{len(errors)} error(s):")
        for err in errors:
            print(f"  Row {err['row']} — {err['name']}: {err['error']}")
        return

    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a") as log:
        log.write(f"\n{'=' * 60}\n")
        log.write(f"Batch run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log.write(f"{len(errors)} error(s):\n")
        for err in errors:
            log.write(f"  Row {err['row']} — {err['name']}: {err['error']}\n")


# ── Gender normalisation ───────────────────────────────────────

def normalize_gender(value: str) -> Optional[str]:
    """
    Normalise raw gender input to 'male' or 'female'.
    Returns None for empty or unrecognised input.
    """
    if not value or not isinstance(value, str):
        return None
    v = value.strip().lower()
    if v in ("m", "male", "man", "men"):
        return "male"
    if v in ("f", "female", "woman", "women"):
        return "female"
    return None


# ── Generic classifiers ────────────────────────────────────────

def _classify_time(gender: Gender, time: float, thresholds: dict) -> Tier:
    """Lower is better (sprint times)."""
    g    = thresholds[gender]
    adv  = g["advanced"]
    comp = g["competitive"]
    if "max" in adv and time <= adv["max"]:
        return Tier.ADVANCED
    if comp.get("min", float("-inf")) <= time <= comp.get("max", float("inf")):
        return Tier.COMPETITIVE
    return Tier.DEVELOPING


def _classify_distance(gender: Gender, value: float, thresholds: dict) -> Tier:
    """Higher is better (jumps)."""
    g    = thresholds[gender]
    adv  = g["advanced"]
    comp = g["competitive"]
    if "min" in adv and value >= adv["min"]:
        return Tier.ADVANCED
    if comp.get("min", float("-inf")) <= value <= comp.get("max", float("inf")):
        return Tier.COMPETITIVE
    return Tier.DEVELOPING


# ── Derived segments ───────────────────────────────────────────

def compute_segments(
    split_0_20:  float,
    split_0_40:  float,
    split_0_60:  Optional[float],
    split_0_80:  Optional[float],
    split_0_100: Optional[float],
) -> Dict[str, Any]:
    seg_20_40 = split_0_40 - split_0_20

    seg_40_60  = split_0_60  - split_0_40  if split_0_60  is not None else None
    seg_60_80  = split_0_80  - split_0_60  if (split_0_80 is not None and split_0_60 is not None) else None
    seg_80_100 = split_0_100 - split_0_80  if (split_0_100 is not None and split_0_80 is not None) else None

    candidates = {k: v for k, v in {
        "20-40m": seg_20_40,
        "40-60m": seg_40_60,
    }.items() if v is not None}

    if candidates:
        peak_zone    = min(candidates, key=candidates.get)
        peak_segment = candidates[peak_zone]
    else:
        peak_zone    = "N/A"
        peak_segment = seg_20_40

    return {
        "20_40":                 seg_20_40,
        "40_60":                 seg_40_60,
        "60_80":                 seg_60_80,
        "80_100":                seg_80_100,
        "peak_velocity_segment": peak_segment,
        "peak_velocity_zone":    peak_zone,
    }


# ── Category classifiers ───────────────────────────────────────

def classify_acceleration(gender: Gender, split_0_20: float) -> Tier:
    return _classify_time(gender, split_0_20, ACCELERATION)


def classify_max_velocity(
    gender:                Gender,
    fly10:                 float,
    peak_velocity_segment: float,
) -> Tier:
    fly10_tier   = _classify_time(gender, fly10,                 MAX_VELOCITY)
    segment_tier = _classify_time(gender, peak_velocity_segment, MAX_VELOCITY)

    if fly10_tier == segment_tier:
        return fly10_tier

    tier_rank = {Tier.DEVELOPING: 1, Tier.COMPETITIVE: 2, Tier.ADVANCED: 3}
    if tier_rank[fly10_tier] >= tier_rank[segment_tier]:
        return fly10_tier

    if fly10_tier == Tier.DEVELOPING and segment_tier in (Tier.COMPETITIVE, Tier.ADVANCED):
        return Tier.COMPETITIVE

    return fly10_tier


def classify_100m(gender: Gender, split_0_100: Optional[float]) -> Optional[Tier]:
    if split_0_100 is None:
        return None
    return _classify_time(gender, split_0_100, TOTAL_100M)


def classify_speed_maintenance(
    peak_segment_time: float,
    seg_80_100:        Optional[float],
    thresholds:        SpeedMaintenanceThresholds = SPEED_MAINT_THRESHOLDS,
) -> Optional[SpeedMaintenance]:
    if seg_80_100 is None:
        return None
    delta = seg_80_100 - peak_segment_time
    if delta <= thresholds.efficient_max_delta:
        return SpeedMaintenance.EFFICIENT
    elif delta <= thresholds.moderate_max_delta:
        return SpeedMaintenance.MODERATE
    return SpeedMaintenance.SIGNIFICANT


def classify_cmj(gender: Gender, cmj_cm: Optional[float]) -> Optional[Tier]:
    if cmj_cm is None:
        return None
    return _classify_distance(gender, cmj_cm, CMJ)


def classify_broad_jump(gender: Gender, broad_cm: Optional[float]) -> Optional[Tier]:
    if broad_cm is None:
        return None
    return _classify_distance(gender, broad_cm, BROAD_JUMP)


# ── RSI classifiers ───────────────────────────────────────────

def classify_rsi_double(gender: Gender, rsi_avg: Optional[float]) -> Optional[Tier]:
    """Classify double-leg RSI. Returns None if data not available."""
    if rsi_avg is None:
        return None
    return _classify_distance(gender, rsi_avg, RSI_DOUBLE)


def classify_rsi_single(gender: Gender, rsi_avg: Optional[float]) -> Optional[Tier]:
    """Classify single-leg RSI. Returns None if data not available."""
    if rsi_avg is None:
        return None
    return _classify_distance(gender, rsi_avg, RSI_SINGLE)


def compute_rsi_asymmetry(
    left_avg:  Optional[float],
    right_avg: Optional[float],
) -> Optional[dict]:
    """
    Compute bilateral asymmetry between left and right single-leg RSI.
    Returns None if either leg's data is missing.
    Returns dict with asymmetry_pct, dominant_side, and flagged (True if >10%).
    """
    if left_avg is None or right_avg is None:
        return None
    higher = max(left_avg, right_avg)
    lower  = min(left_avg, right_avg)
    if higher == 0:
        return None
    asymmetry_pct = round(((higher - lower) / higher) * 100, 1)
    dominant_side = "Left" if left_avg > right_avg else "Right"
    flagged       = asymmetry_pct > (RSI_ASYMMETRY_THRESHOLD * 100)
    return {
        "asymmetry_pct": asymmetry_pct,
        "dominant_side": dominant_side,
        "flagged":       flagged,
    }


def detect_power_profile_type(
    cmj_cat:        Optional[Tier],
    rsi_double_cat: Optional[Tier],
) -> Optional[str]:
    """
    Compare concentric power (CMJ) vs reactive power (RSI) to classify
    the athlete's power profile type.
    Returns None if either metric is missing.
    """
    if cmj_cat is None or rsi_double_cat is None:
        return None
    tier_rank = {Tier.DEVELOPING: 1, Tier.COMPETITIVE: 2, Tier.ADVANCED: 3}
    cmj_rank = tier_rank[cmj_cat]
    rsi_rank = tier_rank[rsi_double_cat]
    if rsi_rank > cmj_rank:
        return "Reactive-Dominant"
    if cmj_rank > rsi_rank:
        return "Strength-Dominant"
    return "Balanced Power Profile"


# ── Power classification ───────────────────────────────────────

def classify_power(
    cmj_cat:        Optional[Tier],
    broad_cat:      Optional[Tier],
    rsi_double_cat: Optional[Tier] = None,
) -> Dict[str, Optional[str]]:
    if cmj_cat is None and broad_cat is None and rsi_double_cat is None:
        return {"power_category": None, "power_level": None}

    cats = [c.value for c in [cmj_cat, broad_cat, rsi_double_cat] if c is not None]
    if "Advanced" in cats:
        return {"power_category": "Advanced", "power_level": "Strong"}
    elif "Competitive" in cats:
        return {"power_category": "Competitive", "power_level": "Moderate"}
    return {"power_category": "Developing", "power_level": "Needs Development"}


# ── Imbalance detection ────────────────────────────────────────

def detect_primary_imbalance(
    accel_cat:          Tier,
    max_vel_cat:        Tier,
    speed_maint_cat:    Optional[SpeedMaintenance],
    cmj_cat:            Optional[Tier],
    broad_cat:          Optional[Tier],
    rsi_asymmetry:      Optional[dict] = None,
    power_profile_type: Optional[str]  = None,
) -> str:
    strong_accel = accel_cat   == Tier.ADVANCED
    weak_accel   = accel_cat   == Tier.DEVELOPING
    strong_maxv  = max_vel_cat == Tier.ADVANCED
    weak_maxv    = max_vel_cat == Tier.DEVELOPING
    strong_power = ((cmj_cat   == Tier.ADVANCED) or (broad_cat == Tier.ADVANCED))
    weak_power   = ((cmj_cat   == Tier.DEVELOPING or cmj_cat is None) and
                    (broad_cat == Tier.DEVELOPING or broad_cat is None))
    poor_maint   = speed_maint_cat == SpeedMaintenance.SIGNIFICANT

    if strong_accel and weak_maxv:
        return "Strong Acceleration / Weak Max Velocity"
    if weak_accel and strong_maxv:
        return "Weak Acceleration / Strong Max Velocity"
    if poor_maint and not (weak_accel and weak_maxv):
        return "Balanced Speed / Poor Speed Maintenance"
    if strong_power and (weak_accel or weak_maxv):
        return "Strong Power / Weak Speed Transfer"
    if weak_power and weak_accel and weak_maxv:
        return "Underdeveloped Power & Speed"

    # RSI-informed imbalances (only fire if RSI data was collected)
    if rsi_asymmetry and rsi_asymmetry["flagged"]:
        return (f"Bilateral Asymmetry — {rsi_asymmetry['dominant_side']} Dominant "
                f"({rsi_asymmetry['asymmetry_pct']}%)")
    if power_profile_type == "Strength-Dominant" and (strong_accel or strong_maxv):
        return "Strong Speed & Strength / Weak Reactive Ability"
    if power_profile_type == "Reactive-Dominant" and weak_power:
        return "Good Reactive Ability / Weak Concentric Power"
    return "Balanced Profile"


# ── Single athlete evaluation ──────────────────────────────────

def evaluate_athlete(
    name:        str,
    gender:      Gender,
    sport:       str,
    date:        str,
    split_0_20:  float,
    split_0_40:  float,
    split_0_60:  Optional[float] = None,
    split_0_80:  Optional[float] = None,
    split_0_100: Optional[float] = None,
    fly10:       float = 0.0,
    cmj_cm:      Optional[float] = None,
    broad_cm:    Optional[float] = None,
    # RSI — all optional; if None the metric is skipped
    rsi_double_avg:           Optional[float] = None,
    rsi_double_best:          Optional[float] = None,
    rsi_double_gct_avg:       Optional[float] = None,
    rsi_single_left_avg:      Optional[float] = None,
    rsi_single_left_best:     Optional[float] = None,
    rsi_single_left_gct_avg:  Optional[float] = None,
    rsi_single_right_avg:     Optional[float] = None,
    rsi_single_right_best:    Optional[float] = None,
    rsi_single_right_gct_avg: Optional[float] = None,
    # Additional passthrough fields — stored in output but not used for classification
    split_0_10:  Optional[float] = None,
    split_0_30:  Optional[float] = None,
    fly20:       Optional[float] = None,
    pro_agility: Optional[float] = None,
) -> Dict[str, Any]:

    validation_errors = validate_inputs(
        name, split_0_20, split_0_40, split_0_60,
        split_0_80, split_0_100, fly10, cmj_cm, broad_cm
    )
    if validation_errors:
        raise ValueError(
            f"Validation failed for {name}: {'; '.join(validation_errors)}"
        )

    segs = compute_segments(split_0_20, split_0_40, split_0_60, split_0_80, split_0_100)

    accel_cat       = classify_acceleration(gender, split_0_20)
    maxv_cat        = classify_max_velocity(gender, fly10, segs["peak_velocity_segment"])
    hundred_cat     = classify_100m(gender, split_0_100)
    speed_maint_cat = classify_speed_maintenance(segs["peak_velocity_segment"], segs["80_100"])
    cmj_cat         = classify_cmj(gender, cmj_cm)
    broad_cat       = classify_broad_jump(gender, broad_cm)

    # RSI classifications
    rsi_double_cat       = classify_rsi_double(gender, rsi_double_avg)
    rsi_single_left_cat  = classify_rsi_single(gender, rsi_single_left_avg)
    rsi_single_right_cat = classify_rsi_single(gender, rsi_single_right_avg)
    rsi_asymmetry        = compute_rsi_asymmetry(rsi_single_left_avg, rsi_single_right_avg)
    power_profile_type   = detect_power_profile_type(cmj_cat, rsi_double_cat)

    power     = classify_power(cmj_cat, broad_cat, rsi_double_cat)
    imbalance = detect_primary_imbalance(
        accel_cat, maxv_cat, speed_maint_cat, cmj_cat, broad_cat,
        rsi_asymmetry, power_profile_type
    )

    missing_fields = []
    if split_0_60  is None: missing_fields.append("60m split")
    if split_0_80  is None: missing_fields.append("80m split")
    if split_0_100 is None: missing_fields.append("100m")
    if cmj_cm      is None: missing_fields.append("CMJ")
    if broad_cm    is None: missing_fields.append("Broad Jump")
    if rsi_double_avg        is None: missing_fields.append("RSI Double")
    if rsi_single_left_avg   is None: missing_fields.append("RSI Single-Left")
    if rsi_single_right_avg  is None: missing_fields.append("RSI Single-Right")

    return {
        "name":   name,
        "gender": gender,
        "sport":  sport,
        "date":   date,
        "0_10":    split_0_10,
        "0_20":    split_0_20,
        "0_30":    split_0_30,
        "0_40":    split_0_40,
        "0_60":    split_0_60,
        "0_80":    split_0_80,
        "0_100":   split_0_100,
        "fly10":   fly10,
        "fly20":   fly20,
        "pro_agility": pro_agility,
        "cmj_cm":  cmj_cm,
        "broad_cm": broad_cm,
        # RSI raw inputs
        "rsi_double_avg":           rsi_double_avg,
        "rsi_double_best":          rsi_double_best,
        "rsi_double_gct_avg":       rsi_double_gct_avg,
        "rsi_single_left_avg":      rsi_single_left_avg,
        "rsi_single_left_best":     rsi_single_left_best,
        "rsi_single_left_gct_avg":  rsi_single_left_gct_avg,
        "rsi_single_right_avg":     rsi_single_right_avg,
        "rsi_single_right_best":    rsi_single_right_best,
        "rsi_single_right_gct_avg": rsi_single_right_gct_avg,
        "20_40":                 segs["20_40"],
        "40_60":                 segs["40_60"],
        "60_80":                 segs["60_80"],
        "80_100":                segs["80_100"],
        "peak_velocity_segment": segs["peak_velocity_segment"],
        "peak_velocity_zone":    segs["peak_velocity_zone"],
        "acceleration_category":      accel_cat.value,
        "max_velocity_category":      maxv_cat.value,
        "hundred_category":           hundred_cat.value if hundred_cat else None,
        "speed_maintenance_category": speed_maint_cat.value if speed_maint_cat else None,
        "cmj_category":               cmj_cat.value if cmj_cat else None,
        "broad_jump_category":        broad_cat.value if broad_cat else None,
        # RSI classifications
        "rsi_double_category":       rsi_double_cat.value if rsi_double_cat else None,
        "rsi_single_left_category":  rsi_single_left_cat.value if rsi_single_left_cat else None,
        "rsi_single_right_category": rsi_single_right_cat.value if rsi_single_right_cat else None,
        "rsi_asymmetry_pct":    rsi_asymmetry["asymmetry_pct"] if rsi_asymmetry else None,
        "rsi_dominant_side":    rsi_asymmetry["dominant_side"] if rsi_asymmetry else None,
        "rsi_asymmetry_flag":   rsi_asymmetry["flagged"]       if rsi_asymmetry else None,
        "power_profile_type":   power_profile_type,
        "power_category": power["power_category"],
        "power_level":    power["power_level"],
        "primary_imbalance_flag": imbalance,
        "missing_fields":         ", ".join(missing_fields) if missing_fields else None,
    }


# ── Batch evaluation ───────────────────────────────────────────

def evaluate_batch(df: pd.DataFrame) -> tuple:
    """
    Returns (results, errors).
    results: list of dicts from evaluate_athlete()
    errors:  list of dicts with keys 'row', 'name', 'error'
    """
    results = []
    errors  = []

    def _opt(row, key):
        val = row.get(key)
        return float(val) if (val is not None and pd.notna(val)) else None

    for idx, row in df.iterrows():
        try:
            result = evaluate_athlete(
                name        = str(row["name"]),
                gender      = str(row["gender"]).lower().strip(),
                sport       = str(row["sport"]),
                date        = str(row.get("date", "")),
                split_0_10  = _opt(row, "split_0_10"),
                split_0_20  = float(row["split_0_20"]),
                split_0_30  = _opt(row, "split_0_30"),
                split_0_40  = float(row["split_0_40"]),
                split_0_60  = _opt(row, "split_0_60"),
                split_0_80  = _opt(row, "split_0_80"),
                split_0_100 = _opt(row, "split_0_100"),
                fly10       = float(row["fly10"]),
                fly20       = _opt(row, "fly20"),
                pro_agility = _opt(row, "pro_agility"),
                cmj_cm      = _opt(row, "cmj_cm"),
                broad_cm    = _opt(row, "broad_cm"),
                rsi_double_avg           = _opt(row, "rsi_double_avg"),
                rsi_double_best          = _opt(row, "rsi_double_best"),
                rsi_double_gct_avg       = _opt(row, "rsi_double_gct_avg"),
                rsi_single_left_avg      = _opt(row, "rsi_single_left_avg"),
                rsi_single_left_best     = _opt(row, "rsi_single_left_best"),
                rsi_single_left_gct_avg  = _opt(row, "rsi_single_left_gct_avg"),
                rsi_single_right_avg     = _opt(row, "rsi_single_right_avg"),
                rsi_single_right_best    = _opt(row, "rsi_single_right_best"),
                rsi_single_right_gct_avg = _opt(row, "rsi_single_right_gct_avg"),
            )
            results.append(result)
        except Exception as e:
            errors.append({
                "row":   idx,
                "name":  row.get("name", "unknown"),
                "error": str(e),
            })

    if errors:
        print(f"\n  Batch completed with {len(errors)} error(s):")
        for err in errors:
            print(f"    Row {err['row']} — {err['name']}: {err['error']}")
        _write_error_log(errors)

    return results, errors


# ── Batch to DataFrame ─────────────────────────────────────────

def batch_to_dataframe(results: List[Dict[str, Any]]) -> pd.DataFrame:
    column_order = [
        "name", "gender", "sport", "date",
        "0_10", "0_20", "0_30", "0_40", "0_60", "0_80", "0_100",
        "fly10", "fly20", "pro_agility", "cmj_cm", "broad_cm",
        # RSI raw
        "rsi_double_avg", "rsi_double_best", "rsi_double_gct_avg",
        "rsi_single_left_avg", "rsi_single_left_best", "rsi_single_left_gct_avg",
        "rsi_single_right_avg", "rsi_single_right_best", "rsi_single_right_gct_avg",
        "20_40", "40_60", "60_80", "80_100",
        "peak_velocity_segment", "peak_velocity_zone",
        "acceleration_category", "max_velocity_category",
        "hundred_category", "speed_maintenance_category",
        "cmj_category", "broad_jump_category",
        # RSI classifications
        "rsi_double_category",
        "rsi_single_left_category", "rsi_single_right_category",
        "rsi_asymmetry_pct", "rsi_dominant_side", "rsi_asymmetry_flag",
        "power_profile_type",
        "power_category", "power_level",
        "primary_imbalance_flag", "missing_fields",
    ]

    df = pd.DataFrame(results)

    time_cols = ["0_10","0_20","0_30","0_40","0_60","0_80","0_100",
                 "fly10","fly20","pro_agility","20_40","40_60","60_80","80_100",
                 "peak_velocity_segment"]
    jump_cols = ["cmj_cm", "broad_cm"]
    rsi_cols  = [
        "rsi_double_avg", "rsi_double_best", "rsi_double_gct_avg",
        "rsi_single_left_avg", "rsi_single_left_best", "rsi_single_left_gct_avg",
        "rsi_single_right_avg", "rsi_single_right_best", "rsi_single_right_gct_avg",
        "rsi_asymmetry_pct",
    ]

    for col in time_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(2)
    for col in jump_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(0)
    for col in rsi_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(3)

    return df[[c for c in column_order if c in df.columns]]