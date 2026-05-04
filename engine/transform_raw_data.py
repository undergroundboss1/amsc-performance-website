"""
Transforms the AMSC Combine Data Template (.xlsx) into the format
expected by the performance engine.

Expected template structure:
  Sheet 1 — "Sprint Data": two-row header (rows 5-6), data from row 7
  Sheet 2 — "Jump Data":   single header row (row 4), data from row 5

Column layout (Sprint Data) — read by position, not name:
  Col 0:  Athlete Name
  Col 1:  Age
  Col 2:  Gender
  Col 3:  Sport / Position
  Col 4-7:   10m  A1, A2, A3, Best
  Col 8-11:  20m  A1, A2, A3, Best
  Col 12-15: 30m  A1, A2, A3, Best
  Col 16-19: 40m  A1, A2, A3, Best
  Col 20-23: Fly10 A1, A2, A3, Best
  Col 24-27: Fly20 A1, A2, A3, Best
  Col 28-31: 100m  A1, A2, A3, Best
  Col 32-35: Pro Agility A1, A2, A3, Best
  Col 36:    Notes
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Union, Optional


# ── Supabase (optional) ────────────────────────────────────────

def _get_supabase():
    try:
        from supabase import create_client
        from dotenv import load_dotenv
        import os
        load_dotenv()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if url and key:
            return create_client(url, key)
    except Exception:
        pass
    return None


# ── Helpers ────────────────────────────────────────────────────

def _safe_float(val) -> Optional[float]:
    """Convert a value to float, returning None for blanks/zeros/errors."""
    if val is None:
        return None
    try:
        if isinstance(val, str) and val.strip() == "":
            return None
        f = float(val)
        if pd.isna(f) or f <= 0:
            return None
        return f
    except (ValueError, TypeError):
        return None


def _best_of(*vals) -> Optional[float]:
    """Return the minimum (best) of any valid float values provided."""
    valid = [v for v in (_safe_float(v) for v in vals) if v is not None]
    return min(valid) if valid else None


def _best_jump(*vals) -> Optional[float]:
    """Return the maximum (best) of any valid jump distances provided."""
    valid = [v for v in (_safe_float(v) for v in vals) if v is not None]
    return max(valid) if valid else None


# ── Sprint Data reader ─────────────────────────────────────────

# Sprint Data has a two-row merged header (rows 5-6 in Excel).
# We read with header=None and skip the first 6 rows (rows 1-6),
# so data starts at row 7 as intended.
SPRINT_SKIPROWS = 6

# Column index map — based on confirmed template structure
SPRINT_COLS = {
    "name":       0,
    "age":        1,
    "gender":     2,
    "sport":      3,
    # 10m
    "m10_a1":     4,  "m10_a2":  5,  "m10_a3":  6,  "m10_best":  7,
    # 20m
    "m20_a1":     8,  "m20_a2":  9,  "m20_a3": 10,  "m20_best": 11,
    # 30m
    "m30_a1":    12,  "m30_a2": 13,  "m30_a3": 14,  "m30_best": 15,
    # 40m
    "m40_a1":    16,  "m40_a2": 17,  "m40_a3": 18,  "m40_best": 19,
    # Flying 10m
    "fly10_a1":  20,  "fly10_a2": 21, "fly10_a3": 22, "fly10_best": 23,
    # Flying 20m
    "fly20_a1":  24,  "fly20_a2": 25, "fly20_a3": 26, "fly20_best": 27,
    # 100m
    "m100_a1":   28,  "m100_a2": 29,  "m100_a3": 30,  "m100_best": 31,
    # Pro Agility
    "pag_a1":    32,  "pag_a2":  33,  "pag_a3":  34,  "pag_best":  35,
    # Notes
    "notes":     36,
}


def _read_sprint_sheet(file) -> pd.DataFrame:
    """
    Read the Sprint Data sheet from the template.
    Returns a raw DataFrame with positional columns renamed to SPRINT_COLS keys.
    """
    df = pd.read_excel(
        file,
        sheet_name="Sprint Data",
        header=None,
        skiprows=SPRINT_SKIPROWS,
        engine="openpyxl",
    )

    # Drop completely empty rows
    df = df.dropna(how="all").reset_index(drop=True)

    # Rename columns we care about
    rename = {v: k for k, v in SPRINT_COLS.items() if v < len(df.columns)}
    df = df.rename(columns=rename)

    return df


# ── Jump Data reader ───────────────────────────────────────────

# Jump Data has a single header row at row 4 in Excel.
# Row 3 (0-indexed) contains the section group labels — skip rows 0-3.
JUMP_SKIPROWS = 3

JUMP_COLS = {
    "name":        0,
    "gender":      1,
    "cmj_a1":      2,
    "cmj_a2":      3,
    "cmj_a3":      4,
    "cmj_best":    5,
    "broad_a1":    6,
    "broad_a2":    7,
    "broad_a3":    8,
    "broad_best":  9,
    "pro_agility": 10,
    "notes":       11,
    "date":        12,
}


def _read_jump_sheet(file) -> pd.DataFrame:
    """
    Read the Jump Data sheet from the template.
    Returns a raw DataFrame with positional columns renamed to JUMP_COLS keys.
    """
    df = pd.read_excel(
        file,
        sheet_name="Jump Data",
        header=None,
        skiprows=JUMP_SKIPROWS,
        engine="openpyxl",
    )

    df = df.dropna(how="all").reset_index(drop=True)

    rename = {v: k for k, v in JUMP_COLS.items() if v < len(df.columns)}
    df = df.rename(columns=rename)

    return df


# ── RSI Data reader ───────────────────────────────────────────
# RSI sheet: two-row header (rows 3-4 in Excel), data from row 5.
# Each athlete has 12 summary values — 4 per leg (DL, SL Left, SL Right):
#   Avg RSI, Avg GCT (s), Max RSI, Max GCT (s)
#
# Column layout (0-indexed):
#   0         = Athlete Name
#   1-4       = Double-Leg:       Avg RSI, Avg GCT, Max RSI, Max GCT
#   5-8       = Single-Leg Left:  Avg RSI, Avg GCT, Max RSI, Max GCT
#   9-12      = Single-Leg Right: Avg RSI, Avg GCT, Max RSI, Max GCT

RSI_SKIPROWS = 3   # skip rows 1 (title), 2 (instructions), 3 (group headers)

RSI_COLS = {
    "name":                   0,
    # Double-leg
    "rsi_double_avg":         1,
    "rsi_double_gct_avg":     2,
    "rsi_double_best":        3,
    "rsi_double_max_gct":     4,
    # Single-leg left
    "rsi_single_left_avg":    5,
    "rsi_single_left_gct_avg": 6,
    "rsi_single_left_best":   7,
    "rsi_single_left_max_gct": 8,
    # Single-leg right
    "rsi_single_right_avg":   9,
    "rsi_single_right_gct_avg": 10,
    "rsi_single_right_best":  11,
    "rsi_single_right_max_gct": 12,
}


def _read_rsi_sheet(file) -> Optional[pd.DataFrame]:
    """
    Read the RSI Data sheet from the template.
    Returns None if the sheet doesn't exist — RSI is fully optional.
    """
    try:
        df = pd.read_excel(
            file,
            sheet_name="RSI Data",
            header=None,
            skiprows=RSI_SKIPROWS,
            engine="openpyxl",
        )
        df = df.dropna(how="all").reset_index(drop=True)
        rename = {v: k for k, v in RSI_COLS.items() if v < len(df.columns)}
        df = df.rename(columns=rename)
        return df
    except Exception:
        return None


def _transform_rsi_row(row: pd.Series) -> dict:
    """
    Transform one RSI summary row into engine-ready fields.
    Values come in directly — no per-hop calculation needed.
    Returns all RSI fields keyed by normalised athlete name.
    """
    name = str(row.get("name", "")).strip().lower()

    return {
        "name_key":                 name,
        "rsi_double_avg":           _safe_float(row.get("rsi_double_avg")),
        "rsi_double_best":          _safe_float(row.get("rsi_double_best")),
        "rsi_double_gct_avg":       _safe_float(row.get("rsi_double_gct_avg")),
        "rsi_single_left_avg":      _safe_float(row.get("rsi_single_left_avg")),
        "rsi_single_left_best":     _safe_float(row.get("rsi_single_left_best")),
        "rsi_single_left_gct_avg":  _safe_float(row.get("rsi_single_left_gct_avg")),
        "rsi_single_right_avg":     _safe_float(row.get("rsi_single_right_avg")),
        "rsi_single_right_best":    _safe_float(row.get("rsi_single_right_best")),
        "rsi_single_right_gct_avg": _safe_float(row.get("rsi_single_right_gct_avg")),
    }


# ── Row transformers ───────────────────────────────────────────

def _transform_sprint_row(row: pd.Series) -> dict:
    """
    Transform one sprint data row into engine-ready fields.
    Picks the best attempt across A1/A2/A3, falling back to the
    template's pre-calculated Best column if attempts are blank.
    Returns a dict with a '_warnings' key for any data issues.
    """
    warnings = []

    name   = str(row.get("name", "")).strip()
    gender = str(row.get("gender", "")).strip().lower()
    sport  = str(row.get("sport", "")).strip()
    age    = row.get("age", "")
    notes  = str(row.get("notes", "")) if pd.notna(row.get("notes")) else ""

    # ── Sprint bests ───────────────────────────────────────────
    # Prefer computed best from attempts; fall back to template's Best column
    m20 = (
        _best_of(row.get("m20_a1"), row.get("m20_a2"), row.get("m20_a3"))
        or _safe_float(row.get("m20_best"))
    )
    m40 = (
        _best_of(row.get("m40_a1"), row.get("m40_a2"), row.get("m40_a3"))
        or _safe_float(row.get("m40_best"))
    )
    fly10 = (
        _best_of(row.get("fly10_a1"), row.get("fly10_a2"), row.get("fly10_a3"))
        or _safe_float(row.get("fly10_best"))
    )
    m100 = (
        _best_of(row.get("m100_a1"), row.get("m100_a2"), row.get("m100_a3"))
        or _safe_float(row.get("m100_best"))
    )

    # ── Derived splits ─────────────────────────────────────────
    # 60m and 80m are not directly measured — interpolate from 40m + 100m
    if m40 and m100:
        gap = m100 - m40
        split_0_60 = round(m40 + gap * 0.33, 3)
        split_0_80 = round(m40 + gap * 0.67, 3)
    else:
        split_0_60 = None
        split_0_80 = None
        if not m100:
            warnings.append("No 100m data — 60m and 80m splits cannot be calculated")

    # ── Flag missing required fields ───────────────────────────
    if not m20:
        warnings.append("No 20m data found")
    if not m40:
        warnings.append("No 40m data found")
    if not fly10:
        warnings.append("No Flying 10m data found")
    if not m100:
        warnings.append("No 100m data — 100m fields will show N/A in report")

    return {
        # Identity
        "name":        name,
        "gender":      gender,
        "sport":       sport,
        "age":         age,
        "notes":       notes,

        # Engine-ready splits
        "split_0_20":  m20,
        "split_0_40":  m40,
        "split_0_60":  split_0_60,
        "split_0_80":  split_0_80,
        "split_0_100": m100,
        "fly10":       fly10,

        # Jump fields — filled in later by merge
        "cmj_cm":      None,
        "broad_cm":    None,

        "_warnings": warnings,
    }


def _transform_jump_row(row: pd.Series) -> dict:
    """
    Transform one jump data row into engine-ready fields.
    Returns cmj_cm and broad_cm keyed by normalised athlete name.
    """
    name = str(row.get("name", "")).strip().lower()

    cmj = (
        _best_jump(row.get("cmj_a1"), row.get("cmj_a2"), row.get("cmj_a3"))
        or _safe_float(row.get("cmj_best"))
    )
    broad = (
        _best_jump(row.get("broad_a1"), row.get("broad_a2"), row.get("broad_a3"))
        or _safe_float(row.get("broad_best"))
    )

    return {
        "name_key": name,
        "cmj_cm":   cmj,
        "broad_cm": broad,
    }


# ── Supabase storage ───────────────────────────────────────────

def _store_raw_session(row: pd.Series, supabase) -> None:
    """Store a single raw sprint row in Supabase raw_sessions table."""
    if not supabase:
        return

    def safe(key, cast=float):
        try:
            val = row.get(key)
            if val is not None and pd.notna(val):
                return cast(val)
        except (ValueError, TypeError):
            pass
        return None

    data = {
        "athlete_name": str(row.get("name", "")),
        "age":          safe("age", int),
        "gender":       str(row.get("gender", "")),
        "sport":        str(row.get("sport", "")),
        "m10_a1":  safe("m10_a1"),  "m10_a2":  safe("m10_a2"),
        "m10_a3":  safe("m10_a3"),  "m10_best": safe("m10_best"),
        "m20_a1":  safe("m20_a1"),  "m20_a2":  safe("m20_a2"),
        "m20_a3":  safe("m20_a3"),  "m20_best": safe("m20_best"),
        "m30_a1":  safe("m30_a1"),  "m30_a2":  safe("m30_a2"),
        "m30_a3":  safe("m30_a3"),  "m30_best": safe("m30_best"),
        "m40_a1":  safe("m40_a1"),  "m40_a2":  safe("m40_a2"),
        "m40_a3":  safe("m40_a3"),  "m40_best": safe("m40_best"),
        "fly10_a1": safe("fly10_a1"), "fly10_a2": safe("fly10_a2"),
        "fly10_a3": safe("fly10_a3"), "fly10_best": safe("fly10_best"),
        "fly20_a1": safe("fly20_a1"), "fly20_a2": safe("fly20_a2"),
        "fly20_a3": safe("fly20_a3"), "fly20_best": safe("fly20_best"),
        "m100_a1": safe("m100_a1"),  "m100_a2": safe("m100_a2"),
        "m100_a3": safe("m100_a3"),  "m100_best": safe("m100_best"),
        "notes":   str(row.get("notes", "")) if pd.notna(row.get("notes")) else None,
    }

    try:
        supabase.table("raw_sessions").insert(data).execute()
    except Exception as e:
        print(f"Supabase insert failed for {row.get('name', '?')}: {e}")


# ── Main entry points ──────────────────────────────────────────

def process_template(file) -> pd.DataFrame:
    """
    Full pipeline for the AMSC Combine Template (.xlsx):
      1. Read Sprint Data sheet
      2. Read Jump Data sheet
      3. Transform each sprint row into engine-ready format
      4. Merge jump data on athlete name
      5. Store raw sprint data in Supabase (if connected)
      6. Return engine-ready DataFrame

    Warnings are attached as df.attrs['warnings'].

    Args:
        file: file path (str/Path) or file-like object (e.g. Streamlit UploadedFile)
    """
    supabase = _get_supabase()
    all_warnings = []

    # ── Read sheets ────────────────────────────────────────────
    sprint_raw = _read_sprint_sheet(file)

    if hasattr(file, "seek"):
        file.seek(0)
    jump_raw = _read_jump_sheet(file)

    # RSI sheet is optional — returns None if sheet doesn't exist
    if hasattr(file, "seek"):
        file.seek(0)
    rsi_raw = _read_rsi_sheet(file)

    # ── Transform jump rows into a lookup dict ─────────────────
    jump_lookup = {}
    for _, jrow in jump_raw.iterrows():
        j = _transform_jump_row(jrow)
        if j["name_key"]:
            jump_lookup[j["name_key"]] = j

    # ── Transform RSI rows into a lookup dict ──────────────────
    rsi_lookup = {}
    if rsi_raw is not None:
        for _, rrow in rsi_raw.iterrows():
            r = _transform_rsi_row(rrow)
            if r["name_key"]:
                rsi_lookup[r["name_key"]] = r

    # ── Transform sprint rows ──────────────────────────────────
    transformed = []

    for i, row in sprint_raw.iterrows():
        name = str(row.get("name", "")).strip()

        # Skip empty rows, header remnants, and the template legend row
        if not name or name.lower() in ("athlete name*", "nan", "", "legend"):
            continue

        # Store raw data in Supabase
        _store_raw_session(row, supabase)

        # Transform sprint row
        result = _transform_sprint_row(row)

        # Collect per-athlete warnings
        for w in result.pop("_warnings", []):
            all_warnings.append(f"{name}: {w}")

        # Merge jump data if available
        name_key = name.lower()
        if name_key in jump_lookup:
            result["cmj_cm"]   = jump_lookup[name_key]["cmj_cm"]
            result["broad_cm"] = jump_lookup[name_key]["broad_cm"]
        else:
            all_warnings.append(f"{name}: No jump data found — CMJ and Broad Jump will show N/A")

        # Merge RSI data if available (fully optional)
        if name_key in rsi_lookup:
            rsi = rsi_lookup[name_key]
            result["rsi_double_avg"]          = rsi["rsi_double_avg"]
            result["rsi_double_best"]         = rsi["rsi_double_best"]
            result["rsi_double_gct_avg"]      = rsi["rsi_double_gct_avg"]
            result["rsi_single_left_avg"]     = rsi["rsi_single_left_avg"]
            result["rsi_single_left_best"]    = rsi["rsi_single_left_best"]
            result["rsi_single_left_gct_avg"] = rsi["rsi_single_left_gct_avg"]
            result["rsi_single_right_avg"]    = rsi["rsi_single_right_avg"]
            result["rsi_single_right_best"]   = rsi["rsi_single_right_best"]
            result["rsi_single_right_gct_avg"]= rsi["rsi_single_right_gct_avg"]
        else:
            # RSI fields default to None — no warning, RSI is optional
            for field in [
                "rsi_double_avg", "rsi_double_best", "rsi_double_gct_avg",
                "rsi_single_left_avg", "rsi_single_left_best", "rsi_single_left_gct_avg",
                "rsi_single_right_avg", "rsi_single_right_best", "rsi_single_right_gct_avg",
            ]:
                result[field] = None

        transformed.append(result)

    result_df = pd.DataFrame(transformed)
    result_df.attrs["warnings"] = all_warnings

    return result_df


def process_uploaded_file(df: pd.DataFrame) -> pd.DataFrame:
    """
    Legacy entry point — kept for backward compatibility.
    Accepts a pre-read DataFrame (e.g. from an old CSV upload).

    For template uploads use process_template() instead.
    Normalises column names and passes through to the engine.
    """
    df = df.copy()
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    return df


def merge_jump_data(sprint_df: pd.DataFrame, jump_df: pd.DataFrame) -> pd.DataFrame:
    """
    Legacy entry point — kept for backward compatibility with the old
    two-file upload flow. Merges CMJ and Broad Jump data into the
    sprint DataFrame on athlete name (case-insensitive).
    """
    jump_df = jump_df.copy()
    jump_df.columns = jump_df.columns.str.strip().str.lower().str.replace(" ", "_")

    sprint_df = sprint_df.copy()
    sprint_df["_name_key"] = sprint_df["name"].str.lower().str.strip()

    cmj_col   = next((c for c in jump_df.columns if "cmj" in c), None)
    broad_col = next((c for c in jump_df.columns if "broad" in c), None)
    name_col  = next((c for c in jump_df.columns if "name" in c), None)

    if not name_col:
        return sprint_df.drop(columns=["_name_key"])

    jump_df["_name_key"] = jump_df[name_col].str.lower().str.strip()

    for i, row in sprint_df.iterrows():
        match = jump_df[jump_df["_name_key"] == row["_name_key"]]
        if not match.empty:
            if cmj_col:
                sprint_df.at[i, "cmj_cm"]   = float(match.iloc[0][cmj_col])
            if broad_col:
                sprint_df.at[i, "broad_cm"] = float(match.iloc[0][broad_col])

    return sprint_df.drop(columns=["_name_key"])