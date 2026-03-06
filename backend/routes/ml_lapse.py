"""
ML Lapse Prediction — Logistic Regression trained from scratch
==============================================================
No scikit-learn. No numpy. Pure Python stdlib only.

Training data : FY2022 + FY2023 actual utilization records
Prediction    : FY2024 — will this department lapse (utilization < 80%)?

Features (8 total):
  q1_spend_ratio        — Q1 spend as fraction of annual allocation
  q2_spend_ratio        — Q2 spend as fraction of annual allocation
  q3_spend_ratio        — Q3 spend as fraction of annual allocation
  vendor_diversity      — number of unique vendors used (normalised)
  avg_tx_size           — average single transaction size (normalised)
  scheme_type           — 1 = capital, 0 = revenue
  ddo_count             — number of DDOs in the department (normalised)
  q4_ratio_prev         — Q4 spend as fraction of total spend (0 in prediction target year)

Model: Logistic Regression with L2 regularisation, batch gradient descent
       Decision threshold: 0.50
       Training: 300 epochs, lr=0.05, λ=0.01
"""

from fastapi import APIRouter
from collections import defaultdict
from math import exp, log, sqrt

router = APIRouter()
DATA   = {}   # injected by main.py

FEATURE_NAMES = [
    "q1_spend_ratio",
    "q2_spend_ratio",
    "q3_spend_ratio",
    "vendor_diversity",
    "avg_tx_size",
    "scheme_type",
    "ddo_count",
    "q4_ratio_prev",
]

LAPSE_THRESHOLD     = 0.80   # utilization < 80% = lapsed
DECISION_THRESHOLD  = 0.50   # probability >= 0.5 = predicted lapse
LR                  = 0.05
EPOCHS              = 300
L2_LAMBDA           = 0.01


# ── Pure-Python Logistic Regression primitives ───────────────────────────────

def _sigmoid(z: float) -> float:
    if z < -500: return 1e-9
    if z >  500: return 1.0 - 1e-9
    return 1.0 / (1.0 + exp(-z))


def _dot(w: list, x: list) -> float:
    return sum(wi * xi for wi, xi in zip(w, x))


def _normalize_fit(X: list) -> tuple:
    """Return (X_norm, means, stds) — fit on training set."""
    n_feat = len(X[0])
    means, stds = [], []
    for j in range(n_feat):
        col = [X[i][j] for i in range(len(X))]
        m   = sum(col) / len(col)
        s   = sqrt(sum((v - m) ** 2 for v in col) / len(col)) or 1.0
        means.append(m)
        stds.append(s)
    X_n = [[(X[i][j] - means[j]) / stds[j] for j in range(n_feat)]
           for i in range(len(X))]
    return X_n, means, stds


def _normalize_transform(row: list, means: list, stds: list) -> list:
    return [(row[j] - means[j]) / stds[j] for j in range(len(row))]


def _train(X: list, y: list) -> tuple:
    """Batch gradient descent with L2 regularisation. Returns (weights, bias)."""
    n, n_feat = len(X), len(X[0])
    w = [0.0] * n_feat
    b = 0.0

    for _ in range(EPOCHS):
        dw = [0.0] * n_feat
        db = 0.0
        for xi, yi in zip(X, y):
            pred = _sigmoid(_dot(w, xi) + b)
            err  = pred - yi
            for j in range(n_feat):
                dw[j] += err * xi[j]
            db += err
        for j in range(n_feat):
            w[j] -= LR * (dw[j] / n + L2_LAMBDA * w[j])
        b -= LR * (db / n)

    return w, b


def _log_loss(y_true: list, probs: list) -> float:
    eps = 1e-9
    return -sum(
        yi * log(max(p, eps)) + (1 - yi) * log(max(1 - p, eps))
        for yi, p in zip(y_true, probs)
    ) / len(y_true)


# ── Feature Engineering ───────────────────────────────────────────────────────

