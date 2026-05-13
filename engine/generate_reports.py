import io
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker
import numpy as np
import pandas as pd
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, Image,
)

from engine.settings import PATHS, BRAND

import os
ENGINE_MODE = os.getenv("AMSC_ENGINE_MODE", "local")

OUTPUT_DIR  = PATHS["reports_dir"]
MASTER_XLSX = PATHS["output_xlsx"]
LOGO_PATH   = PATHS.get("logo_path")
FOOTER_TEXT = BRAND["report_footer"]

# Warn at startup if logo file is missing (local mode only)
if ENGINE_MODE == "local" and LOGO_PATH and not Path(LOGO_PATH).exists():
    print(f"⚠  WARNING: Logo file not found at {LOGO_PATH}")

RED    = colors.HexColor(BRAND["primary"])
BLACK  = colors.HexColor("#000000")
DGREY  = colors.HexColor("#444444")
MGREY  = colors.HexColor("#888888")
LGREY  = colors.HexColor("#DDDDDD")
OFFWHT = colors.HexColor("#F7F7F7")
WHITE  = colors.white
AMBER  = colors.HexColor("#F57F17")

TIER_BG = {
    "Advanced":    colors.HexColor("#E8F5E9"),
    "Competitive": colors.HexColor("#FFF8E1"),
    "Developing":  colors.HexColor("#FFEBEE"),
}
TIER_CLR = {
    "Advanced":    colors.HexColor("#1A4D1A"),
    "Competitive": colors.HexColor("#7A5200"),
    "Developing":  colors.HexColor("#8B0000"),
}

CHART_GREEN  = "#2E7D32"
CHART_YELLOW = "#F57F17"
CHART_RED    = "#C62828"
CHART_GREY   = "#BDBDBD"
CHART_LINE   = "#C41E3A"

PAGE_W, PAGE_H = A4
L_MAR     = R_MAR = 16 * mm
B_MAR     = 12 * mm
CONTENT_W = PAGE_W - L_MAR - R_MAR

EDN = "Founders Edition"


# ── Helpers ───────────────────────────────────────────────────

def sf(val, fmt=".2f"):
    """Safe format — returns N/A for None or invalid values."""
    if val is None:
        return "N/A"
    try:
        f = float(val)
        if pd.isna(f):
            return "N/A"
        return format(f, fmt)
    except (TypeError, ValueError):
        return "N/A"


def _is_missing(val) -> bool:
    if val is None:
        return True
    try:
        return pd.isna(float(val))
    except (TypeError, ValueError):
        return True


def _tier_numeric(cat: Optional[str]) -> int:
    if cat is None:
        return 0
    return {"Advanced": 3, "Competitive": 2}.get(cat, 1)


def _tier_score(cat: Optional[str]) -> int:
    if cat is None:
        return 0
    return {"Advanced": 100, "Competitive": 75}.get(cat, 50)


def compute_amsc_score(
    accel: str,
    maxv:  str,
    power: Optional[str],
    maint: Optional[str],
) -> int:
    weights = {"accel": 0.30, "maxv": 0.30, "power": 0.25, "maint": 0.15}
    scores  = {"accel": _tier_score(accel), "maxv": _tier_score(maxv)}

    maint_score = {"Efficient": 100, "Moderate Drop-Off": 75}.get(maint, 50) if maint else None
    power_score = _tier_score(power) if power else None

    total_weight = weights["accel"] + weights["maxv"]
    total_score  = scores["accel"] * weights["accel"] + scores["maxv"] * weights["maxv"]

    if power_score is not None:
        total_score  += power_score * weights["power"]
        total_weight += weights["power"]
    if maint_score is not None:
        total_score  += maint_score * weights["maint"]
        total_weight += weights["maint"]

    return round(total_score / total_weight) if total_weight else 0


def _cropped_logo_path(src: Path) -> Path:
    out = src.with_name(f"{src.stem}_cropped{src.suffix}")
    try:
        if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
            return out
    except OSError:
        return src
    try:
        im = PILImage.open(src).convert("RGB")
        px = im.load()
        w, h = im.size
        thr = 28
        min_x, min_y = w, h
        max_x, max_y = -1, -1
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y]
                if (r + g + b) > thr * 3:
                    if x < min_x: min_x = x
                    if y < min_y: min_y = y
                    if x > max_x: max_x = x
                    if y > max_y: max_y = y
        if max_x <= min_x or max_y <= min_y:
            return src
        pad = 10
        cropped = im.crop((
            max(min_x - pad, 0), max(min_y - pad, 0),
            min(max_x + pad + 1, w), min(max_y + pad + 1, h),
        ))
        cropped.save(out)
        return out
    except Exception:
        return src


# ── Paragraph styles ──────────────────────────────────────────

def ps(name, size=9, bold=False, color=BLACK, leading=None, sb=0, sa=3, align=0):
    return ParagraphStyle(
        name,
        fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,
        leading=leading or size * 1.45,
        textColor=color,
        spaceBefore=sb,
        spaceAfter=sa,
        alignment=align,
    )

S_ORG_HDR  = ps("OrgHdr",  size=20, bold=True,  color=BLACK,  sa=0)
S_TITLE    = ps("Title",   size=10, color=MGREY, sa=1)
S_EDITION  = ps("Edition", size=10, color=MGREY, sa=0)
S_SECTION  = ps("Sec",     size=10, bold=True,  color=WHITE,  sa=0)
S_BODY     = ps("Body",    size=10, color=DGREY, sa=3)
S_MISSING  = ps("Missing", size=9,  color=AMBER, sa=2, bold=True)
S_IMBAL    = ps("Imbal",   size=10, bold=True,  color=BLACK,  sa=0)
S_PEAK     = ps("Peak",    size=9,  bold=True,  color=DGREY,  sa=2, align=1)
S_ATHL_LBL = ps("AthlLbl", size=9,  bold=True, color=WHITE,  sa=0, align=1)
S_ATHL_VAL = ps("AthlVal", size=10, color=BLACK, sa=0, align=1)


# ── Chart builders ────────────────────────────────────────────

