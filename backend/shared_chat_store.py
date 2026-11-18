
import sqlite3
import json
import uuid

from pathlib import Path
from datetime import datetime, timezone


# Database location
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "shared_chats.db"


# Create database table
def initialize_database():

    connection = sqlite3.connect(DB_PATH)

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shared_chats (
            id TEXT PRIMARY KEY,
            messages TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


# Save chat and generate unique share ID
def create_shared_chat(messages):

    initialize_database()

    share_id = uuid.uuid4().hex

    created_at = datetime.now(timezone.utc).isoformat()

    connection = sqlite3.connect(DB_PATH)

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO shared_chats (id, messages, created_at)
        VALUES (?, ?, ?)
        """,
        (
            share_id,
            json.dumps(messages),
            created_at
        )
    )

    connection.commit()
    connection.close()

    return share_id


# Retrieve shared chat using its ID
def get_shared_chat(share_id):

    initialize_database()

    connection = sqlite3.connect(DB_PATH)

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT messages, created_at
        FROM shared_chats
        WHERE id = ?
        """,
        (share_id,)
    )

    result = cursor.fetchone()

    connection.close()

    if result is None:
        return None

    return {
        "id": share_id,
        "messages": json.loads(result[0]),
        "created_at": result[1]
    }