def _extract_features(year: str) -> list:
    """Build one feature row per department for the given fiscal year."""
    transactions = DATA["transactions"]
    allocations  = DATA["allocations"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    ddo_to_dept  = {d["ddo_code"]: d["dept_id"] for d in ddos}
    dept_to_ddos = defaultdict(set)
    for d in ddos:
        dept_to_ddos[d["dept_id"]].add(d["ddo_code"])

    # Monthly spend, vendor diversity, tx stats per dept
    dept_monthly:   dict = defaultdict(lambda: defaultdict(float))
    dept_vendors:   dict = defaultdict(set)
    dept_tx_total:  dict = defaultdict(float)
    dept_tx_count:  dict = defaultdict(int)

    for t in transactions:
        if not t["release_date"].startswith(year):
            continue
        dept_id = ddo_to_dept.get(t["ddo_code"])
        if not dept_id:
            continue
        mm  = t["release_date"][5:7]
        amt = float(t["amount"])
        dept_monthly[dept_id][mm] += amt
        dept_vendors[dept_id].add(t["vendor_id"])
        dept_tx_total[dept_id]    += amt
        dept_tx_count[dept_id]    += 1

    # Allocations per dept
    dept_alloc: dict = defaultdict(float)
    for a in allocations:
        if a["fiscal_year"] == year:
            dept_alloc[a["dept_id"]] += float(a["allocated_amount"])

    rows = []
    for dept in departments:
        did   = dept["id"]
        alloc = dept_alloc.get(did, 0.0)
        if alloc == 0:
            continue

        q1  = sum(dept_monthly[did].get(f"{m:02d}", 0) for m in [1, 2, 3])
        q2  = sum(dept_monthly[did].get(f"{m:02d}", 0) for m in [4, 5, 6])
        q3  = sum(dept_monthly[did].get(f"{m:02d}", 0) for m in [7, 8, 9])
        q4  = sum(dept_monthly[did].get(f"{m:02d}", 0) for m in [10, 11, 12])
        tot = q1 + q2 + q3 + q4

        vendor_div = len(dept_vendors[did])
        tx_cnt     = dept_tx_count[did]
        avg_tx     = dept_tx_total[did] / tx_cnt if tx_cnt > 0 else 0.0
        ddo_cnt    = len(dept_to_ddos[did])
        scheme     = 1.0 if dept.get("scheme_type") == "capital" else 0.0
        q4_ratio   = q4 / tot if tot > 0 else 0.0

        final_util = tot / alloc
        lapsed     = 1 if final_util < LAPSE_THRESHOLD else 0

        rows.append({
            "dept_id":           did,
            "name":              dept["name"],
            "ministry":          dept.get("ministry", ""),
            "scheme_type_label": dept.get("scheme_type", ""),
            "features":          [
                q1 / alloc,     # q1_spend_ratio
                q2 / alloc,     # q2_spend_ratio
                q3 / alloc,     # q3_spend_ratio
                vendor_div,     # vendor_diversity (raw — normalised globally)
                avg_tx,         # avg_tx_size       (raw — normalised globally)
                scheme,         # scheme_type
                ddo_cnt,        # ddo_count          (raw — normalised globally)
                q4_ratio,       # q4_ratio_prev
            ],
            "final_utilization_pct": round(final_util * 100, 1),
            "lapsed":                lapsed,
        })
    return rows


# ── Model training (lazy, done once per request; fast on 43k rows) ────────────

def _run_model() -> dict:
    # ── Load all labelled data (FY2022 + FY2023) ─────────────────────────────
    all_rows: list = []
    for year in ["2022", "2023"]:
        all_rows.extend(_extract_features(year))

    if len(all_rows) < 10:
        return {"error": "Insufficient training data (need FY2022 + FY2023 records)"}

    # ── Stratified 80/20 train/validation split ───────────────────────────────
    # Separate by class to preserve label balance in both splits.
    import random as _random
    rng = _random.Random(42)               # deterministic — same split every run

    pos = [r for r in all_rows if r["lapsed"] == 1]
    neg = [r for r in all_rows if r["lapsed"] == 0]
    rng.shuffle(pos)
    rng.shuffle(neg)

    def _split80(lst):
        cut = max(1, int(len(lst) * 0.8))
        return lst[:cut], lst[cut:]

    pos_train, pos_val = _split80(pos)
    neg_train, neg_val = _split80(neg)

    train_rows = pos_train + neg_train
    val_rows   = pos_val   + neg_val
    rng.shuffle(train_rows)
    rng.shuffle(val_rows)

    X_train_raw = [r["features"] for r in train_rows]
    y_train     = [r["lapsed"]   for r in train_rows]
    X_val_raw   = [r["features"] for r in val_rows]
    y_val       = [r["lapsed"]   for r in val_rows]

    # Normalise — fit ONLY on train, transform both
    X_train, means, stds = _normalize_fit(X_train_raw)
    X_val                = [_normalize_transform(x, means, stds) for x in X_val_raw]

    # ── Train ─────────────────────────────────────────────────────────────────
    weights, bias = _train(X_train, y_train)

    # ── Training-set metrics ──────────────────────────────────────────────────
    train_probs = [_sigmoid(_dot(weights, xi) + bias) for xi in X_train]
    train_preds = [1 if p >= DECISION_THRESHOLD else 0 for p in train_probs]
    train_acc   = sum(tp == ta for tp, ta in zip(train_preds, y_train)) / len(y_train)
    train_loss  = _log_loss(y_train, train_probs)

    # ── Validation-set metrics (held-out, NEVER seen during training) ─────────
    val_probs = [_sigmoid(_dot(weights, xi) + bias) for xi in X_val]
    val_preds = [1 if p >= DECISION_THRESHOLD else 0 for p in val_probs]
    val_acc   = sum(vp == va for vp, va in zip(val_preds, y_val)) / len(y_val) if y_val else 0
    val_loss  = _log_loss(y_val, val_probs) if y_val else 0

    # Confusion matrix on validation set
    tp = sum(1 for p, a in zip(val_preds, y_val) if p == 1 and a == 1)
    tn = sum(1 for p, a in zip(val_preds, y_val) if p == 0 and a == 0)
    fp = sum(1 for p, a in zip(val_preds, y_val) if p == 1 and a == 0)
    fn = sum(1 for p, a in zip(val_preds, y_val) if p == 0 and a == 1)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1        = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0

    # ── Prediction on FY2024 ─────────────────────────────────────────────────
    pred_rows = _extract_features("2024")
    predictions = []
    for r in pred_rows:
        xn   = _normalize_transform(r["features"], means, stds)
        prob = _sigmoid(_dot(weights, xn) + bias)
        predicted_lapse = prob >= DECISION_THRESHOLD

        # Feature contributions = weight × normalised value (attribution)
        contributions = {
            FEATURE_NAMES[i]: round(weights[i] * xn[i], 4)
            for i in range(len(FEATURE_NAMES))
        }
        top_driver = max(contributions, key=lambda k: abs(contributions[k]))

        predictions.append({
            "dept_id":                   r["dept_id"],
            "name":                      r["name"],
            "ministry":                  r["ministry"],
            "scheme_type":               r["scheme_type_label"],
            "lapse_probability":         round(prob, 4),
            "lapse_probability_pct":     round(prob * 100, 1),
            "predicted_label":           "HIGH_LAPSE_RISK" if predicted_lapse else "SAFE",
            "confidence":                "HIGH" if abs(prob - 0.5) > 0.25 else "MEDIUM",
            "actual_utilization_pct":    r["final_utilization_pct"],
            "top_risk_driver":           top_driver,
            "feature_contributions":     contributions,
            "raw_features": {
                FEATURE_NAMES[i]: round(r["features"][i], 4)
                for i in range(len(FEATURE_NAMES))
            },
        })

    predictions.sort(key=lambda x: x["lapse_probability"], reverse=True)

    # Feature importance = |weight| normalised to sum = 1
    abs_weights  = [abs(w) for w in weights]
    total_abs    = sum(abs_weights) or 1.0
    importance   = sorted(
        [
            {
                "feature":    FEATURE_NAMES[i],
                "weight":     round(weights[i], 4),
                "importance": round(abs_weights[i] / total_abs * 100, 1),
                "direction":  "reduces risk" if weights[i] < 0 else "increases risk",
            }
            for i in range(len(FEATURE_NAMES))
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )

    high_risk   = [p for p in predictions if p["predicted_label"] == "HIGH_LAPSE_RISK"]
    safe        = [p for p in predictions if p["predicted_label"] == "SAFE"]

    return {
        "model_info": {
            "type":               "Logistic Regression",
            "implementation":     "Pure Python stdlib — zero external libraries",
            "training_years":     ["2022", "2023"],
            "prediction_year":    "2024",
            "epochs":             EPOCHS,
            "learning_rate":      LR,
            "l2_lambda":          L2_LAMBDA,
            "decision_threshold": DECISION_THRESHOLD,
            "lapse_definition":   f"final utilization < {int(LAPSE_THRESHOLD*100)}%",
        },
        "dataset_info": {
            "total_labelled_samples":   len(all_rows),
            "train_samples":            len(train_rows),
            "validation_samples":       len(val_rows),
            "split_method":             "Stratified 80/20 — class balance preserved in both splits",
            "warning": (
                f"Small dataset ({len(all_rows)} samples). "
                "Metrics reflect one fixed split, not cross-validated averages. "
                "Treat as indicative, not production-grade."
            ),
            "label_distribution": {
                "train_lapsed":     sum(y_train),
                "train_not_lapsed": len(y_train) - sum(y_train),
                "val_lapsed":       sum(y_val),
                "val_not_lapsed":   len(y_val) - sum(y_val),
            },
        },
        "training_metrics": {
            "note":         "Measured on TRAINING set — expected to look better than validation",
            "samples":      len(train_rows),
            "accuracy_pct": round(train_acc * 100, 1),
            "log_loss":     round(train_loss, 4),
        },
        "validation_metrics": {
            "note":         "Measured on HELD-OUT validation set — model never saw these during training",
            "samples":      len(val_rows),
            "accuracy_pct": round(val_acc * 100, 1),
            "log_loss":     round(val_loss, 4),
            "precision_pct": round(precision * 100, 1),
            "recall_pct":    round(recall * 100, 1),
            "f1_score":      round(f1, 4),
            "confusion_matrix": {
                "TP": tp, "TN": tn, "FP": fp, "FN": fn,
                "interpretation": "TP=correctly flagged lapse, FP=false alarm, FN=missed lapse",
            },
        },
        "feature_importance":     importance,
        "prediction_summary": {
            "total_depts":        len(predictions),
            "high_lapse_risk":    len(high_risk),
            "safe":               len(safe),
            "avg_lapse_prob_pct": round(
                sum(p["lapse_probability"] for p in predictions) / len(predictions) * 100, 1
            ) if predictions else 0,
        },
        "predictions": predictions,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/ml/lapse-predict")
def get_ml_predictions():
    """
    Logistic regression model trained on FY2022+FY2023 actual spend data.
    Predicts FY2024 lapse risk probability per department.
    Returns predictions, training accuracy, feature importance, and model metadata.
    """
    return _run_model()


@router.get("/ml/model-stats")
def get_model_stats():
    """
    Returns model training metadata, train/validation metrics, and feature importance.
    Validation metrics are on held-out data the model never saw during training.
    """
    result = _run_model()
    if "error" in result:
        return result
    return {
        "model_info":         result["model_info"],
        "dataset_info":       result["dataset_info"],
        "training_metrics":   result["training_metrics"],
        "validation_metrics": result["validation_metrics"],
        "feature_importance": result["feature_importance"],
        "prediction_summary": result["prediction_summary"],
    }
