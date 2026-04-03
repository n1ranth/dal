"""Pick a column whose value distribution is useful for a 'class balance' style chart."""

from __future__ import annotations

import pandas as pd


PREFERRED_LABEL_NAMES = (
    "target",
    "label",
    "labels",
    "y",
    "class",
    "classes",
    "outcome",
    "category",
    "categories",
)


def pick_label_column(df: pd.DataFrame) -> str | None:
    """
    1) Prefer common supervised-learning label names (case-insensitive).
    2) Else pick a low-cardinality column that does not look like a row id.
    """
    if df is None or df.empty or not len(df.columns):
        return None

    lower_to_actual = {str(c).lower(): c for c in df.columns}
    for name in PREFERRED_LABEL_NAMES:
        if name in lower_to_actual:
            return lower_to_actual[name]

    n_rows = len(df)
    best_col: str | None = None
    best_key: tuple[int, int] | None = None

    for col in df.columns:
        series = df[col]
        non_null = series.notna().sum()
        if non_null < 2:
            continue

        n_unique = int(series.nunique(dropna=True))
        if n_unique < 2:
            continue

        # Skip columns that are almost unique per row (IDs, timestamps as strings, etc.)
        if n_unique / n_rows > 0.35:
            continue

        max_classes = min(80, max(12, n_rows // 25))
        if n_unique > max_classes:
            continue

        is_object_like = pd.api.types.is_object_dtype(series) or pd.api.types.is_categorical_dtype(
            series
        )
        is_bool = pd.api.types.is_bool_dtype(series)
        is_int = pd.api.types.is_integer_dtype(series)

        # Prefer string/category/bool; allow small-integer encodings (e.g. 0,1,2)
        if is_object_like or is_bool:
            type_rank = 0
        elif is_int:
            type_rank = 1
        else:
            type_rank = 2

        # Prefer fewer categories (clearer chart), then "more label-like" dtype
        key = (type_rank, n_unique)
        if best_key is None or key < best_key:
            best_key = key
            best_col = col

    return best_col
