"""
Vercel Python Serverless Function — Batch Excel Processor
POST /api/process-batch

Accepts a base64-encoded Excel file (.xlsx), parses both sheets using the
AMSC template format, runs evaluate_batch() on all athletes, and returns
the results as a JSON array.

Called by /api/admin/upload-results (Next.js) during Arnold's batch upload.
"""

import os
import sys
import io
import json
import base64
from pathlib import Path
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("AMSC_ENGINE_MODE", "serverless")

from engine.transform_raw_data import process_template
from engine.performance_engine import evaluate_batch


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length)
            data = json.loads(raw)

            # Decode base64 Excel file
            excel_bytes = base64.b64decode(data["file"])
            file_buffer = io.BytesIO(excel_bytes)

            # Parse the template
            df = process_template(file_buffer)
            warnings = df.attrs.get("warnings", [])

            # Run classification engine
            results, errors = evaluate_batch(df)

            # Attach date to each result (passed from the upload form)
            event_date = data.get("eventDate", "")
            for r in results:
                r["date"] = event_date

            response = json.dumps({
                "results": results,
                "warnings": warnings,
                "errors": [
                    {"name": e["name"], "error": e["error"]}
                    for e in errors
                ],
            }).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

        except Exception as e:
            import traceback
            error_response = json.dumps({
                "error": str(e),
                "detail": traceback.format_exc(),
            }).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(error_response)))
            self.end_headers()
            self.wfile.write(error_response)
