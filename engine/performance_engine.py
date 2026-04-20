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


# ── Power classification ───────────────────────────────────────

def classify_power(
    cmj_cat:   Optional[Tier],
    broad_cat: Optional[Tier],
) -> Dict[str, Optional[str]]:
    if cmj_cat is None and broad_cat is None:
        return {"power_category": None, "power_level": None}

    cats = [c.value for c in [cmj_cat, broad_cat] if c is not None]
    if "Advanced" in cats:
        return {"power_category": "Advanced", "power_level": "Strong"}
    elif "Competitive" in cats:
        return {"power_category": "Competitive", "power_level": "Moderate"}
    return {"power_category": "Developing", "power_level": "Needs Development"}


# ── Imbalance detection ────────────────────────────────────────

def detect_primary_imbalance(
    accel_cat:       Tier,
    max_vel_cat:     Tier,
    speed_maint_cat: Optional[SpeedMaintenance],
    cmj_cat:         Optional[Tier],
    broad_cat:       Optional[Tier],
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
    power           = classify_power(cmj_cat, broad_cat)
    imbalance       = detect_primary_imbalance(
        accel_cat, maxv_cat, speed_maint_cat, cmj_cat, broad_cat
    )

    missing_fields = []
    if split_0_60  is None: missing_fields.append("60m split")
    if split_0_80  is None: missing_fields.append("80m split")
    if split_0_100 is None: missing_fields.append("100m")
    if cmj_cm      is None: missing_fields.append("CMJ")
    if broad_cm    is None: missing_fields.append("Broad Jump")

    return {
        "name":   name,
        "gender": gender,
        "sport":  sport,
        "date":   date,
        "0_20":    split_0_20,
        "0_40":    split_0_40,
        "0_60":    split_0_60,
        "0_80":    split_0_80,
        "0_100":   split_0_100,
        "fly10":   fly10,
        "cmj_cm":  cmj_cm,
        "broad_cm": broad_cm,
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

    for idx, row in df.iterrows():
        try:
            result = evaluate_athlete(
                name        = str(row["name"]),
                gender      = str(row["gender"]).lower().strip(),
                sport       = str(row["sport"]),
                date        = str(row.get("date", "")),
                split_0_20  = float(row["split_0_20"]),
                split_0_40  = float(row["split_0_40"]),
                split_0_60  = float(row["split_0_60"])  if pd.notna(row.get("split_0_60"))  else None,
                split_0_80  = float(row["split_0_80"])  if pd.notna(row.get("split_0_80"))  else None,
                split_0_100 = float(row["split_0_100"]) if pd.notna(row.get("split_0_100")) else None,
                fly10       = float(row["fly10"]),
                cmj_cm      = float(row["cmj_cm"])   if pd.notna(row.get("cmj_cm"))   else None,
                broad_cm    = float(row["broad_cm"]) if pd.notna(row.get("broad_cm")) else None,
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
        "0_20", "0_40", "0_60", "0_80", "0_100",
        "fly10", "cmj_cm", "broad_cm",
        "20_40", "40_60", "60_80", "80_100",
        "peak_velocity_segment", "peak_velocity_zone",
        "acceleration_category", "max_velocity_category",
        "hundred_category", "speed_maintenance_category",
        "cmj_category", "broad_jump_category",
        "power_category", "power_level",
        "primary_imbalance_flag", "missing_fields",
    ]

    df = pd.DataFrame(results)

    time_cols = ["0_20","0_40","0_60","0_80","0_100",
                 "fly10","20_40","40_60","60_80","80_100",
                 "peak_velocity_segment"]
    jump_cols = ["cmj_cm", "broad_cm"]

    for col in time_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(2)
    for col in jump_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(0)

    return df[[c for c in column_order if c in df.columns]]