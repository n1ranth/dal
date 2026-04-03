from fastapi import FastAPI, UploadFile, File, Form
import pandas as pd

# Load environment variables
from dotenv import load_dotenv
import os

load_dotenv()

# Import your modules
from analyzer.quality import analyze_dataset
from analyzer.suggestions import generate_column_suggestions
from ai.openrouter import get_ai_report, has_real_openrouter_key

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Dataset Analyzer API running"}


def _format_sections_as_text(sections: dict[str, list[str]]) -> str:
    lines: list[str] = []
    ordered = ["ABOUT DATASET", "RISKS", "BIAS", "CLEANING", "ML IMPACT", "METADATA"]
    for section in ordered:
        lines.append(f"{section}:")
        items = sections.get(section, [])
        if not items:
            lines.append("- No additional insights.")
        else:
            for item in items:
                lines.append(f"- {item}")
        lines.append("")
    return "\n".join(lines).strip()


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        if not has_real_openrouter_key():
            return Response(
                content=json.dumps(
                    {
                        "error": "AI API is not connected. Set OPENROUTER_API_KEY to run analysis.",
                        "ai_status": "disabled_missing_key",
                    }
                ),
                status_code=503,
                media_type="application/json",
            )

        # Read dataset
        df = pd.read_csv(file.file, on_bad_lines='skip')

        # Run local scripts only as signal extraction for AI.
        local_analysis = analyze_dataset(df)
        local_suggestions = generate_column_suggestions(df)

        # AI returns the final score/risk assessment using extracted signals.
        ai_report = get_ai_report(local_analysis, local_suggestions)
        local_analysis["quality_score"] = ai_report["quality_score"]
        local_analysis["risk_flags"] = ai_report["risk_flags"]
        ai_output = _format_sections_as_text(ai_report["sections"])

        # Let the AI also decide per-suggestion confidence (fallback to local if missing).
        suggestions_conf_map = ai_report.get("suggestions_confidence_by_key", {})
        for s in local_suggestions:
            try:
                key = f"{s.get('column')}::{s.get('fill_method')}"
                conf = suggestions_conf_map.get(key)
                if conf:
                    s["confidence"] = conf.get("confidence", s.get("confidence"))
                    if conf.get("reason"):
                        s["reason"] = conf.get("reason")
            except Exception:
                continue

        return {
            "analysis": local_analysis,
            "ai_insights": ai_output,
            "ai_status": "enabled",
            "suggestions": local_suggestions,
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/apply_suggestions")
async def apply_suggestions(
    file: UploadFile = File(...),
    applied: str = Form(...),
):
    """
    applied: JSON array of objects:
      [{ "column": "colname", "fill_method": "median"|"mode"|"minmax" }, ...]

    Returns: CSV bytes with transformations applied.
    """
    try:
        applied_list = json.loads(applied)
        if not isinstance(applied_list, list):
            return Response(
                content="Invalid payload",
                status_code=400,
                media_type="text/plain",
            )

        df = pd.read_csv(file.file, on_bad_lines="skip")

        for item in applied_list:
            if not isinstance(item, dict):
                continue
            col = item.get("column")
            fill_method = item.get("fill_method")
            if not col or fill_method not in ("median", "mode", "minmax"):
                continue
            if col not in df.columns:
                continue

            series = df[col]
            if fill_method == "median":
                numeric = pd.to_numeric(series, errors="coerce")
                median = numeric.median()
                df[col] = series.where(~series.isna(), median)
            elif fill_method == "mode":
                non_null = series.dropna()
                if non_null.empty:
                    fill_value = ""
                else:
                    fill_value = non_null.mode().iloc[0]
                df[col] = series.fillna(fill_value)
            else:
                numeric = pd.to_numeric(series, errors="coerce")
                vmin = numeric.min()
                vmax = numeric.max()
                if pd.isna(vmin) or pd.isna(vmax) or float(vmax) <= float(vmin):
                    df[col] = numeric
                else:
                    df[col] = (numeric - vmin) / (vmax - vmin)

        csv_text = df.to_csv(index=False)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="updated_dataset.csv"'},
        )
    except Exception as e:
        return Response(
            content=str(e),
            status_code=500,
            media_type="text/plain",
        )