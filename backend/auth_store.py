
import sqlite3
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash


# Database location
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"


# Initialize user database
def initialize_auth_database():

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


# Register a new user
def register_user(name, email, password):

    initialize_auth_database()

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    try:
        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
            """,
            (name, email, hashed_password)
        )

        connection.commit()

        return True, "Account created successfully!"

    except sqlite3.IntegrityError:
        return False, "Email already registered."

    finally:
        connection.close()


# Login existing user
def login_user(email, password):

    initialize_auth_database()

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, email, password
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    user = cursor.fetchone()
    connection.close()

    if user is None:
        return None

    if not check_password_hash(user[3], password):
        return None

    return {
        "id": user[0],
        "name": user[1],
        "email": user[2]
    }

