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
# Structure: by gender → advanced (time: max = upper bound; distance: min = lower bound), competitive (min/max range)

ACCELERATION = {
    "male": {
        "advanced":    {"max": 3.00},
        "competitive": {"min": 3.00, "max": 3.50},
    },
    "female": {
        "advanced":    {"max": 3.40},
        "competitive": {"min": 3.40, "max": 3.90},
    },
}

MAX_VELOCITY = {
    "male": {
        "advanced":    {"max": 0.95},
        "competitive": {"min": 0.95, "max": 1.10},
    },
    "female": {
        "advanced":    {"max": 1.05},
        "competitive": {"min": 1.05, "max": 1.22},
    },
}

TOTAL_100M = {
    "male": {
        "advanced":    {"max": 11.00},
        "competitive": {"min": 11.00, "max": 12.50},
    },
    "female": {
        "advanced":    {"max": 12.50},
        "competitive": {"min": 12.50, "max": 14.00},
    },
}

CMJ = {
    "male": {
        "advanced":    {"min": 50},
        "competitive": {"min": 40, "max": 50},
    },
    "female": {
        "advanced":    {"min": 40},
        "competitive": {"min": 32, "max": 40},
    },
}

BROAD_JUMP = {
    "male": {
        "advanced":    {"min": 250},
        "competitive": {"min": 220, "max": 250},
    },
    "female": {
        "advanced":    {"min": 200},
        "competitive": {"min": 175, "max": 200},
    },
}

SPEED_MAINTENANCE = {
    "efficient_max_delta":  0.15,
    "moderate_max_delta":   0.35,
}
