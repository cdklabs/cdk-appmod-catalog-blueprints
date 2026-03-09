#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Init complete."
