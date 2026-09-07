import pymongo
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from typing import Optional

from backend.config import MONGODB_URI, MONGODB_DB_NAME

_client: Optional[pymongo.MongoClient] = None
_db = None
_is_connected = False


def init_db():
    global _client, _db, _is_connected
    if not MONGODB_URI:
        print("[MongoDB] No MONGODB_URI provided. Running with local fallback store.")
        _is_connected = False
        return None

    try:
        print("[MongoDB] Connecting to MongoDB Atlas...")
        client_kwargs = {
            "serverSelectionTimeoutMS": 5000,
            "appname": "TrueFrameAI",
        }
        try:
            import certifi
            client_kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass

        _client = pymongo.MongoClient(MONGODB_URI, **client_kwargs)
        # Test connection
        _client.admin.command("ping")
        _db = _client[MONGODB_DB_NAME]
        _is_connected = True
        print(f"[MongoDB] Successfully connected to MongoDB Atlas database: {MONGODB_DB_NAME}")
        return _db
    except ServerSelectionTimeoutError as e:
        print(f"[MongoDB] Connection timed out: {e}. If using Atlas, ensure your current public IP is whitelisted in Network Access. Falling back to local storage.")
        _is_connected = False
        return None
    except Exception as e:
        print(f"[MongoDB] Failed to connect: {e}. Falling back to local storage.")
        _is_connected = False
        return None


def is_mongodb_connected() -> bool:
    if not _is_connected and MONGODB_URI:
        init_db()
    return _is_connected and _db is not None


def get_db():
    if _db is None and MONGODB_URI:
        return init_db()
    return _db


def get_history_collection():
    db = get_db()
    if db is not None:
        return db["history"]
    return None


def get_users_collection():
    db = get_db()
    if db is not None:
        return db["users"]
    return None


# Initialize at module load if URI exists
init_db()
