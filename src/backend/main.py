from fastapi import FastAPI, UploadFile, File, Form
import pandas as pd

# Load environment variables
from dotenv import load_dotenv
import os

load_dotenv()

# Import your modules
from analyzer.quality import analyze_dataset
from analyzer.suggestions import generate_column_suggestions
from ai.openrouter import get_ai_insights

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


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        # Read dataset
        df = pd.read_csv(file.file, on_bad_lines='skip')

        # Run analysis
        analysis = analyze_dataset(df)

        # Column-wise suggestions (AI does not auto-apply; only proposes)
        suggestions = generate_column_suggestions(df)

        # Get AI insights
        ai_output = get_ai_insights(analysis)

        # Debug print
        print("AI OUTPUT:", ai_output)

        return {
            "analysis": analysis,
            "ai_insights": ai_output,
            "suggestions": suggestions,
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