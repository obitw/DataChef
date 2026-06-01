import io
import numpy as np
import pandas as pd


def _to_python(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, list):
        return [_to_python(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    return obj


LOADERS = {
    "csv": lambda data: pd.read_csv(io.StringIO(data)),
    "json": lambda data: pd.read_json(io.StringIO(data)),
}

OPERATORS = {
    ">":  lambda col, val: col > val,
    "<":  lambda col, val: col < val,
    ">=": lambda col, val: col >= val,
    "<=": lambda col, val: col <= val,
    "==": lambda col, val: col == val,
    "!=": lambda col, val: col != val,
}

AGG_FUNCTIONS = {
    "sum":    lambda s: s.sum(),
    "avg":    lambda s: s.mean(),
    "median": lambda s: s.median(),
    "min":    lambda s: s.min(),
    "max":    lambda s: s.max(),
    "count":  lambda s: int(s.count()),
}

PANDAS_AGG = {
    "sum": "sum", "avg": "mean", "median": "median",
    "min": "min", "max": "max", "count": "count",
}


def load_dataframe(raw_data: str, fmt: str) -> pd.DataFrame:
    return LOADERS[fmt](raw_data)


def apply_filter(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    mask = OPERATORS[op["operator"]](df[op["column"]], op["value"])
    return df[mask]


def apply_aggregate(df: pd.DataFrame, op: dict) -> dict:
    return _to_python({
        col: {fn: AGG_FUNCTIONS[fn](df[col]) for fn in op["functions"]}
        for col in op["columns"]
    })


def apply_group_by(df: pd.DataFrame, op: dict) -> list[dict]:
    by = op["by"]
    agg_col = op["aggregate"]["column"]
    agg_fn = op["aggregate"]["function"]
    grouped = df.groupby(by)[agg_col].agg(PANDAS_AGG[agg_fn]).reset_index()
    grouped.columns = [by, agg_fn]
    return _to_python(grouped.to_dict(orient="records"))


def apply_select(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    return df[op["columns"]]


def apply_sort(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    return df.sort_values(by=op["column"], ascending=(op.get("order", "asc") == "asc"))


def apply_limit(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    return df.head(op["n"])


def apply_deduplicate(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    return df.drop_duplicates(subset=op["columns"], keep="first")


TERMINAL_OPS = {
    "aggregate": apply_aggregate,
    "group_by":  apply_group_by,
}

TRANSFORM_OPS = {
    "filter":      apply_filter,
    "select":      apply_select,
    "sort":        apply_sort,
    "limit":       apply_limit,
    "deduplicate": apply_deduplicate,
}


def run_pipeline(raw_data: str, fmt: str, pipeline: list[dict]):
    df = load_dataframe(raw_data, fmt)

    for step in pipeline:
        op = step["op"]
        if op in TERMINAL_OPS:
            return TERMINAL_OPS[op](df, step)
        df = TRANSFORM_OPS[op](df, step)

    return _to_python(df.to_dict(orient="records"))
