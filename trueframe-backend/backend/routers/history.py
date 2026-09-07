from fastapi import APIRouter, HTTPException
from backend.history_store import HistoryStore

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def get_history():
    return HistoryStore.get_all()


@router.delete("/{record_id}")
def delete_history_item(record_id: str):
    success = HistoryStore.delete_record(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "deleted", "id": record_id}


@router.delete("")
def clear_all_history():
    HistoryStore.clear_all()
    return {"status": "cleared"}
