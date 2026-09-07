"""
auth.py — Clerk-backed authentication for TrueFrame AI backend

Clerk issues JWTs (session tokens) for every signed-in user.
The frontend sends them in the Authorization header as:
    Authorization: Bearer <clerk_session_token>

The backend verifies the token using Clerk's JWKS endpoint
(authenticated with CLERK_SECRET_KEY) and extracts user metadata.

Required env variable in trueframe-backend/.env:
    CLERK_SECRET_KEY=sk_test_...   ← from Clerk dashboard → API Keys
"""

import time
import json
import requests as req_lib

import jwt as pyjwt
from jwt.algorithms import RSAAlgorithm

from fastapi import APIRouter, Header, HTTPException
from typing import Optional, Dict, Any

from backend.config import CLERK_SECRET_KEY, CLERK_JWKS_URL
from backend.db import get_users_collection

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# JWKS key cache  (fetched once per process, refreshed on key-miss)
# ---------------------------------------------------------------------------
_jwks_cache: Dict[str, Any] = {}   # kid → public key object


def _fetch_jwks() -> None:
    """Fetch Clerk's JWKS and cache keys by kid."""
    global _jwks_cache

    # Use the explicit override URL or fall back to Clerk's API endpoint
    jwks_url = CLERK_JWKS_URL or "https://api.clerk.com/v1/jwks"

    headers = {}
    if CLERK_SECRET_KEY:
        headers["Authorization"] = f"Bearer {CLERK_SECRET_KEY}"

    try:
        resp = req_lib.get(jwks_url, headers=headers, timeout=6)
        resp.raise_for_status()
        data = resp.json()
        for key_data in data.get("keys", []):
            kid = key_data.get("kid")
            if kid:
                public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                _jwks_cache[kid] = public_key
        print(f"[Auth] Loaded {len(_jwks_cache)} Clerk JWKS key(s)")
    except Exception as e:
        print(f"[Auth] Failed to fetch Clerk JWKS: {e}")


def _get_public_key(kid: str):
    """Return the cached public key for this kid, refreshing if needed."""
    if kid not in _jwks_cache:
        _fetch_jwks()
    return _jwks_cache.get(kid)


# Eagerly load JWKS at startup so first request is fast
if CLERK_SECRET_KEY or CLERK_JWKS_URL:
    _fetch_jwks()


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------
def verify_clerk_token(token: str) -> Dict[str, Any]:
    """
    Verify a Clerk session JWT using the cached JWKS public key.
    Returns the decoded payload on success.
    Raises HTTPException(401) on any failure.
    """
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    # ── Dev mode: no Clerk keys configured ──────────────────────────────────
    if not CLERK_SECRET_KEY and not CLERK_JWKS_URL:
        print("[Auth] WARNING: CLERK_SECRET_KEY not set — skipping verification (dev mode)")
        try:
            return pyjwt.decode(token, options={"verify_signature": False})
        except Exception:
            return {"sub": "dev_user_001", "email": "dev@trueframe.ai"}

    # ── Decode header to get kid ─────────────────────────────────────────────
    try:
        header = pyjwt.get_unverified_header(token)
    except pyjwt.DecodeError as e:
        raise HTTPException(status_code=401, detail=f"Malformed token: {e}")

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing 'kid' header")

    public_key = _get_public_key(kid)
    if public_key is None:
        raise HTTPException(
            status_code=401,
            detail="Unable to find matching public key for this token. Try signing out and in again.",
        )

    # ── Verify & decode ──────────────────────────────────────────────────────
    try:
        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},   # Clerk dev JWTs have no aud
            leeway=10,                        # allow 10s clock skew
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ---------------------------------------------------------------------------
# Helper — enrich user from Clerk REST API if JWT lacks name/email
# ---------------------------------------------------------------------------
def _fetch_clerk_user(user_id: str) -> Dict[str, Any]:
    if not CLERK_SECRET_KEY:
        return {}
    try:
        resp = req_lib.get(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[Auth] Clerk user fetch error: {e}")
    return {}


def _user_from_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Build a normalized user dict from a Clerk JWT payload."""
    user_id = payload.get("sub", "")

    # Clerk's JWT may include email in different claims
    email = (
        payload.get("email")
        or payload.get("primary_email_address_id", "")
    )
    name = payload.get("name", "")

    # If email/name are missing, fetch from Clerk's user API
    if not email or not name:
        clerk_data = _fetch_clerk_user(user_id)
        if clerk_data:
            addresses = clerk_data.get("email_addresses", [])
            if addresses and not email:
                email = addresses[0].get("email_address", "")
            first = clerk_data.get("first_name") or ""
            last = clerk_data.get("last_name") or ""
            if not name:
                name = f"{first} {last}".strip() or email.split("@")[0]

    return {
        "id": user_id,
        "name": name or email.split("@")[0] or "User",
        "email": email,
        "avatar_url": payload.get("image_url", ""),
        "role": "analyst",
        "auth_provider": "clerk",
        "last_login": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Verify a Clerk session token and return the user profile.
    Called by the frontend AuthContext on every app load.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    payload = verify_clerk_token(token)
    user = _user_from_payload(payload)

    # Upsert into MongoDB Atlas
    users_coll = get_users_collection()
    if users_coll is not None:
        try:
            users_coll.update_one(
                {"id": user["id"]},
                {"$set": {**user, "updated_at": time.time()}},
                upsert=True,
            )
        except Exception as e:
            print(f"[Auth] MongoDB upsert error: {e}")

    return {"user": user}


@router.post("/verify")
def verify_token(authorization: Optional[str] = Header(None)):
    """Lightweight token validity check."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token")
    token = authorization.removeprefix("Bearer ").strip()
    payload = verify_clerk_token(token)
    return {"valid": True, "sub": payload.get("sub")}


@router.post("/logout")
def logout():
    """
    Sign-out is handled client-side by Clerk SDK.
    This endpoint is a compatibility stub.
    """
    return {"status": "logged_out"}
