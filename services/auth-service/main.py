import json
import os
import re
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from cache import cache, close_cache, init_cache
from database import close_pool, execute, fetchrow, get_flag, init_pool
from models import (
    ForgotPasswordInput,
    LoginInput,
    ProfileUpdate,
    RegisterInput,
    ResetInput,
)

JWT_SECRET = os.environ.get("JWT_SECRET", "weak-jwt-secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
TOKEN_TTL_MINUTES = int(os.environ.get("TOKEN_TTL_MINUTES", "720"))
SESSION_TTL = int(os.environ.get("SESSION_TTL", "86400"))
RESET_TTL = int(os.environ.get("RESET_TTL", "1800"))
BRUTE_FORCE_THRESHOLD = int(os.environ.get("BRUTE_FORCE_THRESHOLD", "20"))
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:3000")

UPDATABLE_COLUMNS = {"username", "email", "role", "is_active"}
SAFE_USERNAME = re.compile(r"^[A-Za-z0-9_.@-]+$")

PUBLIC_COLUMNS = "id, username, email, role, is_active, created_at"

ALLOWED_RESET_HOSTS = {
    "localhost:3000",
    "localhost:4000",
    "127.0.0.1:3000",
    "127.0.0.1:4000",
    "auth-service:8000",
}
_public_host = urlparse(PUBLIC_BASE_URL).netloc
if _public_host:
    ALLOWED_RESET_HOSTS.add(_public_host)


def hash_password(password):
    return bcrypt.hashpw(
        password.encode()[:72],
        bcrypt.gensalt(rounds=12, prefix=b"2a"),
    ).decode()


def issue_token(user_id, username, role):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def decode_token(token):
    header = jwt.get_unverified_header(token)
    algorithm = (header.get("alg") or "").lower()
    if algorithm == "none":
        return (
            jwt.decode(token, options={"verify_signature": False}),
            algorithm,
            "none",
        )
    kid = header.get("kid")
    if kid:
        try:
            row = await fetchrow(
                f"SELECT key_value FROM auth.jwt_keys WHERE kid = '{kid}'"
            )
        except Exception:
            raise jwt.InvalidTokenError("invalid key id") from None
        if row is None:
            raise jwt.InvalidTokenError("unknown key id")
        payload = jwt.decode(token, row["key_value"], algorithms=["HS256"])
        return payload, algorithm, f"kid:{kid}"
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload, algorithm, "default"


def serialize_user(row):
    return {
        "id": str(row["id"]),
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "is_active": row["is_active"],
    }


def session_key(sid):
    return f"auth:session:{sid}"


async def save_session(sid, data):
    await cache().hset(session_key(sid), mapping=data)
    await cache().expire(session_key(sid), SESSION_TTL)


async def current_context(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload, algorithm, key_source = await decode_token(token)
        user_id = uuid.UUID(str(payload.get("sub")))
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="invalid token")
    user = await fetchrow(
        f"SELECT {PUBLIC_COLUMNS} FROM auth.users WHERE id = $1", user_id
    )
    if user is None:
        raise HTTPException(status_code=401, detail="unknown user")
    return {
        "payload": payload,
        "user": user,
        "algorithm": algorithm,
        "key_source": key_source,
    }


@asynccontextmanager
async def lifespan(app):
    await init_pool()
    await init_cache()
    yield
    await close_cache()
    await close_pool()


app = FastAPI(title="MarketVault Auth Service", version="1.1.0", lifespan=lifespan)


@app.get("/api/auth/health")
async def health():
    return {"status": "ok", "service": "auth-service"}


@app.post("/api/auth/register")
async def register(body: RegisterInput):
    existing = await fetchrow(
        "SELECT id FROM auth.users WHERE username = $1", body.username
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="username already taken")
    row = await fetchrow(
        "INSERT INTO auth.users (username, email, password_hash, role)"
        " VALUES ($1, $2, $3, 'student')"
        f" RETURNING {PUBLIC_COLUMNS}",
        body.username,
        body.email,
        hash_password(body.password),
    )
    token = issue_token(row["id"], row["username"], row["role"])
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(row)}


