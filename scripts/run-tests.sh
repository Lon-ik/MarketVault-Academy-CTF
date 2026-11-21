#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -x .venv-tests/bin/python ]]; then
  python3 -m venv .venv-tests
  .venv-tests/bin/pip install -q -r tests/requirements.txt
fi

.venv-tests/bin/python tests/integration/run.py