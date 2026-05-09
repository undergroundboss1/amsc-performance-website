"""
Vercel Python Serverless Function — PDF Report Generator
POST /api/generate-report

Receives an athlete data dict (mirroring athlete_results Supabase row),
generates a PDF report in memory using the AMSC engine, and returns it
as a base64-encoded string.

Field name mapping: Supabase uses split_0_20, seg_20_40, athlete_name etc.
The PDF engine expects 0_20, 20_40, name etc. — mapping is done here.
"""

import os
import sys
import json
import base64
from pathlib import Path
from http.server import BaseHTTPRequestHandler

# Make the engine package importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("AMSC_ENGINE_MODE", "serverless")

from engine.generate_reports import generate_pdf_bytes


def _map_fields(data: dict) -> dict:
    """
    Map Supabase column names to the field names expected by generate_pdf_bytes().
    Supabase:   split_0_20, seg_20_40, athlete_name, event_date ...
    Engine:     0_20,       20_40,     name,         date        ...
    """
    def _float(v):
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    return {
        "name":    data.get("athlete_name", ""),
        "gender":  data.get("gender", ""),
        "sport":   data.get("sport", ""),
        "date":    data.get("event_date", ""),

        # Raw splits
        "0_20":  _float(data.get("split_0_20")),
        "0_40":  _float(data.get("split_0_40")),
        "0_60":  _float(data.get("split_0_60")),
        "0_80":  _float(data.get("split_0_80")),
        "0_100": _float(data.get("split_0_100")),
        "fly10": _float(data.get("fly10")),

        # Jump tests
        "cmj_cm":   _float(data.get("cmj_cm")),
        "broad_cm": _float(data.get("broad_cm")),

        # Derived segments
        "20_40": _float(data.get("seg_20_40")),
        "40_60": _float(data.get("seg_40_60")),
        "60_80": _float(data.get("seg_60_80")),
        "80_100": _float(data.get("seg_80_100")),
        "peak_velocity_segment": _float(data.get("peak_velocity_segment")),
        "peak_velocity_zone":    data.get("peak_velocity_zone"),

        # Classifications (already computed — used directly by PDF)
        "acceleration_category":      data.get("acceleration_category"),
        "max_velocity_category":      data.get("max_velocity_category"),
        "speed_maintenance_category": data.get("speed_maintenance_category"),
        "power_category":             data.get("power_category"),
        "power_level":                data.get("power_level"),
        "primary_imbalance_flag":     data.get("primary_imbalance_flag"),
        "missing_fields":             data.get("missing_fields"),

        # Hop RSI raw
        "rsi_double_avg":           _float(data.get("rsi_double_avg")),
        "rsi_double_best":          _float(data.get("rsi_double_best")),
        "rsi_double_gct_avg":       _float(data.get("rsi_double_gct_avg")),
        "rsi_single_left_avg":      _float(data.get("rsi_single_left_avg")),
        "rsi_single_left_best":     _float(data.get("rsi_single_left_best")),
        "rsi_single_left_gct_avg":  _float(data.get("rsi_single_left_gct_avg")),
        "rsi_single_right_avg":     _float(data.get("rsi_single_right_avg")),
        "rsi_single_right_best":    _float(data.get("rsi_single_right_best")),
        "rsi_single_right_gct_avg": _float(data.get("rsi_single_right_gct_avg")),
        # Hop RSI classifications (DB uses _cat, engine uses _category)
        "rsi_double_category":       data.get("rsi_double_category"),
        "rsi_single_left_category":  data.get("rsi_single_left_cat"),
        "rsi_single_right_category": data.get("rsi_single_right_cat"),
        "rsi_asymmetry_pct":         _float(data.get("rsi_asymmetry_pct")),
        "rsi_dominant_side":         data.get("rsi_dominant_side"),
        "rsi_asymmetry_flag":        data.get("rsi_asymmetry_flagged"),
        "power_profile_type":        data.get("power_profile_type"),
        # Drop jump RSI
        "dj_40_rsi":       _float(data.get("dj_40_rsi")),
        "dj_40_jump_ht":   _float(data.get("dj_40_jump_ht")),
        "dj_40_gct":       _float(data.get("dj_40_gct")),
        "dj_50_rsi":       _float(data.get("dj_50_rsi")),
        "dj_50_jump_ht":   _float(data.get("dj_50_jump_ht")),
        "dj_50_gct":       _float(data.get("dj_50_gct")),
        "dj_60_rsi":       _float(data.get("dj_60_rsi")),
        "dj_60_jump_ht":   _float(data.get("dj_60_jump_ht")),
        "dj_60_gct":       _float(data.get("dj_60_gct")),
        "dj_best_rsi":         _float(data.get("dj_best_rsi")),
        "dj_optimal_height":   data.get("dj_optimal_height"),
        "dj_best_category":    data.get("dj_best_category"),
    }


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default HTTP logging
        pass

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length)
            data = json.loads(raw)

            mapped = _map_fields(data)

            pdf_buffer = generate_pdf_bytes(mapped)
            pdf_bytes  = pdf_buffer.read()

            safe_name = mapped["name"].replace(" ", "_")
            filename  = f"{safe_name}_performance_report.pdf"

            response = json.dumps({
                "pdf":      base64.b64encode(pdf_bytes).decode("utf-8"),
                "filename": filename,
            }).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

        except Exception as e:
            error_response = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(error_response)))
            self.end_headers()
            self.wfile.write(error_response)
