#!/usr/bin/env python3
"""Train a stock-price prediction model on real market data.

Example:
    python stock_price_prediction.py --symbol AAPL --start 2015-01-01 --plot
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


try:
    import yfinance as yf
except ImportError as exc:  # pragma: no cover - runtime guidance
    raise SystemExit(
        "Missing dependency 'yfinance'. Install dependencies with:\n"
        "  pip install yfinance pandas scikit-learn matplotlib joblib"
    ) from exc


@dataclass
class Dataset:
    features: pd.DataFrame
    target: pd.Series
    raw: pd.DataFrame


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train and evaluate a stock-price prediction model."
    )
    parser.add_argument("--symbol", default="AAPL", help="Ticker symbol (default: AAPL)")
    parser.add_argument("--start", default="2010-01-01", help="Data start date (YYYY-MM-DD)")
    parser.add_argument("--end", default=None, help="Data end date (YYYY-MM-DD)")
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of latest samples used for test set (default: 0.2)",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=400,
        help="Number of trees in random forest (default: 400)",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=10,
        help="Max depth of random forest trees (default: 10)",
    )
    parser.add_argument(
        "--save-model",
        default=None,
        help="Optional path to save trained model (.joblib)",
    )
    parser.add_argument(
        "--plot",
        action="store_true",
        help="Plot actual vs predicted prices on the test set.",
    )
    return parser.parse_args()


def download_data(symbol: str, start: str, end: str | None) -> pd.DataFrame:
    data = yf.download(symbol, start=start, end=end, auto_adjust=True, progress=False)
    if data.empty:
        raise ValueError(
            f"No data returned for symbol '{symbol}'. Check ticker/date range."
        )
    if isinstance(data.columns, pd.MultiIndex):
        # yfinance may return a MultiIndex like ('Close', 'AAPL').
        data.columns = data.columns.get_level_values(0)
    required_cols = {"Open", "High", "Low", "Close", "Volume"}
    missing = required_cols - set(data.columns)
    if missing:
        raise ValueError(f"Downloaded data is missing columns: {sorted(missing)}")
    return data


def make_features(data: pd.DataFrame) -> Dataset:
    df = data.copy()

    # Price and momentum features
    df["return_1d"] = df["Close"].pct_change(1)
    df["return_5d"] = df["Close"].pct_change(5)
    df["return_10d"] = df["Close"].pct_change(10)
    df["volatility_10d"] = df["return_1d"].rolling(10).std()
    df["ma_5"] = df["Close"].rolling(5).mean()
    df["ma_10"] = df["Close"].rolling(10).mean()
    df["ma_20"] = df["Close"].rolling(20).mean()
    df["volume_change_1d"] = df["Volume"].pct_change(1)
    df["high_low_range"] = (df["High"] - df["Low"]) / df["Close"]

    # Lagged close values
    for lag in (1, 2, 3, 5, 10):
        df[f"close_lag_{lag}"] = df["Close"].shift(lag)

    # Target: next day closing price
    df["target_next_close"] = df["Close"].shift(-1)

    feature_cols = [
        "Open",
        "High",
        "Low",
        "Close",
        "Volume",
        "return_1d",
        "return_5d",
        "return_10d",
        "volatility_10d",
        "ma_5",
        "ma_10",
        "ma_20",
        "volume_change_1d",
        "high_low_range",
        "close_lag_1",
        "close_lag_2",
        "close_lag_3",
        "close_lag_5",
        "close_lag_10",
    ]

    clean = df[feature_cols + ["target_next_close"]].dropna()
    if clean.empty:
        raise ValueError("Not enough data points after feature engineering.")

    return Dataset(
        features=clean[feature_cols],
        target=clean["target_next_close"],
        raw=df,
    )


def train_test_split_time_series(
    X: pd.DataFrame, y: pd.Series, test_size: float
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    if not 0 < test_size < 1:
        raise ValueError("--test-size must be between 0 and 1.")
    split_idx = int(len(X) * (1 - test_size))
    if split_idx <= 0 or split_idx >= len(X):
        raise ValueError("Split produced empty train/test set; adjust --test-size.")

    X_train = X.iloc[:split_idx]
    X_test = X.iloc[split_idx:]
    y_train = y.iloc[:split_idx]
    y_test = y.iloc[split_idx:]
    return X_train, X_test, y_train, y_test


def evaluate(y_true: pd.Series, y_pred: np.ndarray, prev_close: pd.Series) -> dict[str, float]:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    # Directional accuracy: did model predict up/down correctly?
    actual_direction = np.sign(y_true.values - prev_close.values)
    predicted_direction = np.sign(y_pred - prev_close.values)
    directional_accuracy = (actual_direction == predicted_direction).mean() * 100

    return {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "MAPE_percent": float(mape),
        "Directional_Accuracy_percent": float(directional_accuracy),
    }


def maybe_plot(y_test: pd.Series, y_pred: np.ndarray, symbol: str) -> None:
    import matplotlib.pyplot as plt

    plt.figure(figsize=(12, 6))
    plt.plot(y_test.index, y_test.values, label="Actual", linewidth=2)
    plt.plot(y_test.index, y_pred, label="Predicted", linewidth=2)
    plt.title(f"{symbol}: Actual vs Predicted Next-Day Close")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.show()


def main() -> None:
    args = parse_args()

    data = download_data(args.symbol, args.start, args.end)
    dataset = make_features(data)
    X_train, X_test, y_train, y_test = train_test_split_time_series(
        dataset.features, dataset.target, args.test_size
    )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=args.n_estimators,
                    max_depth=args.max_depth,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    metrics = evaluate(y_test, y_pred, prev_close=X_test["Close"])

    print(f"Symbol: {args.symbol}")
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")
    for name, value in metrics.items():
        print(f"{name}: {value:.4f}")

    if args.save_model:
        import joblib

        output = Path(args.save_model)
        output.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, output)
        print(f"Saved model to: {output}")

    if args.plot:
        maybe_plot(y_test, y_pred, args.symbol)


if __name__ == "__main__":
    main()
