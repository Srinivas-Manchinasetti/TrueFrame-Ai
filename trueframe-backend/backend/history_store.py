import os
import json
import time
import uuid
from typing import List, Dict, Any

from backend.db import get_history_collection, is_mongodb_connected

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

os.makedirs(DATA_DIR, exist_ok=True)


def _load_local_history() -> List[Dict[str, Any]]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_local_history(records: List[Dict[str, Any]]) -> None:
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
    except Exception as e:
        print(f"[HistoryStore] Local save error: {e}")


class HistoryStore:
    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        coll = get_history_collection()
        if coll is not None:
            try:
                # Exclude Mongo internal _id or convert it
                cursor = coll.find({}, {"_id": 0}).sort("timestamp", -1).limit(100)
                return list(cursor)
            except Exception as e:
                print(f"[HistoryStore] Mongo fetch error: {e}, falling back to local file.")
        return _load_local_history()

    @staticmethod
    def add_record(
        media_type: str,
        name: str,
        verdict: str,
        confidence: float,
        summary: str,
    ) -> Dict[str, Any]:
        date_str = time.strftime("%b %d, %Y, %I:%M %p")
        new_record = {
            "id": str(uuid.uuid4()),
            "type": media_type,  # "image" or "video"
            "name": name,
            "verdict": verdict,
            "confidence": round(confidence, 4),
            "summary": summary,
            "date": date_str,
            "timestamp": time.time(),
        }

        coll = get_history_collection()
        if coll is not None:
            try:
                coll.insert_one(new_record.copy())
                print(f"[HistoryStore] Saved record '{name}' to MongoDB Atlas.")
                return new_record
            except Exception as e:
                print(f"[HistoryStore] Mongo insert error: {e}, saving to local store.")

        # Local fallback
        records = _load_local_history()
        records.insert(0, new_record)
        _save_local_history(records)
        return new_record

    @staticmethod
    def delete_record(record_id: str) -> bool:
        coll = get_history_collection()
        if coll is not None:
            try:
                res = coll.delete_one({"id": record_id})
                return res.deleted_count > 0
            except Exception as e:
                print(f"[HistoryStore] Mongo delete error: {e}")

        # Local fallback
        records = _load_local_history()
        filtered = [r for r in records if r.get("id") != record_id]
        if len(filtered) < len(records):
            _save_local_history(filtered)
            return True
        return False

    @staticmethod
    def clear_all() -> None:
        coll = get_history_collection()
        if coll is not None:
            try:
                coll.delete_many({})
                print("[HistoryStore] Cleared all history in MongoDB Atlas.")
            except Exception as e:
                print(f"[HistoryStore] Mongo clear error: {e}")

        _save_local_history([])