def build_sprint_chart(row: pd.Series, width_mm: float, height_mm: float) -> Image:
    seg_0_20   = row.get("0_20")
    seg_20_40  = row.get("20_40")
    seg_40_60  = row.get("40_60")
    seg_60_80  = row.get("60_80")
    seg_80_100 = row.get("80_100")

    phases, times = [], []
    for label, val in [
        ("0-20m", seg_0_20), ("20-40m", seg_20_40),
        ("40-60m", seg_40_60), ("60-80m", seg_60_80),
        ("80-100m", seg_80_100),
    ]:
        if not _is_missing(val):
            phases.append(label)
            times.append(float(val))

    fig, ax = plt.subplots(figsize=(width_mm / 25.4, height_mm / 25.4))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("#FAFAFA")

    if times:
        min_t, max_t = min(times), max(times)
        pt_colors = [
            CHART_GREEN if t == min_t else CHART_RED if t == max_t else CHART_GREY
            for t in times
        ]
        ax.plot(phases, times, color=CHART_LINE, linewidth=2, zorder=2)
        for x, y, c in zip(phases, times, pt_colors):
            ax.scatter(x, y, color=c, s=60, zorder=3, edgecolors="white", linewidth=0.8)
            ax.annotate(f"{y:.2f}s", (x, y),
                        textcoords="offset points", xytext=(0, 7),
                        ha="center", fontsize=7, color="#333333")
    else:
        ax.text(0.5, 0.5, "Sprint segment data not available",
                ha="center", va="center", transform=ax.transAxes,
                fontsize=9, color="#888888")

    ax.set_ylabel("Segment Time (s)", fontsize=8, color="#444444")
    ax.set_xlabel("Sprint Phase", fontsize=8, color="#444444")
    ax.tick_params(labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#CCCCCC")
    ax.grid(axis="y", linestyle="--", linewidth=0.4, alpha=0.6)

    if times:
        legend_elements = [
            mpatches.Patch(facecolor=CHART_GREEN, label="Peak Velocity"),
            mpatches.Patch(facecolor=CHART_RED,   label="Slowest Phase"),
            mpatches.Patch(facecolor=CHART_GREY,  label="Transition"),
        ]
        ax.legend(handles=legend_elements, fontsize=6.5, loc="upper right",
                  framealpha=0.7, edgecolor="#DDDDDD")

    fig.tight_layout(pad=0.6)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)

    img = Image(buf)
    img.drawWidth  = width_mm * mm
    img.drawHeight = height_mm * mm
    return img


# Radar continuous scoring — mirrors settings.py thresholds
_RADAR_THRESHOLDS = {
    "accel": {  # 0-20m split — lower is better
        "male":   {"comp": 3.00, "adv": 3.00, "elite": 2.60, "floor": 4.50},
        "female": {"comp": 3.40, "adv": 3.40, "elite": 3.00, "floor": 5.00},
    },
    "maxv": {   # fly10 — lower is better
        "male":   {"comp": 0.95, "adv": 0.95, "elite": 0.80, "floor": 1.40},
        "female": {"comp": 1.05, "adv": 1.05, "elite": 0.90, "floor": 1.60},
    },
    "power": {  # cmj_cm — higher is better
        "male":   {"comp": 40,  "adv": 50,  "elite": 70,  "floor": 10},
        "female": {"comp": 32,  "adv": 40,  "elite": 55,  "floor": 10},
    },
}


def _radar_score(category: Optional[str], value, gender: str, metric: str) -> float:
    """
    Compute a continuous 0–9 radar score from a raw metric value.
    Bands: Developing 0–3, Competitive 3–6, Advanced 6–9.
    Falls back to band midpoint when value is missing.
    """
    fallback = {"Advanced": 7.5, "Competitive": 4.5, "Developing": 1.5}
    if value is None or category is None:
        return fallback.get(category, 0.0) if category else 0.0

    try:
        v = float(value)
    except (TypeError, ValueError):
        return fallback.get(category, 0.0)

    g   = gender if gender in ("male", "female") else "male"
    t   = _RADAR_THRESHOLDS.get(metric, {}).get(g)
    if t is None:
        return fallback.get(category, 0.0)

    if metric in ("accel", "maxv"):  # lower = better
        if category == "Advanced":
            pos = (t["comp"] - v) / max(t["comp"] - t["elite"], 0.001)
            return 6.0 + min(3.0, max(0.0, pos * 3.0))
        elif category == "Competitive":
            pos = (t["floor"] - v) / max(t["floor"] - t["comp"], 0.001)
            return 3.0 + min(3.0, max(0.0, pos * 3.0))
        else:
            pos = max(0.0, (t["floor"] - v) / max(t["floor"] - t["comp"], 0.001))
            return max(0.0, min(3.0, pos * 3.0))
    else:  # higher = better (power)
        if category == "Advanced":
            pos = (v - t["adv"]) / max(t["elite"] - t["adv"], 1)
            return 6.0 + min(3.0, max(0.0, pos * 3.0))
        elif category == "Competitive":
            pos = (v - t["comp"]) / max(t["adv"] - t["comp"], 1)
            return 3.0 + min(3.0, max(0.0, pos * 3.0))
        else:
            pos = max(0.0, v / max(t["comp"], 1))
            return max(0.0, min(3.0, pos * 3.0))


def build_radar_chart(
    accel: str,
    maxv:  str,
    power: Optional[str],
    maint: Optional[str],
    width_mm: float,
    height_mm: float,
    accel_val=None,
    maxv_val=None,
    power_val=None,
    gender: str = "male",
) -> Image:
    labels = ["Acceleration", "Max Velocity", "Power", "Speed\nMaintenance"]

    # Continuous 0–9 scoring: uses raw values if available, else band midpoint
    g = gender if gender in ("male", "female") else "male"
    values = [
        _radar_score(accel, accel_val, g, "accel"),
        _radar_score(maxv,  maxv_val,  g, "maxv"),
        _radar_score(power, power_val, g, "power") if power else 0.0,
        {"Efficient": 8.0, "Moderate Drop-Off": 4.5}.get(maint, 1.5) if maint else 0.0,
    ]

    N = len(labels)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    values_plot = values + [values[0]]
    angles_plot = angles + [angles[0]]

    fig, ax = plt.subplots(figsize=(width_mm / 25.4, height_mm / 25.4),
                           subplot_kw=dict(polar=True))
    fig.patch.set_facecolor("white")

    # 0–9 scale; main rings at 3, 6, 9 = category boundaries
    ax.set_ylim(0, 9)
    ax.set_yticks([3, 6, 9])
    ax.set_yticklabels(["Developing", "Competitive", "Advanced"],
                       fontsize=6, color="#888888")
    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontsize=7.5, color="#333333")

    # Sub-rings at band midpoints (very faint dotted)
    for sub in [1.5, 4.5, 7.5]:
        sub_vals = [sub] * (N + 1)
        ax.plot(angles_plot, sub_vals, color="#EEEEEE", linewidth=0.5,
                linestyle=":", zorder=1)

    ax.plot(angles_plot, values_plot, color=CHART_LINE, linewidth=2, zorder=2)
    ax.fill(angles_plot, values_plot, color=CHART_LINE, alpha=0.18, zorder=2)

    for ang, val in zip(angles, values):
        if val == 0:
            ax.scatter(ang, 0.2, color="#CCCCCC", s=30, zorder=4,
                       edgecolors="white", linewidth=0.8)
        else:
            c = CHART_GREEN if val >= 6 else CHART_YELLOW if val >= 3 else CHART_RED
            ax.scatter(ang, val, color=c, s=55, zorder=4,
                       edgecolors="white", linewidth=0.8)

    ax.spines["polar"].set_color("#DDDDDD")
    ax.grid(color="#DDDDDD", linewidth=0.5)
    fig.tight_layout(pad=0.4)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)

    img = Image(buf)
    img.drawWidth  = width_mm * mm
    img.drawHeight = height_mm * mm
    return img


