import pandas as pd
from typing import Literal, TypedDict


Confidence = Literal["high", "medium", "low"]
FillMethod = Literal["median", "mode", "minmax"]
SuggestionKind = Literal["impute", "normalize"]


class ColumnSuggestion(TypedDict, total=False):
    column: str
    suggestion_kind: SuggestionKind
    missing_percent: float
    suggested_fix: str
    confidence: Confidence
    fill_method: FillMethod
    reason: str


def _confidence_from_missing_percent(missing_percent: float) -> Confidence:
    if missing_percent <= 15:
        return "high"
    if missing_percent <= 35:
        return "medium"
    return "low"


def _format_value(value: object) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass

    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return str(round(value, 4)).rstrip("0").rstrip(".")

    return str(value)


def _should_suggest_minmax(series: pd.Series) -> bool:
    """
    Advanced ML-prep only: numeric, wide range AND high spread relative to range.
    """
    if not pd.api.types.is_numeric_dtype(series):
        return False

    v = pd.to_numeric(series, errors="coerce").dropna()
    if len(v) < 3:
        return False

    vmin = float(v.min())
    vmax = float(v.max())
    rng = vmax - vmin
    if rng < 1e-9:
        return False

    mean = float(v.mean())
    std = float(v.std())

    scale = max(abs(vmax), abs(vmin), 1e-9)
    relative_range = rng / scale
    wide_range = relative_range > 0.45 or rng > 150.0

    # High variance: std meaningful vs range (and vs mean when applicable)
    std_vs_range = std / (rng + 1e-9)
    high_spread = std_vs_range > 0.12
    if abs(mean) > 1e-9:
        cv = abs(std / mean)
        high_spread = high_spread or cv > 0.35

    return bool(wide_range and high_spread)


def generate_column_suggestions(df: pd.DataFrame) -> list[ColumnSuggestion]:
    total_rows = len(df)
    if total_rows == 0:
        return []

    missing_counts = df.isna().sum()
    suggestions: list[ColumnSuggestion] = []

    # --- Missing-value imputation (basic) ---
    for col, missing_count in missing_counts.items():
        missing_percent = (missing_count / total_rows) * 100
        if missing_percent <= 0:
            continue

        series = df[col]
        confidence = _confidence_from_missing_percent(missing_percent)

        if pd.api.types.is_numeric_dtype(series):
            numeric = pd.to_numeric(series, errors="coerce")
            median = numeric.median()
            fill_method: FillMethod = "median"
            suggested_fix = f"Fill with median ({_format_value(median)})"
        else:
            mode_series = series.dropna()
            if mode_series.empty:
                mode = ""
            else:
                mode = mode_series.mode().iloc[0]
            fill_method = "mode"
            suggested_fix = f"Fill with mode ({_format_value(mode)})"

        suggestions.append(
            {
                "column": str(col),
                "suggestion_kind": "impute",
                "missing_percent": round(float(missing_percent), 2),
                "suggested_fix": suggested_fix,
                "confidence": confidence,
                "fill_method": fill_method,
                "reason": "",
            }
        )

    # --- Min–Max normalization (advanced ML-prep only) ---
    seen_norm: set[str] = set()
    for col in df.columns:
        series = df[col]
        ckey = str(col)
        if ckey in seen_norm:
            continue
        if not pd.api.types.is_numeric_dtype(series):
            continue
        if not _should_suggest_minmax(series):
            continue
        seen_norm.add(ckey)
        suggestions.append(
            {
                "column": str(col),
                "suggestion_kind": "normalize",
                "missing_percent": 0.0,
                "suggested_fix": "Normalize values using Min-Max scaling",
                "confidence": "medium",
                "fill_method": "minmax",
                "reason": "Wide value range detected",
            }
        )

    suggestions.sort(
        key=lambda s: (
            0 if s.get("suggestion_kind") == "impute" else 1,
            -(s.get("missing_percent") or 0),
            s["column"],
        )
    )
    return suggestions
