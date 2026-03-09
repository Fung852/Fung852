#!/usr/bin/env bash
set -euo pipefail

NOTEBOOK_PATH="stock_backtest_template/notebooks/real_stock_backtest_template.ipynb"
OUTPUT_PATH="/tmp/real_stock_backtest_template.executed.ipynb"

python3 -m pip install --upgrade pip
python3 -m pip install -r stock_backtest_template/requirements.txt

python3 -m nbconvert \
  --to notebook \
  --execute "${NOTEBOOK_PATH}" \
  --output "$(basename "${OUTPUT_PATH}")" \
  --output-dir "$(dirname "${OUTPUT_PATH}")" \
  --ExecutePreprocessor.timeout=300

echo "Notebook execution verification succeeded: ${OUTPUT_PATH}"