# ── Table builders ────────────────────────────────────────────

def section_bar(label: str):
    t = Table([[Paragraph(label, S_SECTION)]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), RED),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def missing_banner(fields: str):
    t = Table(
        [[Paragraph(f"⚠  Data not collected for this athlete: {fields}", S_MISSING)]],
        colWidths=[CONTENT_W]
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#FFF8E1")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW",     (0, 0), (-1, -1), 1, AMBER),
    ]))
    return t


def data_table(rows):
    cw = [CONTENT_W * 0.62, CONTENT_W * 0.38]
    t  = Table(rows, colWidths=cw)
    t.setStyle(TableStyle([
        ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTNAME",       (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",       (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",      (0, 0), (-1,  0), WHITE),
        ("BACKGROUND",     (0, 0), (-1,  0), BLACK),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
        ("LINEBELOW",      (0, 0), (-1, -1), 0.3, LGREY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, OFFWHT]),
    ]))
    return t


def rsi_data_table(rows):
    """4-column table for RSI and Drop Jump sections."""
    cw = [CONTENT_W * 0.36, CONTENT_W * 0.20, CONTENT_W * 0.22, CONTENT_W * 0.22]
    t  = Table(rows, colWidths=cw)
    t.setStyle(TableStyle([
        ("FONTNAME",       (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTNAME",       (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",       (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",      (0, 0), (-1,  0), WHITE),
        ("BACKGROUND",     (0, 0), (-1,  0), BLACK),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("ALIGN",          (0, 1), (0,  -1), "LEFT"),
        ("LEFTPADDING",    (0, 0), (0,  -1), 8),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
        ("LINEBELOW",      (0, 0), (-1, -1), 0.3, LGREY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, OFFWHT]),
    ]))
    return t


def scorecard_table(
    accel: str,
    maxv:  str,
    power: Optional[str],
    maint: Optional[str],
):
    NA_BG  = colors.HexColor("#F5F5F5")
    NA_CLR = colors.HexColor("#AAAAAA")

    rows = [
        ["Quality",           "Category"],
        ["Acceleration",      accel          or "N/A"],
        ["Max Velocity",      maxv           or "N/A"],
        ["Power",             power          or "N/A"],
        ["Speed Maintenance", maint          or "N/A"],
    ]

    maint_bg  = {"Efficient": colors.HexColor("#E8F5E9"),
                 "Moderate Drop-Off": colors.HexColor("#FFF8E1")}.get(
                     maint, colors.HexColor("#FFEBEE")) if maint else NA_BG
    maint_clr = {"Efficient": colors.HexColor("#1A4D1A"),
                 "Moderate Drop-Off": colors.HexColor("#7A5200")}.get(
                     maint, colors.HexColor("#8B0000")) if maint else NA_CLR

    cat_rows = [
        (accel, TIER_BG.get(accel, NA_BG),  TIER_CLR.get(accel, NA_CLR)),
        (maxv,  TIER_BG.get(maxv,  NA_BG),  TIER_CLR.get(maxv,  NA_CLR)),
        (power, TIER_BG.get(power, NA_BG),  TIER_CLR.get(power, NA_CLR)),
        (maint, maint_bg, maint_clr),
    ]

    cw = [CONTENT_W * 0.62, CONTENT_W * 0.38]
    t  = Table(rows, colWidths=cw)
    cmds = [
        ("FONTNAME",      (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("TEXTCOLOR",     (0, 0), (-1,  0), WHITE),
        ("BACKGROUND",    (0, 0), (-1,  0), BLACK),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.3, LGREY),
    ]
    for i, (_, bg, clr) in enumerate(cat_rows, 1):
        cmds += [
            ("BACKGROUND", (0, i), (0, i), WHITE),
            ("TEXTCOLOR",  (0, i), (0, i), DGREY),
            ("FONTNAME",   (0, i), (0, i), "Helvetica"),
            ("BACKGROUND", (1, i), (1, i), bg),
            ("TEXTCOLOR",  (1, i), (1, i), clr),
            ("FONTNAME",   (1, i), (1, i), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(cmds))
    return t


def score_box(score: int):
    colour = (
        colors.HexColor("#1A4D1A") if score >= 85 else
        colors.HexColor("#7A5200") if score >= 65 else
        colors.HexColor("#8B0000")
    )
    bg = (
        colors.HexColor("#E8F5E9") if score >= 85 else
        colors.HexColor("#FFF8E1") if score >= 65 else
        colors.HexColor("#FFEBEE")
    )
    label_style = ParagraphStyle(
        "ScoreLabel", fontName="Helvetica", fontSize=8,
        textColor=MGREY, alignment=1, spaceAfter=1,
    )
    value_style = ParagraphStyle(
        "ScoreValue", fontName="Helvetica-Bold", fontSize=24,
        textColor=colour, alignment=1, spaceAfter=0,
    )
    t = Table([
        [Paragraph("AMSC PERFORMANCE SCORE", label_style)],
        [Paragraph(f"{score} / 100", value_style)],
    ], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (0,   0), 8),
        ("TOPPADDING",    (0, 1), (0,   1), 4),
        ("BOTTOMPADDING", (0, 0), (0,   0), 1),
        ("BOTTOMPADDING", (0, 1), (-1,  1), 24),
        ("LINEBELOW",     (0, 1), (-1,  1), 1.5, colour),
    ]))
    return t


def athlete_info_table(name, sport, gender, date_val):
    col_w = CONTENT_W / 4
    t = Table(
        [
            [Paragraph("ATHLETE", S_ATHL_LBL),
             Paragraph("SPORT",   S_ATHL_LBL),
             Paragraph("GENDER",  S_ATHL_LBL),
             Paragraph("DATE",    S_ATHL_LBL)],
            [Paragraph(name,     S_ATHL_VAL),
             Paragraph(sport,    S_ATHL_VAL),
             Paragraph(gender,   S_ATHL_VAL),
             Paragraph(date_val, S_ATHL_VAL)],
        ],
        colWidths=[col_w] * 4,
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), RED),
        ("BACKGROUND",    (0, 1), (-1, 1), OFFWHT),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBEFORE",    (1, 0), (-1, -1), 0.5, LGREY),
        ("LINEBELOW",     (0, 1), (-1,  1), 1.5, RED),
    ]))
    return t


