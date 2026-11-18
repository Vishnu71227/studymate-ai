
import json
import os
from functools import wraps

from flask import (
    Flask,
    jsonify,
    request,
    Response,
    stream_with_context,
    session
)
from flask_cors import CORS

from rag_engine import process_pdf, stream_question
from shared_chat_store import create_shared_chat, get_shared_chat
from auth_store import register_user, login_user


app = Flask(__name__)

# Session configuration
app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "studymate-development-secret-change-before-deployment"
)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False  # Local development only
)

CORS(
    app,
    origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ],
    supports_credentials=True
)


# Check whether user is logged in
def login_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return jsonify({
                "status": "error",
                "error": "Please login first."
            }), 401

        return func(*args, **kwargs)

    return wrapper


# Backend Health Check
@app.route("/api/health", methods=["GET"])
def health_check():

    return jsonify({
        "status": "success",
        "message": "Flask backend is running!"
    })


# Signup API
@app.route("/api/signup", methods=["POST"])
def signup():

    try:
        data = request.get_json(silent=True) or {}

        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not name or not email or not password:
            return jsonify({
                "error": "All fields are required"
            }), 400

        if len(name) > 100:
            return jsonify({
                "error": "Name is too long"
            }), 400

        if "@" not in email or len(email) > 254:
            return jsonify({
                "error": "Please enter a valid email address"
            }), 400

        if len(password) < 8:
            return jsonify({
                "error": "Password must contain at least 8 characters"
            }), 400

        success, message = register_user(
            name,
            email,
            password
        )

        if not success:
            return jsonify({
                "error": message
            }), 409

        return jsonify({
            "status": "success",
            "message": message
        }), 201

    except Exception as e:

        print("Signup Error:", str(e))

        return jsonify({
            "error": "Could not create account"
        }), 500


# Login API - Create Flask Session
@app.route("/api/login", methods=["POST"])
def login():

    try:
        data = request.get_json(silent=True) or {}

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "error": "Email and password are required"
            }), 400

        user = login_user(email, password)

        if user is None:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        # Clear old session and create new session
        session.clear()

        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]

        return jsonify({
            "status": "success",
            "message": "Login successful!",
            "user": user
        }), 200

    except Exception as e:

        print("Login Error:", str(e))

        return jsonify({
            "error": "Could not login"
        }), 500


# Check Current Login Session
@app.route("/api/me", methods=["GET"])
def current_user():

    if "user_id" not in session:
        return jsonify({
            "status": "error",
            "error": "Not logged in"
        }), 401

    return jsonify({
        "status": "success",
        "user": {
            "id": session["user_id"],
            "name": session["user_name"],
            "email": session["user_email"]
        }
    }), 200


# Logout API - Destroy Session
@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "status": "success",
        "message": "Logged out successfully!"
    }), 200


# PDF Upload API - Login Required
@app.route("/api/upload", methods=["POST"])
@login_required
def upload_pdf():

    try:
        if "file" not in request.files:
            return jsonify({"error": "No PDF file received"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        pdf_bytes = file.read()

        result = process_pdf(pdf_bytes, file.filename)

        return jsonify({
            "status": "success",
            "message": "PDF processed successfully!",
            "filename": result["filename"],
            "total_pages": result["total_pages"],
            "total_chunks": result["total_chunks"]
        })

    except Exception as e:

        print("PDF Upload Error:", str(e))

        return jsonify({"error": str(e)}), 500


# Chat API with Server-Sent Events - Login Required
@app.route("/api/chat", methods=["POST"])
@login_required
def chat():

    data = request.get_json(silent=True) or {}

    question = data.get("question", "").strip()

    if not question:
        return jsonify({
            "error": "Please enter a question"
        }), 400

    def generate():

        try:
            for chunk in stream_question(question):

                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:

            print("Streaming Error:", str(e))

            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


# Create Shareable Chat Link - Login Required
@app.route("/api/share", methods=["POST"])
@login_required
def share_chat():

    try:
        data = request.get_json(silent=True) or {}

        messages = data.get("messages", [])

        if not isinstance(messages, list) or not messages:
            return jsonify({
                "error": "No chat messages provided"
            }), 400

        for msg in messages:

            if (
                not isinstance(msg, dict)
                or msg.get("role") not in ["user", "assistant"]
                or not isinstance(msg.get("content"), str)
            ):
                return jsonify({
                    "error": "Invalid chat message format"
                }), 400

        share_id = create_shared_chat(messages)

        return jsonify({
            "status": "success",
            "share_id": share_id,
            "share_url": f"/shared/{share_id}"
        })

    except Exception as e:

        print("Share Chat Error:", str(e))

        return jsonify({
            "error": "Could not create share link"
        }), 500


# Retrieve Shared Chat - Public Read Only
@app.route("/api/share/<share_id>", methods=["GET"])
def retrieve_shared_chat(share_id):

    try:
        shared_chat = get_shared_chat(share_id)

        if shared_chat is None:
            return jsonify({
                "error": "Shared conversation not found"
            }), 404

        return jsonify({
            "status": "success",
            "messages": shared_chat["messages"],
            "created_at": shared_chat["created_at"]
        })

    except Exception as e:

        print("Retrieve Shared Chat Error:", str(e))

        return jsonify({
            "error": "Could not retrieve shared conversation"
        }), 500


if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False,
        port=5000,
        threaded=True
    )
