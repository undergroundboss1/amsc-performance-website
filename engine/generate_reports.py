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


def build_radar_chart(
    accel: str,
    maxv:  str,
    power: Optional[str],
    maint: Optional[str],
    width_mm: float,
    height_mm: float,
) -> Image:
    labels = ["Acceleration", "Max Velocity", "Power", "Speed\nMaintenance"]
    values = [
        _tier_numeric(accel),
        _tier_numeric(maxv),
        _tier_numeric(power) if power else 0,
        {"Efficient": 3, "Moderate Drop-Off": 2}.get(maint, 1) if maint else 0,
    ]

    N = len(labels)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    values_plot = values + [values[0]]
    angles_plot = angles + [angles[0]]

    fig, ax = plt.subplots(figsize=(width_mm / 25.4, height_mm / 25.4),
                           subplot_kw=dict(polar=True))
    fig.patch.set_facecolor("white")

    ax.set_ylim(0, 3)
    ax.set_yticks([1, 2, 3])
    ax.set_yticklabels(["Developing", "Competitive", "Advanced"],
                       fontsize=6, color="#888888")
    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontsize=7.5, color="#333333")

    ax.plot(angles_plot, values_plot, color=CHART_LINE, linewidth=2)
    ax.fill(angles_plot, values_plot, color=CHART_LINE, alpha=0.18)

    for ang, val, lbl in zip(angles, values, labels):
        if val == 0:
            ax.scatter(ang, 0.1, color="#CCCCCC", s=30, zorder=4,
                       edgecolors="white", linewidth=0.8)
        else:
            c = CHART_GREEN if val == 3 else CHART_YELLOW if val == 2 else CHART_RED
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
        "ScoreValue", fontName="Helvetica-Bold", fontSize=20,
        textColor=colour, alignment=1, spaceAfter=0,
    )
    t = Table([
        [Paragraph("AMSC PERFORMANCE SCORE", label_style)],
        [Paragraph(f"{score} / 100", value_style)],
    ], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
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
    cmj_val   = sf(row.get("cmj_cm"),   ".0f")
    broad_val = sf(row.get("broad_cm"), ".0f")

    power_rows = [["Test", "Score"]]
    power_rows.append(["CMJ",        f"{cmj_val} cm"   if cmj_val   != "N/A" else "N/A — not collected"])
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

            rsi_el.append(data_table(rsi_rows))
            rsi_el.append(Spacer(1, 4))

            # Asymmetry line
            asym_pct  = row.get("rsi_asymmetry_pct")
            asym_flag = row.get("rsi_asymmetry_flag")
            asym_side = row.get("rsi_dominant_side")
            if asym_pct is not None:
                if asym_flag:
                    rsi_el.append(Paragraph(
                        f"<b>Bilateral Asymmetry:</b>  {asym_side or 'Unknown'} dominant  "
                        f"({sf(asym_pct, '.1f')}%)",
                        ps("asym_warn", size=9, color=AMBER),
                    ))
                else:
                    rsi_el.append(Paragraph(
                        f"<b>Bilateral balance:</b>  Within acceptable range  "
                        f"({sf(asym_pct, '.1f')}% asymmetry)",
                        ps("asym_ok", size=9, color=MGREY),
                    ))

            # Power profile type
            ppt = row.get("power_profile_type")
            if ppt:
                rsi_el.append(Paragraph(f"<b>Power profile:</b>  {ppt}", S_BODY))

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
            rsi_el.append(data_table(dj_rows))
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
    radar = build_radar_chart(accel, maxv, power_overall, maint,
                              width_mm=100, height_mm=90)
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
    el.append(KeepTogether([
        section_bar("PERFORMANCE SUMMARY"),
        Spacer(1, 3),
        Paragraph(f"<b>Primary Strength:</b>  {blk['strength']}", S_BODY),
        Spacer(1, 2),
        Paragraph(f"<b>Primary Development Focus:</b>  {blk['dev']}", S_BODY),
        Spacer(1, 2),
        Paragraph("<b>Recommended Focus Block:</b>", S_BODY),
        Paragraph(f"- {blk['focus']}", S_BODY),
        Spacer(1, 5),
    ]))

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