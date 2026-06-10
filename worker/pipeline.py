import io
import math
import numpy as np
import pandas as pd


def _to_python(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, list):
        return [_to_python(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    return obj


LOADERS = {
    "csv": lambda data: pd.read_csv(io.StringIO(data), sep=None, engine="python"),
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


class PipelineError(Exception):
    pass


def run_pipeline(raw_data: str, fmt: str, pipeline: list[dict]):
    try:
        df = load_dataframe(raw_data, fmt)
    except Exception as exc:
        raise PipelineError(f"Impossible de lire les données ({fmt}) : {exc}") from exc

    for i, step in enumerate(pipeline):
        op = step.get("op", "?")
        label = f"Étape {i + 1} ({op})"
        try:
            if op in TERMINAL_OPS:
                return TERMINAL_OPS[op](df, step)
            elif op in TRANSFORM_OPS:
                df = TRANSFORM_OPS[op](df, step)
            else:
                raise PipelineError(f"Opération inconnue : '{op}'")
        except PipelineError:
            raise
        except KeyError as exc:
            raise PipelineError(f"{label} : colonne {exc} introuvable dans le dataset") from exc
        except TypeError as exc:
            raise PipelineError(f"{label} : type incompatible — {exc}") from exc
        except Exception as exc:
            raise PipelineError(f"{label} : {exc}") from exc

    return _to_python(df.to_dict(orient="records"))
