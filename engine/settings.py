"""
Central settings for AMSC Performance Reporting System.
Paths are relative to project root. Thresholds define Advanced/Competitive/Developing bands.
"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

PATHS = {
    "input_csv":    PROJECT_ROOT / "engine" / "data" / "athletes_input.csv",
    "output_csv":   PROJECT_ROOT / "engine" / "data" / "athletes_output.csv",
    "output_xlsx":  PROJECT_ROOT / "engine" / "data" / "master_spreadsheet.xlsx",
    "reports_dir":  PROJECT_ROOT / "engine" / "reports",
    "logo_path":    PROJECT_ROOT / "engine" / "assets" / "amsc_logo_clean.png",
    "error_log":    PROJECT_ROOT / "engine" / "data" / "errors_log.txt",
}

BRAND = {
    "org_name":      "AMSC Combine",
    "edition":       "Performance Report",
    "report_footer": "AMSC Combine - Performance Report | Confidential",
    "font":          "Helvetica",
    "font_bold":     "Helvetica-Bold",
    "primary":       "#C41E3A",   
    "accent":        "#C41E3A",  
    "text":          "#000000",  
    "light":         "#FFFFFF",   
}

# Classification thresholds (time in s, distance in cm)
# 4-tier system: Advanced / Competitive / Developing / Sub-Standard
# Structure: advanced (time: max; distance: min), competitive/developing (min/max range)
# Anything outside all three bands → Sub-Standard (worst tier)

ACCELERATION = {
    "male": {
        "advanced":    {"max": 3.00},
        "competitive": {"min": 3.00, "max": 3.50},
        "developing":  {"min": 3.50, "max": 4.00},
        # > 4.00s → Sub-Standard
    },
    "female": {
        "advanced":    {"max": 3.40},
        "competitive": {"min": 3.40, "max": 3.90},
        "developing":  {"min": 3.90, "max": 4.50},
        # > 4.50s → Sub-Standard
    },
}

MAX_VELOCITY = {
    "male": {
        "advanced":    {"max": 0.95},
        "competitive": {"min": 0.95, "max": 1.10},
        "developing":  {"min": 1.10, "max": 1.40},
        # > 1.40s → Sub-Standard
    },
    "female": {
        "advanced":    {"max": 1.05},
        "competitive": {"min": 1.05, "max": 1.22},
        "developing":  {"min": 1.22, "max": 1.60},
        # > 1.60s → Sub-Standard
    },
}

TOTAL_100M = {
    "male": {
        "advanced":    {"max": 11.00},
        "competitive": {"min": 11.00, "max": 12.50},
        "developing":  {"min": 12.50, "max": 14.00},
        # > 14.00s → Sub-Standard
    },
    "female": {
        "advanced":    {"max": 12.50},
        "competitive": {"min": 12.50, "max": 14.00},
        "developing":  {"min": 14.00, "max": 15.50},
        # > 15.50s → Sub-Standard
    },
}

# CMJ thresholds in cm — displayed as inches in reports (÷ 2.54)
# Male:   26in=66cm / 23in=58cm / 20in=51cm (user-specified)
# Female: 22in=56cm / 19in=48cm / 16in=41cm (research-derived; 3in gender gap per tier)
CMJ = {
    "male": {
        "advanced":    {"min": 66},
        "competitive": {"min": 58, "max": 66},
        "developing":  {"min": 51, "max": 58},
        # < 51cm (20in) → Sub-Standard
    },
    "female": {
        "advanced":    {"min": 56},
        "competitive": {"min": 48, "max": 56},
        "developing":  {"min": 41, "max": 48},
        # < 41cm (16in) → Sub-Standard
    },
}

BROAD_JUMP = {
    "male": {
        "advanced":    {"min": 250},
        "competitive": {"min": 220, "max": 250},
        "developing":  {"min": 195, "max": 220},
        # < 195cm → Sub-Standard
    },
    "female": {
        "advanced":    {"min": 200},
        "competitive": {"min": 175, "max": 200},
        "developing":  {"min": 155, "max": 175},
        # < 155cm → Sub-Standard
    },
}

SPEED_MAINTENANCE = {
    "efficient_max_delta":  0.15,
    "moderate_max_delta":   0.35,
}

# ── RSI thresholds ─────────────────────────────────────────────
# Reactive Strength Index = Jump Height (m) / Ground Contact Time (s)
# Higher is better — same structure as jump thresholds (min = lower bound)
# Sources: Flanagan & Comyns (2008), NSCA normative data for team sport athletes

RSI_DOUBLE = {
    "male": {
        "advanced":    {"min": 2.60},
        "competitive": {"min": 2.00, "max": 2.60},
        "developing":  {"min": 1.50, "max": 2.00},
        # < 1.50 → Sub-Standard (minimal reactive capacity)
    },
    "female": {
        "advanced":    {"min": 2.20},
        "competitive": {"min": 1.60, "max": 2.20},
        "developing":  {"min": 1.20, "max": 1.60},
        # < 1.20 → Sub-Standard
    },
}

RSI_SINGLE = {
    "male": {
        "advanced":    {"min": 2.00},
        "competitive": {"min": 1.50, "max": 2.00},
        "developing":  {"min": 1.00, "max": 1.50},
        # < 1.00 → Sub-Standard
    },
    "female": {
        "advanced":    {"min": 1.70},
        "competitive": {"min": 1.20, "max": 1.70},
        "developing":  {"min": 0.80, "max": 1.20},
        # < 0.80 → Sub-Standard
    },
}

# Flag bilateral asymmetry if left/right difference exceeds this percentage
RSI_ASYMMETRY_THRESHOLD = 0.10   # 10% — widely used in sports science literature
