import os, sqlite3, pickle, secrets
from pathlib import Path
from datetime import datetime, timedelta, timezone
from functools import wraps

import numpy as np
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

if os.getenv("VERCEL"):
    DB_PATH = Path("/tmp/housing.db")
else:
    DB_PATH = BASE_DIR / "database" / "housing.db"

MODEL_PATH = BASE_DIR / "model" / "LR_Model(2).pkl"


JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me-" + secrets.token_hex(16))
JWT_ALGORITHM = "HS256"
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() == "true"
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# The uploaded model exposes 4 numeric inputs but no feature names.
# Keep this order identical to the columns used during model training.
MODEL_FEATURES = ["area_sqft", "bedrooms", "bathrooms", "parking_spaces"]
MODEL_LABELS = ["Area (sq ft)", "Bedrooms", "Bathrooms", "Parking spaces"]

_model = None

def get_model():
    global _model
    if _model is None:
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model

def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        property_type TEXT NOT NULL,
        area_sqft REAL NOT NULL,
        bedrooms INTEGER NOT NULL,
        bathrooms REAL NOT NULL,
        parking_spaces INTEGER NOT NULL DEFAULT 0,
        description TEXT DEFAULT '',
        asking_price REAL NOT NULL DEFAULT 0,
        photo_url TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Available',
        created_at TEXT NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        property_id INTEGER,
        area_sqft REAL NOT NULL,
        bedrooms INTEGER NOT NULL,
        bathrooms REAL NOT NULL,
        parking_spaces INTEGER NOT NULL,
        predicted_price REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE SET NULL
    );
    """)
    # Additive migration for databases created by earlier project versions.
    property_columns = {row["name"] for row in conn.execute("PRAGMA table_info(properties)").fetchall()}
    if "asking_price" not in property_columns:
        conn.execute("ALTER TABLE properties ADD COLUMN asking_price REAL NOT NULL DEFAULT 0")
    if "photo_url" not in property_columns:
        conn.execute("ALTER TABLE properties ADD COLUMN photo_url TEXT DEFAULT ''")
    admin = conn.execute("SELECT id FROM users WHERE email=?", ("admin@example.com",)).fetchone()
    if not admin:
        conn.execute(
            "INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
            ("Administrator", "admin@example.com", pwd_context.hash("Admin@123"), "admin", now())
        )
    conn.commit()
    conn.close()

def now():
    return datetime.now(timezone.utc).isoformat()

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(password, password_hash):
    return pwd_context.verify(password, password_hash)

def create_token(user):
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

def user_from_auth_header(header):
    if not header or not header.startswith("Bearer "):
        return None
    data = decode_token(header.split(" ", 1)[1])
    if not data:
        return None
    conn = db()
    user = conn.execute("SELECT id,name,email,role,created_at FROM users WHERE id=?", (data["sub"],)).fetchone()
    conn.close()
    return dict(user) if user else None

def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        from flask import request, jsonify
        if not AUTH_REQUIRED:
            return func(*args, **kwargs)
        user = user_from_auth_header(request.headers.get("Authorization"))
        if not user:
            return jsonify({"detail": "Authentication required"}), 401
        return func(user, *args, **kwargs)
    return wrapper

def predict_price(values):
    if len(values) != 4:
        raise ValueError("Exactly four numeric model features are required.")
    arr = np.asarray([[float(v) for v in values]], dtype=float)
    model = get_model()
    pred = float(model.predict(arr)[0])
    return round(pred, 2)

def property_dict(row):
    return dict(row) if row else None

def seed_demo_properties():
    conn = db()
    count = conn.execute("SELECT COUNT(*) c FROM properties").fetchone()["c"]
    if count == 0:
        admin = conn.execute("SELECT id FROM users WHERE email=?", ("admin@example.com",)).fetchone()
        data = [
            ("Modern Family Villa", "Indore", "Villa", 1800, 3, 2, 2, "Bright family home with parking.", "Available", 9200000, "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80"),
            ("City Apartment", "Pune", "Apartment", 1100, 2, 2, 1, "Central apartment near business district.", "Available", 6800000, "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80"),
            ("Compact Starter Home", "Bhopal", "House", 850, 2, 1, 1, "Affordable starter property.", "Sold", 4200000, "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80"),
        ]
        for x in data:
            conn.execute("""INSERT INTO properties
            (owner_id,title,location,property_type,area_sqft,bedrooms,bathrooms,parking_spaces,description,status,asking_price,photo_url,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""", (admin["id"], *x, now()))
        conn.commit()
    conn.close()

init_db()
seed_demo_properties()