# ── Page chrome ───────────────────────────────────────────────

def draw_chrome(canv, doc, name, sport):
    canv.saveState()
    canv.setFillColor(RED)
    canv.rect(0, PAGE_H - 9 * mm, PAGE_W, 9 * mm, fill=1, stroke=0)
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 10)
    canv.drawString(L_MAR, PAGE_H - 6.2 * mm, "AMSC COMBINE")
    canv.setFont("Helvetica", 8)
    canv.drawRightString(PAGE_W - R_MAR, PAGE_H - 6.2 * mm,
                         f"{name}  |  {sport}")
    canv.setStrokeColor(RED)
    canv.setLineWidth(0.8)
    canv.line(L_MAR, B_MAR + 3 * mm, PAGE_W - R_MAR, B_MAR + 3 * mm)
    canv.setFillColor(BLACK)
    canv.setFont("Helvetica", 7)
    canv.drawCentredString(PAGE_W / 2, B_MAR, FOOTER_TEXT)
    canv.restoreState()


# ── Narrative builder ─────────────────────────────────────────

def build_blocks(row):
    accel       = row.get("acceleration_category") or ""
    maxv        = row.get("max_velocity_category")  or ""
    maint       = row.get("speed_maintenance_category")
    power_cat   = row.get("power_category")
    power_level = row.get("power_level", "N/A") or "N/A"

    metrics = {
        "Acceleration": _tier_numeric(accel),
        "Max Velocity": _tier_numeric(maxv),
    }
    if power_cat:
        metrics["Power"] = _tier_numeric(power_cat)

    best  = max(metrics, key=metrics.get) if metrics else "Acceleration"
    worst = min(metrics, key=metrics.get) if metrics else "Acceleration"

    strength_map = {
        "Acceleration": "Acceleration phase is a current strength. First 20m performance is a positive part of the sprint profile.",
        "Max Velocity": "Top-end speed is a current strength. Max velocity contributes strongly to overall sprint performance.",
        "Power":        "Lower body explosive power is a current strength. Jump output supports speed and sprint capacity.",
    }
    dev_map = {
        "Acceleration": (
            "Acceleration mechanics and first 20m performance are the primary development focus.",
            "Acceleration mechanics and early-phase sprint work.",
        ),
        "Max Velocity": (
            "Max velocity and top-end speed exposure are the primary development focus.",
            "Max velocity development and upright sprint mechanics.",
        ),
        "Power": (
            (
                "Elastic and reactive strength for late-phase sprint support is the primary focus.",
                "Elastic/reactive strength and speed endurance work.",
            )
            if maint == "Significant Drop-Off" else
            (
                "Lower body power output and force production are the primary development focus.",
                "Power output and jump-based strength development.",
            )
        ),
    }
    dev_text, focus = dev_map.get(worst, ("Development areas to be assessed.", "General athletic development."))

    return {
        "power_level": power_level,
        "power_cat":   power_cat,
        "strength":    strength_map.get(best, ""),
        "dev":         dev_text,
        "focus":       focus,
    }


# ── Sprint insight builder ───────────────────────────────────

