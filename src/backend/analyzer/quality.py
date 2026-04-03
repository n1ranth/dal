import pandas as pd
from scipy.stats import zscore

from analyzer.label_column import pick_label_column


def analyze_dataset(df: pd.DataFrame):
    result = {}

    total_rows = len(df)

    # ------------------------
    # 1. Basic Info
    # ------------------------
    result["dataset_info"] = {
        "rows": total_rows,
        "columns": df.shape[1],
        "column_names": df.columns.tolist()
    }

    # ------------------------
    # 1b. Column Metadata
    # ------------------------
    column_metadata = {}
    for col in df.columns:
        series = df[col]
        non_null = int(series.notna().sum())
        null_count = int(series.isna().sum())
        unique_count = int(series.nunique(dropna=True))

        meta = {
            "dtype": str(series.dtype),
            "non_null_count": non_null,
            "null_count": null_count,
            "unique_count": unique_count,
            "null_percent": round((null_count / total_rows) * 100, 2) if total_rows else 0,
        }

        # Small sample values for display/context (JSON serializable)
        sample_values = (
            series.dropna().astype(str).head(3).tolist()
            if non_null > 0
            else []
        )
        meta["sample_values"] = sample_values

        # Numeric summary for model/debugging
        if pd.api.types.is_numeric_dtype(series):
            valid = pd.to_numeric(series, errors="coerce").dropna()
            if not valid.empty:
                meta["min"] = round(float(valid.min()), 4)
                meta["max"] = round(float(valid.max()), 4)
                meta["mean"] = round(float(valid.mean()), 4)

        column_metadata[col] = meta

    result["column_metadata"] = column_metadata

    # ------------------------
    # 2. Missing Values (%)
    # ------------------------
    missing = df.isnull().sum()

    missing_info = {}
    risk_flags = []

    for col, val in missing.items():
        percent = (val / total_rows) * 100

        missing_info[col] = {
            "missing_count": int(val),
            "missing_percent": round(percent, 2)
        }

        if percent > 30:
            risk_flags.append(f"High missing values in column '{col}'")

    result["missing_analysis"] = missing_info

    # ------------------------
    # 3. Duplicates
    # ------------------------
    duplicates = int(df.duplicated().sum())
    result["duplicates"] = duplicates

    if duplicates > 0:
        risk_flags.append(f"{duplicates} duplicate rows found")

    # ------------------------
    # 4. Class distribution (imbalance) — not only "target"
    # ------------------------
    label_col = pick_label_column(df)
    result["class_distribution_column"] = label_col

    if label_col is not None:
        class_dist = df[label_col].value_counts(normalize=True, dropna=True)
        class_dist_dict = {str(k): float(v) for k, v in class_dist.to_dict().items()}
        result["class_distribution"] = class_dist_dict

        counts = df[label_col].value_counts(dropna=True)
        if len(counts) >= 2:
            max_c = int(counts.max())
            min_c = int(counts.min())
            tot = int(counts.sum())
            imbalance_ratio = float(max_c / min_c) if min_c > 0 else None
            max_share = float(counts.iloc[0] / tot) if tot else 0.0
            is_imbalanced = max_share > 0.5 or (
                imbalance_ratio is not None and imbalance_ratio >= 3.0
            )
            result["class_distribution_imbalance"] = {
                "imbalance_ratio": round(imbalance_ratio, 2)
                if imbalance_ratio is not None
                else None,
                "max_class_share": round(max_share, 4),
                "is_imbalanced": bool(is_imbalanced),
            }
        else:
            result["class_distribution_imbalance"] = {
                "imbalance_ratio": None,
                "max_class_share": None,
                "is_imbalanced": False,
            }

        if class_dist_dict and max(class_dist_dict.values()) > 0.8:
            risk_flags.append("Severe class imbalance detected")
    else:
        result["class_distribution"] = "No label-like column found"
        result["class_distribution_imbalance"] = None

    # ------------------------
    # 5. Outliers
    # ------------------------
    numeric_df = df.select_dtypes(include='number')
    outlier_info = {}

    if not numeric_df.empty and len(numeric_df) > 1:
        z_scores = abs(zscore(numeric_df, nan_policy='omit'))
        outliers = (z_scores > 3).sum(axis=0)

        for col, val in zip(numeric_df.columns, outliers):
            percent = (val / total_rows) * 100

            outlier_info[col] = {
                "outlier_count": int(val),
                "outlier_percent": round(percent, 2)
            }

            if percent > 5:
                risk_flags.append(f"High outliers in column '{col}'")

    result["outlier_analysis"] = outlier_info

    # ------------------------
    # 6. Quality Score 🔥
    # ------------------------
    score = 100

    # penalties
    total_missing_percent = (missing.sum() / (total_rows * len(df.columns))) * 100
    score -= total_missing_percent

    if duplicates > 0:
        score -= 5

    if "Severe class imbalance detected" in risk_flags:
        score -= 10

    result["quality_score"] = max(0, round(score, 2))

    # ------------------------
    # 7. Risk Flags 🚨
    # ------------------------
    result["risk_flags"] = risk_flags

    return result