#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

status=0

if [[ -f .env ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git ls-files --error-unmatch .env >/dev/null 2>&1; then
      echo "FAIL: .env is tracked by git"
      status=1
    fi
    if ! git check-ignore -q .env; then
      echo "FAIL: .env is not ignored"
      status=1
    fi
  fi
fi

for required in ".env" "runtime/" "node_modules/" "__pycache__/"; do
  if ! grep -qF "$required" .gitignore; then
    echo "FAIL: .gitignore is missing $required"
    status=1
  fi
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files 'runtime/*' | grep -q .; then
    echo "FAIL: runtime artifacts are tracked by git"
    status=1
  fi
  if git ls-files 'services/*/flags/*' | grep -q .; then
    echo "FAIL: baked flag files are tracked by git"
    status=1
  fi
fi

scan_hits=$(grep -RIlE \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=runtime \
  --exclude-dir=__pycache__ \
  --exclude='*.example' \
  'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}' \
  . 2>/dev/null || true)

if [[ -n "$scan_hits" ]]; then
  echo "FAIL: possible private keys or production tokens:"
  echo "$scan_hits"
  status=1
fi

if [[ "$status" -eq 0 ]]; then
  echo "OK: secrets are ignored, runtime flags are outside git, no key material found"
fi

exit "$status"