def _sprint_insight_paragraphs(row: pd.Series) -> list:
    """
    Return a list of Paragraph elements with rich, data-driven sprint insights
    and specific actionable training recommendations.
    """
    paras = []
    gender  = str(row.get("gender", "male")).lower()
    name    = str(row.get("name", "The athlete"))

    accel = row.get("acceleration_category") or ""
    maxv  = row.get("max_velocity_category")  or ""
    maint = row.get("speed_maintenance_category")

    t20   = row.get("0_20")
    fly10 = row.get("fly10")
    cmj   = row.get("cmj_cm")
    power_cat = row.get("power_category")

    # Thresholds mirroring settings.py
    _accel_adv  = {"male": 3.00, "female": 3.40}.get(gender, 3.00)
    _accel_comp = {"male": 3.50, "female": 3.90}.get(gender, 3.50)
    _maxv_adv   = {"male": 0.95, "female": 1.05}.get(gender, 0.95)
    _maxv_comp  = {"male": 1.10, "female": 1.22}.get(gender, 1.10)

    # ── Sprint Profile Type ───────────────────────────────────
    tier = {"Advanced": 3, "Competitive": 2, "Developing": 1}
    accel_t = tier.get(accel, 0)
    maxv_t  = tier.get(maxv, 0)

    if accel_t > 0 and maxv_t > 0:
        if accel_t > maxv_t:
            profile = (
                "Acceleration-dominant sprint profile — strong initial force production, "
                "but max velocity is the current performance ceiling."
            )
        elif maxv_t > accel_t:
            profile = (
                "Velocity-dominant sprint profile — high terminal speed, "
                "but the early-phase drive is still developing."
            )
        elif accel_t >= 3:
            profile = (
                "Complete sprint profile — both acceleration and max velocity phases "
                "are operating at an Advanced level."
            )
        elif accel_t >= 2:
            profile = (
                "Balanced sprint profile at Competitive level — both phases are tracking "
                "toward the Advanced benchmark."
            )
        else:
            profile = (
                "Early-stage sprint development — both acceleration and max velocity "
                "require systematic work across all phases."
            )
        paras.append(Paragraph(
            f"<b>Sprint Profile:</b>  {profile}", S_BODY
        ))
        paras.append(Spacer(1, 3))

    # ── Primary Strength (quantified) ────────────────────────
    if accel == "Advanced" and t20 is not None:
        margin = round(_accel_adv - float(t20), 2)
        paras.append(Paragraph(
            f"<b>Primary Strength:</b>  0-20m of {sf(t20, '.2f')}s is Advanced "
            f"(male threshold: {_accel_adv}s, margin: {margin}s). "
            f"First-step quickness and mechanical drive in the acceleration phase are developed strengths.",
            S_BODY,
        ))
    elif maxv == "Advanced" and fly10 is not None:
        margin = round(_maxv_adv - float(fly10), 2) if float(fly10) > _maxv_adv else round(_maxv_adv - float(fly10), 2)
        paras.append(Paragraph(
            f"<b>Primary Strength:</b>  Fly 10m of {sf(fly10, '.2f')}s is Advanced "
            f"(threshold: {_maxv_adv}s). Top-end velocity is a clear performance asset.",
            S_BODY,
        ))
    elif accel == "Competitive" and t20 is not None:
        gap = round(float(t20) - _accel_adv, 2)
        paras.append(Paragraph(
            f"<b>Primary Strength:</b>  0-20m of {sf(t20, '.2f')}s is Competitive "
            f"({gap}s from Advanced). Acceleration is building well and approaching benchmark level.",
            S_BODY,
        ))
    elif maxv == "Competitive" and fly10 is not None:
        gap = round(float(fly10) - _maxv_adv, 2)
        paras.append(Paragraph(
            f"<b>Primary Strength:</b>  Fly 10m of {sf(fly10, '.2f')}s is Competitive "
            f"({gap}s from Advanced). Top-end speed is progressing toward benchmark.",
            S_BODY,
        ))
    paras.append(Spacer(1, 3))

    # ── Development Focus (with gap to next tier) ─────────────
    if maxv in ("Developing", "Competitive") and fly10 is not None:
        fly_v = float(fly10)
        if maxv == "Developing":
            gap_comp = round(fly_v - _maxv_comp, 2)
            gap_adv  = round(fly_v - _maxv_adv,  2)
            paras.append(Paragraph(
                f"<b>Development Focus:</b>  Fly 10m of {sf(fly10, '.2f')}s is Developing. "
                f"Gap to Competitive: {gap_comp}s  |  Gap to Advanced: {gap_adv}s. "
                f"Top-end velocity and the mechanical capacity to sustain peak speed are the primary priorities.",
                S_BODY,
            ))
        else:  # Competitive
            gap_adv = round(fly_v - _maxv_adv, 2)
            paras.append(Paragraph(
                f"<b>Development Focus:</b>  Fly 10m of {sf(fly10, '.2f')}s is Competitive "
                f"({gap_adv}s from Advanced). "
                f"Increasing terminal velocity and sustaining it for longer are the next steps.",
                S_BODY,
            ))
    elif accel in ("Developing", "Competitive") and t20 is not None:
        t20_v = float(t20)
        if accel == "Developing":
            gap_comp = round(t20_v - _accel_adv, 2)
            paras.append(Paragraph(
                f"<b>Development Focus:</b>  0-20m of {sf(t20, '.2f')}s is Developing "
                f"({gap_comp}s from Competitive). "
                f"Acceleration mechanics and first-phase force application are the primary focus.",
                S_BODY,
            ))
        else:
            gap_adv = round(t20_v - _accel_adv, 2)
            paras.append(Paragraph(
                f"<b>Development Focus:</b>  0-20m of {sf(t20, '.2f')}s is Competitive "
                f"({gap_adv}s from Advanced). "
                f"Refining acceleration mechanics to close the gap to the Advanced threshold.",
                S_BODY,
            ))
    paras.append(Spacer(1, 3))

    # ── Speed Maintenance (if available) ─────────────────────
    if maint and maint not in ("N/A", ""):
        if maint == "Efficient":
            maint_note = (
                "Speed maintenance is Efficient — velocity is well sustained across the full 100m. "
                "This indicates strong speed endurance and mechanical efficiency at high velocity."
            )
        elif maint == "Moderate Drop-Off":
            maint_note = (
                "Speed maintenance shows a moderate drop-off across the 100m. "
                "Speed endurance and late-phase mechanics should be incorporated into training."
            )
        else:
            maint_note = (
                "Speed maintenance shows a significant drop-off. "
                "Speed endurance development is a priority alongside max velocity work."
            )
        paras.append(Paragraph(f"<b>Speed Maintenance:</b>  {maint_note}", S_BODY))
        paras.append(Spacer(1, 3))

    # ── Power–Sprint cross-reference ─────────────────────────
    if power_cat and accel_t > 0 and maxv_t > 0:
        power_t = tier.get(power_cat, 0)
        if power_t >= 3 and accel_t < 3:
            paras.append(Paragraph(
                "<b>Power–Sprint Note:</b>  Lower body power is Advanced but acceleration "
                "has not yet reached that tier — force is available but sprint-specific "
                "transfer mechanics are the gap. Prioritise acceleration-specific plyometrics "
                "and sprint start work.",
                S_BODY,
            ))
            paras.append(Spacer(1, 3))
        elif power_t < 2 and accel_t >= 3:
            paras.append(Paragraph(
                "<b>Power–Sprint Note:</b>  Sprint acceleration is Advanced despite lower "
                "power scores — efficient mechanics are driving sprint output. "
                "Improving lower body power would provide an additional performance ceiling.",
                S_BODY,
            ))
            paras.append(Spacer(1, 3))

    # ── Recommended Training Block ────────────────────────────
    paras.append(Paragraph("<b>Recommended Training Block:</b>", S_BODY))

    bullets = []
    # Max velocity is the primary gap
    if maxv == "Developing" and fly10 is not None:
        target = round(float(fly10) * 0.95, 2)  # 5% improvement target
        bullets += [
            f"Flying sprints: 3×(2×20m) at ≥95% effort — extend exposure to terminal velocity.",
            f"Upright mechanics: A-series progressions, high-knee drives, and wicket runs at technical speed.",
            f"Target: reduce fly 10m from {sf(fly10, '.2f')}s toward {_maxv_comp}s (Competitive threshold) over 8–12 weeks.",
        ]
    elif maxv == "Competitive" and fly10 is not None:
        bullets += [
            f"Flying 30s and assisted sprints (resistance bands/downhill) at >98% effort.",
            f"Sprint float sets: 10m max drive → 20m float at 95% → 10m re-acceleration.",
            f"Target: reduce fly 10m from {sf(fly10, '.2f')}s toward {_maxv_adv}s (Advanced threshold).",
        ]
    # Acceleration is the primary gap
    elif accel == "Developing" and t20 is not None:
        bullets += [
            f"Resisted sprint work: sled pulls at 10–15% bodyweight over 15–20m.",
            f"Hip drive mechanics: A-march, A-skip, and wall drill progressions.",
            f"React-and-drive drills from athletic stance — first-step emphasis.",
        ]
    elif accel == "Competitive" and t20 is not None:
        bullets += [
            f"Block or staggered start work — 3×4×20m with full recovery.",
            f"Loaded jump-to-sprint complexes (depth jump → 20m sprint).",
            f"Technical cue work: shin angle, arm mechanics, and hip extension in the drive phase.",
        ]
    # Both Advanced → maintenance + speed endurance
    elif accel == "Advanced" and maxv == "Advanced":
        bullets += [
            f"Maintain sprint volume: 2×/week sprint sessions at full intensity.",
            f"Speed endurance: 3×80m at 95% with full recovery — extend the velocity hold.",
            f"Reactive power maintenance: depth jumps and bounding circuits to sustain elastic output.",
        ]

    for b in bullets:
        paras.append(Paragraph(f"• {b}", ps("focus_bullet", size=9, color=DGREY, sb=1, sa=2)))

    return paras


