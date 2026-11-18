
from dotenv import load_dotenv
import os

load_dotenv()

key = os.getenv("GROQ_API_KEY")

if key:
    print("Groq API key loaded successfully!")
else:
    print("API key not found. Check your .env file location and variable name.")