@app.post("/api/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    attempts_key = f"auth:attempts:{body.username}"
    attempts = int(await cache().get(attempts_key) or 0)

    query = (
        "SELECT id, username, role FROM auth.users "
        f"WHERE username = '{body.username}' "
        f"AND crypt('{body.password}', password_hash) = password_hash"
    )
    row = await fetchrow(query)
    if row is None:
        await cache().incr(attempts_key)
        await cache().expire(attempts_key, 3600)
        raise HTTPException(status_code=401, detail="invalid credentials")

    await cache().delete(attempts_key)

    flags = []
    if not SAFE_USERNAME.match(body.username):
        flags.append(await get_flag("sqli-auth-bypass", "MV{SQLI_AUTH_BYPASS}"))
    if attempts >= BRUTE_FORCE_THRESHOLD:
        flags.append(await get_flag("brute-force-login", "MV{BRUTEFORCE_NO_LIMIT}"))

    sid = request.cookies.get("sid")
    fixed = False
    if sid:
        existing = await cache().hgetall(session_key(sid))
        if not existing:
            sid = None
        elif existing.get("external") == "1" and not existing.get("user_id"):
            fixed = True
    if not sid:
        sid = secrets.token_urlsafe(24)

    mapping = {
        "user_id": str(row["id"]),
        "username": row["username"],
        "role": row["role"],
        "preauth": "0",
        "external": "0",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if fixed:
        mapping["fixed"] = "1"
    await save_session(sid, mapping)
    response.set_cookie("sid", sid, httponly=True, samesite="lax", max_age=SESSION_TTL)

    token = issue_token(row["id"], row["username"], row["role"])
    user = {
        "id": str(row["id"]),
        "username": row["username"],
        "role": row["role"],
    }
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "session": sid,
        "flag": flags[0] if flags else None,
        "flags": flags,
    }


@app.get("/api/auth/login")
async def login_redirect(next: str = "/"):
    response = RedirectResponse(next or "/")
    if next.startswith("//") or next.startswith("http://") or next.startswith("https://"):
        response.headers["X-Challenge-Flag"] = await get_flag(
            "open-redirect-login", "MV{OPEN_REDIRECT_2026}"
        )
    return response


@app.get("/api/auth/session")
async def session_view(
    request: Request, response: Response, sid: str | None = None
):
    external = "1" if sid else "0"
    target = sid or request.cookies.get("sid")
    if target:
        data = await cache().hgetall(session_key(target))
        if not data:
            data = {
                "preauth": "1",
                "external": external,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await save_session(target, data)
        elif external == "1" and not data.get("user_id"):
            data["external"] = "1"
            await cache().hset(session_key(target), "external", "1")
    else:
        target = secrets.token_urlsafe(24)
        data = {
            "preauth": "1",
            "external": "0",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await save_session(target, data)

    response.set_cookie(
        "sid", target, httponly=True, samesite="lax", max_age=SESSION_TTL
    )

    if data.get("user_id"):
        flag = None
        if data.get("fixed") == "1":
            flag = await get_flag("session-fixation", "MV{SESSION_FIXATION_REDIS}")
        return {
            "sid": target,
            "authenticated": True,
            "user": {
                "id": data.get("user_id"),
                "username": data.get("username"),
                "role": data.get("role"),
            },
            "flag": flag,
        }
    return {"sid": target, "authenticated": False, "flag": None}


@app.get("/api/auth/me")
async def me(context: dict = Depends(current_context)):
    user = context["user"]
    payload = context["payload"]
    flag = None
    claimed_role = payload.get("role")
    if claimed_role == "admin" and user["role"] != "admin":
        if context["algorithm"] == "none":
            flag = await get_flag("jwt-alg-none", "MV{JWT_ALG_NONE_2026}")
        elif (
            context["key_source"].startswith("kid:")
            and context["key_source"] != "kid:default"
        ):
            flag = await get_flag("jwt-kid-injection", "MV{JWT_KID_INJECTION_2026}")
        else:
            flag = await get_flag("jwt-weak-secret", "MV{JWT_WEAK_SECRET_2026}")
    return {"user": serialize_user(user), "token": payload, "flag": flag}


@app.patch("/api/auth/profile")
async def update_profile(
    body: ProfileUpdate, context: dict = Depends(current_context)
):
    user = context["user"]
    updates = {
        key: value
        for key, value in body.model_dump().items()
        if key in UPDATABLE_COLUMNS and value is not None
    }
    if not updates:
        return {"user": serialize_user(user), "flag": None}

    assignments = ", ".join(
        f"{column} = ${index + 1}" for index, column in enumerate(updates)
    )
    query = (
        f"UPDATE auth.users SET {assignments}"
        f" WHERE id = ${len(updates) + 1} RETURNING {PUBLIC_COLUMNS}"
    )
    row = await fetchrow(query, *updates.values(), user["id"])

    flag = None
    if updates.get("role") == "admin" and user["role"] != "admin":
        flag = await get_flag("mass-assignment-role", "MV{MASS_ASSIGNMENT_ADMIN}")
    return {"user": serialize_user(row), "flag": flag}


@app.post("/api/auth/forgot-password")
async def forgot_password(body: ForgotPasswordInput, request: Request):
    account = await fetchrow(
        "SELECT id, email FROM auth.users WHERE email = $1", body.email
    )
    if account is not None:
        token = secrets.token_urlsafe(24)
        host = request.headers.get("host", "localhost:8000")
        scheme = request.headers.get("x-forwarded-proto", "http")
        link = f"{scheme}://{host}/api/auth/reset?token={token}"
        await cache().hset(
            f"auth:reset:{token}",
            mapping={
                "user_id": str(account["id"]),
                "email": account["email"],
                "host": host,
                "link": link,
            },
        )
        await cache().expire(f"auth:reset:{token}", RESET_TTL)
        message = json.dumps(
            {
                "to": account["email"],
                "subject": "Восстановление пароля MarketVault Academy",
                "body": f"Ссылка для сброса пароля: {link}",
                "link": link,
                "host": host,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        )
        await cache().lpush(f"auth:mailbox:{account['email']}", message)
        await cache().ltrim(f"auth:mailbox:{account['email']}", 0, 49)
        await cache().expire(f"auth:mailbox:{account['email']}", 86400)
    return {"status": "sent"}


@app.get("/api/auth/mailbox")
@app.get("/api/auth/mail")
async def mailbox(email: str):
    raw = await cache().lrange(f"auth:mailbox:{email}", 0, 49)
    return {"email": email, "messages": [json.loads(item) for item in raw]}


@app.get("/api/auth/reset")
async def reset_info(token: str):
    data = await cache().hgetall(f"auth:reset:{token}")
    if not data.get("user_id"):
        raise HTTPException(status_code=400, detail="invalid or expired token")
    return {"valid": True, "email": data.get("email"), "host": data.get("host")}


@app.post("/api/auth/reset")
async def reset_password(body: ResetInput):
    key = f"auth:reset:{body.token}"
    data = await cache().hgetall(key)
    if not data.get("user_id"):
        raise HTTPException(status_code=400, detail="invalid or expired token")

    await execute(
        "UPDATE auth.users SET password_hash = $1 WHERE id = $2",
        hash_password(body.new_password),
        uuid.UUID(data["user_id"]),
    )
    await cache().delete(key)

    flag = None
    host = data.get("host", "")
    if host not in ALLOWED_RESET_HOSTS:
        flag = await get_flag("password-reset-poisoning", "MV{RESET_HOST_HEADER}")
    return {"status": "password_changed", "flag": flag}