# ── RSI insight builder ───────────────────────────────────────

def _rsi_insight_text(row: pd.Series) -> list:
    """
    Return a list of Paragraph elements providing contextual RSI interpretation
    and actionable training recommendations.
    """
    paras = []
    gender = str(row.get("gender", "male")).lower()

    dl_avg  = row.get("rsi_double_avg")
    dl_gct  = row.get("rsi_double_gct_avg")
    dl_cat  = row.get("rsi_double_category")
    sl_l_avg = row.get("rsi_single_left_avg")
    sl_r_avg = row.get("rsi_single_right_avg")
    sl_l_cat = row.get("rsi_single_left_category")
    sl_r_cat = row.get("rsi_single_right_category")

    # RSI thresholds for context sentences
    _adv  = {"male": 2.60, "female": 2.20}.get(gender, 2.60)
    _comp = {"male": 2.00, "female": 1.60}.get(gender, 2.00)
    _sl_adv  = {"male": 2.00, "female": 1.70}.get(gender, 2.00)
    _sl_comp = {"male": 1.50, "female": 1.20}.get(gender, 1.50)

    # A — Double-leg RSI context
    if dl_avg is not None and dl_cat:
        threshold = _adv if dl_cat == "Advanced" else _comp if dl_cat == "Competitive" else _comp
        direction = "above" if dl_cat in ("Advanced", "Competitive") else "below"
        benchmark = (
            f"above the Advanced threshold ({_adv})" if dl_cat == "Advanced" else
            f"within the Competitive range ({_comp}–{_adv})" if dl_cat == "Competitive" else
            f"below the Competitive threshold ({_comp})"
        )
        paras.append(Paragraph(
            f"<b>Double-leg RSI {sf(dl_avg, '.2f')} — {dl_cat}</b>  ({benchmark}).",
            ps("rsi_ctx", size=9, color=DGREY),
        ))

    # B — GCT interpretation
    if dl_gct is not None:
        gct_v = float(dl_gct)
        if gct_v < 0.200:
            gct_note = (f"Ground contact time of {sf(dl_gct, '.3f')}s is within the reactive zone "
                        f"— short contact enables efficient elastic energy return.")
        elif gct_v <= 0.250:
            gct_note = (f"Ground contact time of {sf(dl_gct, '.3f')}s is moderate — "
                        f"there is room to reduce contact time through plyometric acceleration work.")
        else:
            gct_note = (f"Ground contact time of {sf(dl_gct, '.3f')}s is extended — "
                        f"suggests a strength-biased movement strategy. Emphasise rapid rebound "
                        f"and hip extension in plyometric training.")
        paras.append(Paragraph(gct_note, ps("rsi_gct", size=9, color=DGREY)))

    # C — Single-leg summary
    if sl_l_avg is not None or sl_r_avg is not None:
        parts = []
        if sl_l_avg is not None and sl_l_cat:
            parts.append(f"Left — {sl_l_cat} ({sf(sl_l_avg, '.2f')})")
        if sl_r_avg is not None and sl_r_cat:
            parts.append(f"Right — {sl_r_cat} ({sf(sl_r_avg, '.2f')})")
        if parts:
            paras.append(Paragraph(
                f"<b>Single-leg:</b>  {',  '.join(parts)}.",
                ps("rsi_sl", size=9, color=DGREY),
            ))

    # D — Asymmetry (improved)
    asym_pct  = row.get("rsi_asymmetry_pct")
    asym_flag = row.get("rsi_asymmetry_flag")
    asym_side = row.get("rsi_dominant_side") or "Unknown"
    if asym_pct is not None:
        pct_v = float(asym_pct)
        if asym_flag:
            paras.append(Paragraph(
                f"<b>⚠ Bilateral asymmetry:</b>  {asym_side} leg dominant at "
                f"{sf(asym_pct, '.1f')}% — above the 10% threshold. "
                f"Prescribe a unilateral plyometric equalisation protocol.",
                ps("rsi_asym_warn", size=9, color=AMBER),
            ))
        elif pct_v >= 5.0:
            paras.append(Paragraph(
                f"<b>Bilateral asymmetry:</b>  {sf(asym_pct, '.1f')}% — within acceptable range "
                f"but worth monitoring. Incorporate unilateral work preventively.",
                ps("rsi_asym_ok", size=9, color=MGREY),
            ))
        else:
            paras.append(Paragraph(
                f"<b>Bilateral symmetry:</b>  {sf(asym_pct, '.1f')}% — excellent. "
                f"No corrective action required.",
                ps("rsi_asym_ok", size=9, color=MGREY),
            ))

    # E — Power profile type (improved language)
    ppt = row.get("power_profile_type")
    if ppt:
        ppt_desc = {
            "Reactive-Dominant": (
                "Reactive-Dominant — RSI exceeds concentric output. This profile supports "
                "deceleration and change of direction under fatigue."
            ),
            "Strength-Dominant": (
                "Strength-Dominant — concentric power (CMJ) outperforms reactive metrics. "
                "Ground contact time reduction work may convert strength into reactive output."
            ),
            "Balanced Power Profile": (
                "Balanced — concentric and reactive capacities are well matched."
            ),
        }.get(ppt, ppt)
        paras.append(Paragraph(
            f"<b>Power profile:</b>  {ppt_desc}",
            ps("rsi_ppt", size=9, color=DGREY),
        ))

    return paras


