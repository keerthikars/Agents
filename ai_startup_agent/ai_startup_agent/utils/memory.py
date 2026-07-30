"""
utils/memory.py
Session-based shared memory so every agent can read what agents before it
produced (e.g. the financial agent reads the market agent's TAM estimate).

Uses MongoDB if MONGO_URI is set, otherwise falls back to an in-memory
dict so the app still runs with zero extra setup (useful for demos/grading).
"""

import os
import uuid
from datetime import datetime, timezone

_MONGO_AVAILABLE = True
try:
    from pymongo import MongoClient
except ImportError:  # pymongo not installed
    _MONGO_AVAILABLE = False


class SessionMemory:
    def __init__(self, session_id: str | None = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.mongo_uri = os.getenv("MONGO_URI")
        self._local_store: dict = {}
        self._use_mongo = bool(self.mongo_uri) and _MONGO_AVAILABLE

        if self._use_mongo:
            try:
                self._client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=3000)
                self._client.admin.command("ping")
                self._db = self._client["ai_startup_agent"]
                self._collection = self._db["sessions"]
            except Exception:
                # Mongo configured but unreachable -> silently fall back
                self._use_mongo = False

    # ---- public API -------------------------------------------------

    def set(self, key: str, value):
        if self._use_mongo:
            self._collection.update_one(
                {"session_id": self.session_id},
                {
                    "$set": {
                        f"data.{key}": value,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
        else:
            self._local_store[key] = value

    def get(self, key: str, default=None):
        if self._use_mongo:
            doc = self._collection.find_one({"session_id": self.session_id}) or {}
            return doc.get("data", {}).get(key, default)
        return self._local_store.get(key, default)

    def all(self) -> dict:
        if self._use_mongo:
            doc = self._collection.find_one({"session_id": self.session_id}) or {}
            return doc.get("data", {})
        return dict(self._local_store)

    def clear(self):
        if self._use_mongo:
            self._collection.delete_one({"session_id": self.session_id})
        self._local_store = {}

    @property
    def backend(self) -> str:
        return "MongoDB" if self._use_mongo else "in-memory (session only)"
