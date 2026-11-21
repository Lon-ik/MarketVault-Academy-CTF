#!/usr/bin/env python3
import json
import secrets
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ROOT / "runtime"
FLAG_DIR = RUNTIME / "flags"
STATE = RUNTIME / "flags.json"

SLUGS = [
    "jwt-alg-none",
    "jwt-weak-secret",
    "sqli-auth-bypass",
    "mass-assignment-role",
    "brute-force-login",
    "open-redirect-login",
    "password-reset-poisoning",
    "graphql-introspection",
    "graphql-batching-dos",
    "prototype-pollution",
    "ssrf-image-fetch",
    "cors-wildcard-credentials",
    "graphql-idor",
    "legacy-lfi",
    "legacy-rfi",
    "legacy-xxe",
    "legacy-command-injection",
    "legacy-php-object-injection",
    "legacy-upload-php",
    "inventory-idor",
    "inventory-race-condition",
    "inventory-path-traversal",
    "nosql-auth-bypass",
    "nosql-blind",
    "dom-xss",
    "csrf-profile-change",
    "clickjacking-checkout",
    "postmessage-xss",
    "session-fixation",
    "cache-poisoning",
]

FILE_FLAGS = {
    "inventory-path-traversal": ("inventory", "inventory.txt"),
    "legacy-lfi": ("legacy", "lfi.txt"),
    "legacy-rfi": ("legacy", "rfi.txt"),
    "legacy-xxe": ("legacy", "xxe.txt"),
    "legacy-command-injection": ("legacy", "cmd.txt"),
    "legacy-php-object-injection": ("legacy", "unserialize.txt"),
    "legacy-upload-php": ("legacy", "upload.txt"),
}


def load_flags(rotate=False):
    existing = {}
    if STATE.exists() and not rotate:
        existing = json.loads(STATE.read_text(encoding="utf-8"))
    flags = {}
    for slug in SLUGS:
        flags[slug] = existing.get(slug) or (
            "MV{" + slug.upper().replace("-", "_") + "_" + secrets.token_hex(4) + "}"
        )
    return flags


def write_files(flags):
    for group in ("inventory", "legacy"):
        (FLAG_DIR / group).mkdir(parents=True, exist_ok=True)
    for slug, (group, filename) in FILE_FLAGS.items():
        (FLAG_DIR / group / filename).write_text(flags[slug] + "\n", encoding="utf-8")
    RUNTIME.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(flags, indent=2) + "\n", encoding="utf-8")


def generate(rotate=False):
    flags = load_flags(rotate=rotate)
    write_files(flags)
    print(f"generated {len(flags)} flags in {FLAG_DIR.relative_to(ROOT)}")
    if rotate:
        print("flags rotated")


def sync():
    if not STATE.exists():
        print("flags.json is missing, run generate first", file=sys.stderr)
        raise SystemExit(1)
    flags = json.loads(STATE.read_text(encoding="utf-8"))
    statements = "\n".join(
        f"UPDATE academy.challenges SET flag = '{flags[slug]}' WHERE slug = '{slug}';"
        for slug in SLUGS
    )
    result = subprocess.run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "postgres",
            "sh",
            "-c",
            'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1',
        ],
        input=statements,
        text=True,
        cwd=ROOT,
    )
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    subprocess.run(
        ["docker", "compose", "restart", "api-gateway"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"synced {len(flags)} flags to postgres")


def status():
    if not STATE.exists():
        print("no generated flags")
        return
    flags = json.loads(STATE.read_text(encoding="utf-8"))
    print(f"flags: {len(flags)}")
    print(f"state: {STATE}")
    for group in ("inventory", "legacy"):
        files = sorted((FLAG_DIR / group).glob("*.txt"))
        print(f"{group}: {', '.join(item.name for item in files)}")


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "generate"
    rotate = "--rotate" in sys.argv[2:]
    if command == "generate":
        generate(rotate=rotate)
    elif command == "sync":
        generate()
        sync()
    elif command == "status":
        status()
    else:
        print("usage: flags.py [generate|sync|status] [--rotate]", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()