# ── Main PDF builder ──────────────────────────────────────────

def _build_pdf_elements(row: pd.Series, logo=None) -> tuple:
    """
    Build the ReportLab elements list for a single athlete report.
    Returns (elements, name, sport) — shared by both file and BytesIO paths.

    logo: Path/str to logo file, or None to use LOGO_PATH from settings.
    """
    logo_source = logo or LOGO_PATH
    name   = str(row["name"])
    sport  = str(row["sport"])
    gender = str(row.get("gender", "")).title()

    raw_date = row.get("date", "")
    if raw_date and str(raw_date).strip() not in ("", "nan", "None"):
        try:
            from datetime import datetime as dt
            date_val = dt.strptime(str(raw_date).strip(), "%Y-%m-%d").strftime("%d %b %Y")
        except ValueError:
            date_val = str(raw_date).strip()
    else:
        from datetime import date
        date_val = date.today().strftime("%d %b %Y")

    blk = build_blocks(row)

    accel         = row.get("acceleration_category") or ""
    maxv          = row.get("max_velocity_category")  or ""
    maint         = row.get("speed_maintenance_category")
    power_overall = blk["power_cat"]
    peak_zone     = str(row.get("peak_velocity_zone") or "—")
    missing       = row.get("missing_fields")

    amsc_score = compute_amsc_score(accel, maxv, power_overall, maint)

    el = []

    # ── Header ────────────────────────────────────────────────
    logo_cell = ""
    logo_w = 36 * mm   # width — adjust here to resize logo in header
    if logo_source and Path(logo_source).exists():
        img = Image(str(logo_source))
        if getattr(img, "imageWidth", 0) and getattr(img, "imageHeight", 0):
            aspect = img.imageHeight / float(img.imageWidth)
            img.drawWidth  = logo_w
            img.drawHeight = logo_w * aspect
            logo_cell = img

    header_left = [
        Paragraph("AMSC Combine", S_ORG_HDR),
        Paragraph("Performance Report", S_TITLE),
        Paragraph(EDN, S_EDITION),
    ]
    hdr = Table([[header_left, logo_cell]],
                colWidths=[CONTENT_W - logo_w, logo_w])
    hdr.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("ALIGN",         (1, 0), ( 1,  0), "RIGHT"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    el.append(hdr)
    el.append(Spacer(1, 3))

    # ── Athlete info ──────────────────────────────────────────
    el.append(athlete_info_table(name, sport, gender, date_val))
    el.append(Spacer(1, 4))

    # ── Missing fields banner ─────────────────────────────────
    if missing and str(missing) not in ("", "nan", "None"):
        el.append(missing_banner(str(missing)))
        el.append(Spacer(1, 4))

    # ── Section 1: Speed Profile ──────────────────────────────
    sprint_chart = build_sprint_chart(row, width_mm=160, height_mm=70)
    peak_label   = Paragraph(f"<b>Peak Velocity Phase:</b>  {peak_zone}", S_PEAK)

    el.append(KeepTogether([
        section_bar("SPEED PROFILE"),
        Spacer(1, 3),
        data_table([
            ["Metric",     "Time (s)"],
            ["0 - 20m",    sf(row.get("0_20"))],
            ["0 - 40m",    sf(row.get("0_40"))],
            ["Fly 10m",    sf(row.get("fly10"))],
            ["100m Total", sf(row.get("0_100"))],
        ]),
        Spacer(1, 6),
        sprint_chart,
        Spacer(1, 3),
        peak_label,
        Spacer(1, 3),
        Paragraph(f"<b>Acceleration:</b>  {accel or 'N/A'}", S_BODY),
        Paragraph(f"<b>Max Velocity:</b>  {maxv or 'N/A'}", S_BODY),
        Paragraph(f"<b>Speed Maintenance:</b>  {maint or 'N/A — 100m data not collected'}", S_BODY),
        Spacer(1, 5),
    ]))

    # ── Section 2: Power Profile ──────────────────────────────
    cmj_raw   = row.get("cmj_cm")
    broad_val = sf(row.get("broad_cm"), ".0f")

    if cmj_raw is not None:
        cmj_in      = round(float(cmj_raw) / 2.54, 1)
        cmj_display = f"{cmj_in} in"
    else:
        cmj_display = "N/A — not collected"

    power_rows = [["Test", "Score"]]
    power_rows.append(["CMJ",        cmj_display])
    power_rows.append(["Broad Jump", f"{broad_val} cm" if broad_val != "N/A" else "N/A — not collected"])

    el.append(KeepTogether([
        section_bar("POWER PROFILE"),
        Spacer(1, 3),
        data_table(power_rows),
        Spacer(1, 3),
        Paragraph(
            f"<b>Lower body explosive power:</b>  "
            f"{blk['power_level'] if blk['power_level'] != 'N/A' else 'N/A — jump data not collected'}",
            S_BODY
        ),
        Paragraph(
            "<b>Speed transfer:</b>  Force production relative to sprint performance.",
            S_BODY
        ),
        Spacer(1, 5),
    ]))

    # ── Section 3: Reactive Strength Profile ─────────────────
    rsi_dl_avg   = row.get("rsi_double_avg")
    rsi_sl_l_avg = row.get("rsi_single_left_avg")
    rsi_sl_r_avg = row.get("rsi_single_right_avg")
    has_hop_rsi  = any(v is not None for v in (rsi_dl_avg, rsi_sl_l_avg, rsi_sl_r_avg))

    dj_40 = row.get("dj_40_rsi")
    dj_50 = row.get("dj_50_rsi")
    dj_60 = row.get("dj_60_rsi")
    has_dj = any(v is not None for v in (dj_40, dj_50, dj_60))

    if has_hop_rsi or has_dj:
        rsi_el = [section_bar("REACTIVE STRENGTH PROFILE"), Spacer(1, 3)]

        if has_hop_rsi:
            rsi_rows = [["Test", "Avg RSI", "Avg GCT (s)", "Category"]]
            for label, avg, gct, cat in [
                ("Double-Leg Hop",   rsi_dl_avg,   row.get("rsi_double_gct_avg"),      row.get("rsi_double_category")),
                ("Single-Leg Left",  rsi_sl_l_avg, row.get("rsi_single_left_gct_avg"), row.get("rsi_single_left_category")),
                ("Single-Leg Right", rsi_sl_r_avg, row.get("rsi_single_right_gct_avg"),row.get("rsi_single_right_category")),
            ]:
                if avg is not None:
                    rsi_rows.append([
                        label,
                        sf(avg, ".2f"),
                        sf(gct, ".3f") if gct is not None else "N/A",
                        cat or "N/A",
                    ])

            rsi_el.append(rsi_data_table(rsi_rows))
            rsi_el.append(Spacer(1, 5))

            # Contextual insights
            for p in _rsi_insight_text(row):
                rsi_el.append(p)

            rsi_el.append(Spacer(1, 4))

        if has_dj:
            dj_rows = [["Box Height", "RSI", "Jump Ht (cm)", "GCT (s)"]]
            optimal = row.get("dj_optimal_height")
            for h, rsi_val, ht_key, gct_key in [
                (40, dj_40, "dj_40_jump_ht", "dj_40_gct"),
                (50, dj_50, "dj_50_jump_ht", "dj_50_gct"),
                (60, dj_60, "dj_60_jump_ht", "dj_60_gct"),
            ]:
                if rsi_val is not None:
                    label = f"{h} cm {'★' if str(optimal) == str(h) else ''}"
                    dj_rows.append([
                        label,
                        sf(rsi_val, ".2f"),
                        sf(row.get(ht_key), ".1f") if row.get(ht_key) is not None else "N/A",
                        sf(row.get(gct_key), ".3f") if row.get(gct_key) is not None else "N/A",
                    ])
            rsi_el.append(Paragraph("<b>Drop Jump RSI</b>", ps("dj_hdr", size=9, bold=True)))
            rsi_el.append(Spacer(1, 2))
            rsi_el.append(rsi_data_table(dj_rows))
            if optimal and row.get("dj_best_rsi") is not None:
                dj_cat = row.get("dj_best_category") or ""
                rsi_el.append(Spacer(1, 3))
                rsi_el.append(Paragraph(
                    f"<b>Optimal drop height:</b>  {optimal} cm — "
                    f"RSI {sf(row.get('dj_best_rsi'), '.2f')}  {('(' + dj_cat + ')') if dj_cat else ''}",
                    S_BODY,
                ))
            rsi_el.append(Spacer(1, 4))

        el.append(KeepTogether(rsi_el))

    # ── Performance Radar ─────────────────────────────────────
    radar = build_radar_chart(
        accel, maxv, power_overall, maint,
        width_mm=100, height_mm=90,
        accel_val=row.get("0_20"),
        maxv_val=row.get("fly10") or row.get("peak_velocity_segment"),
        power_val=row.get("cmj_cm"),
        gender=str(row.get("gender", "male")).lower(),
    )
    radar_table = Table([[radar]], colWidths=[CONTENT_W])
    radar_table.setStyle(TableStyle([
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    el.append(KeepTogether([
        section_bar("PERFORMANCE RADAR"),
        Spacer(1, 4),
        radar_table,
        Spacer(1, 5),
    ]))

    # ── Section 3: Performance Summary ───────────────────────
    summary_el = [
        section_bar("PERFORMANCE SUMMARY"),
        Spacer(1, 4),
    ]
    for p in _sprint_insight_paragraphs(row):
        summary_el.append(p)
    summary_el.append(Spacer(1, 5))
    el.append(KeepTogether(summary_el))

    # ── Section 4: Overall Rating ─────────────────────────────
    overall_block = [
        section_bar("OVERALL RATING"),
        Spacer(1, 5),
        score_box(amsc_score),
        Spacer(1, 6),
        scorecard_table(accel, maxv, power_overall, maint),
        Spacer(1, 3),
    ]

    flag = row.get("primary_imbalance_flag", "")
    if isinstance(flag, str) and flag.strip():
        overall_block.append(
            Paragraph(f"<b>Primary Imbalance:</b>  {flag}", S_IMBAL)
        )

    el.append(KeepTogether(overall_block))

    return el, name, sport


def generate_pdf_bytes(result: dict, logo=None) -> io.BytesIO:
    """
    Generate a PDF report into memory and return a BytesIO buffer.
    Use this for website/serverless delivery — no filesystem writes.

    Args:
        result: dict from evaluate_athlete()
        logo:   optional path to logo file (defaults to LOGO_PATH from settings)

    Returns:
        BytesIO buffer positioned at 0, ready to read or stream.
    """
    row = pd.Series(result)
    el, name, sport = _build_pdf_elements(row, logo=logo)

    buffer = io.BytesIO()

    def on_page(canv, doc):
        draw_chrome(canv, doc, name, sport)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=L_MAR, rightMargin=R_MAR,
        topMargin=9 * mm + 9 * mm,
        bottomMargin=B_MAR + 6 * mm,
        onFirstPage=on_page,
        onLaterPages=on_page,
    )
    doc.build(el)
    buffer.seek(0)
    return buffer


def generate_pdf_for_athlete(row: pd.Series, output_path: Path, logo=None):
    """
    Generate a PDF report and write it to a file path.
    Use this for local/Streamlit use.

    Args:
        row:         pd.Series (one row from results DataFrame)
        output_path: Path or str to write the PDF to
        logo:        optional path to logo file (defaults to LOGO_PATH from settings)
    """
    el, name, sport = _build_pdf_elements(row, logo=logo)

    def on_page(canv, doc):
        draw_chrome(canv, doc, name, sport)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=L_MAR, rightMargin=R_MAR,
        topMargin=9 * mm + 9 * mm,
        bottomMargin=B_MAR + 6 * mm,
        onFirstPage=on_page,
        onLaterPages=on_page,
    )
    doc.build(el)


# ── Entry point ───────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(MASTER_XLSX)
    success = failed = 0
    for _, row in df.iterrows():
        safe_name = str(row["name"]).replace(" ", "_")
        pdf_path  = OUTPUT_DIR / f"{safe_name}_performance_report.pdf"
        try:
            generate_pdf_for_athlete(row, pdf_path)
            print(f"✅ Generated  ->  {pdf_path.name}")
            success += 1
        except Exception as e:
            print(f"❌ Failed     ->  {row.get('name', 'Unknown')}: {e}")
            failed += 1
    print(f"\nDone. {success} generated, {failed} failed.")


if __name__ == "__main__":
    main()