from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from common import *

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

def ok(data, status=200):
    return jsonify(data), status

@app.get("/")
def index():
    return send_from_directory("../frontend", "index.html")

@app.get("/api/health")
def health():
    return ok({"status": "ok", "service": "Housing Price AI Flask API"})

@app.post("/api/auth/register")
def register():
    data = request.get_json() or {}
    name, email, password = data.get("name","").strip(), data.get("email","").strip().lower(), data.get("password","")
    if not name or not email or len(password) < 6:
        return ok({"detail": "Name, valid email and password of at least 6 characters are required."}, 400)
    conn = db()
    try:
        cur = conn.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                           (name,email,hash_password(password),"user",now()))
        conn.commit()
        user = conn.execute("SELECT id,name,email,role,created_at FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
        return ok({"user": dict(user), "token": create_token(user)}, 201)
    except Exception:
        return ok({"detail":"Email already registered."}, 409)
    finally: conn.close()

@app.post("/api/auth/login")
def login():
    data = request.get_json() or {}
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (data.get("email","").lower(),)).fetchone()
    conn.close()
    if not user or not verify_password(data.get("password",""), user["password_hash"]):
        return ok({"detail":"Invalid email or password."}, 401)
    return ok({"user": {k:user[k] for k in ("id","name","email","role","created_at")}, "token": create_token(user)})

@app.get("/api/auth/me")
@require_auth
def me(user):
    return ok({"user": user})

@app.get("/api/properties")
def list_properties():
    q = request.args.get("q","").strip()
    status = request.args.get("status","").strip()
    conn = db()
    sql = "SELECT * FROM properties WHERE 1=1"
    params = []
    if q:
        sql += " AND (title LIKE ? OR location LIKE ? OR property_type LIKE ?)"
        params += [f"%{q}%"] * 3
    if status:
        sql += " AND status=?"; params.append(status)
    sql += " ORDER BY id DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return ok({"items":[dict(r) for r in rows]})

@app.post("/api/properties")
@require_auth
def create_property(user):
    d = request.get_json() or {}
    required = ["title","location","property_type","area_sqft","bedrooms","bathrooms","parking_spaces"]
    if any(k not in d for k in required):
        return ok({"detail":"Missing required property fields."}, 400)
    conn = db()
    cur = conn.execute("""INSERT INTO properties
    (owner_id,title,location,property_type,area_sqft,bedrooms,bathrooms,parking_spaces,description,status,asking_price,photo_url,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (user["id"],d["title"],d["location"],d["property_type"],d["area_sqft"],d["bedrooms"],d["bathrooms"],d["parking_spaces"],
     d.get("description",""),d.get("status","Available"),d.get("asking_price",0) or 0,d.get("photo_url",""),now()))
    conn.commit()
    row = conn.execute("SELECT * FROM properties WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return ok(dict(row), 201)

@app.put("/api/properties/<int:pid>")
@require_auth
def update_property(user, pid):
    d = request.get_json() or {}
    conn = db()
    row = conn.execute("SELECT * FROM properties WHERE id=?", (pid,)).fetchone()
    if not row: conn.close(); return ok({"detail":"Property not found."},404)
    if user["role"] != "admin" and row["owner_id"] != user["id"]:
        conn.close(); return ok({"detail":"Not authorized."},403)
    fields = ["title","location","property_type","area_sqft","bedrooms","bathrooms","parking_spaces","description","status","asking_price","photo_url"]
    sets = [f"{f}=?" for f in fields if f in d]
    vals = [d[f] for f in fields if f in d]
    if not sets: conn.close(); return ok(dict(row))
    vals.append(pid)
    conn.execute(f"UPDATE properties SET {','.join(sets)} WHERE id=?", vals)
    conn.commit()
    out = conn.execute("SELECT * FROM properties WHERE id=?", (pid,)).fetchone()
    conn.close()
    return ok(dict(out))

@app.delete("/api/properties/<int:pid>")
@require_auth
def delete_property(user, pid):
    conn = db()
    row = conn.execute("SELECT * FROM properties WHERE id=?", (pid,)).fetchone()
    if not row: conn.close(); return ok({"detail":"Property not found."},404)
    if user["role"] != "admin" and row["owner_id"] != user["id"]:
        conn.close(); return ok({"detail":"Not authorized."},403)
    conn.execute("DELETE FROM properties WHERE id=?", (pid,))
    conn.commit(); conn.close()
    return ok({"message":"Property deleted."})

@app.post("/api/predict")
def predict():
    d = request.get_json() or {}
    try:
        values = [d["area_sqft"], d["bedrooms"], d["bathrooms"], d["parking_spaces"]]
        result = predict_price(values)
    except Exception as e:
        return ok({"detail":str(e)},400)
    user = user_from_auth_header(request.headers.get("Authorization"))
    conn = db()
    cur = conn.execute("""INSERT INTO predictions
    (user_id,property_id,area_sqft,bedrooms,bathrooms,parking_spaces,predicted_price,created_at)
    VALUES(?,?,?,?,?,?,?,?)""",
    (user["id"] if user else None,d.get("property_id"),*values,result,now()))
    conn.commit(); prediction_id = cur.lastrowid; conn.close()
    return ok({"prediction_id":prediction_id,"predicted_price":result,"currency":"INR"})

@app.get("/api/predictions")
@require_auth
def predictions(user):
    conn = db()
    if user["role"] == "admin":
        rows = conn.execute("""SELECT p.*, u.name user_name, pr.title property_title
          FROM predictions p LEFT JOIN users u ON u.id=p.user_id
          LEFT JOIN properties pr ON pr.id=p.property_id ORDER BY p.id DESC""").fetchall()
    else:
        rows = conn.execute("""SELECT p.*, pr.title property_title
          FROM predictions p LEFT JOIN properties pr ON pr.id=p.property_id
          WHERE p.user_id=? ORDER BY p.id DESC""",(user["id"],)).fetchall()
    conn.close()
    return ok({"items":[dict(r) for r in rows]})

@app.get("/api/admin/stats")
@require_auth
def stats(user):
    if user["role"] != "admin": return ok({"detail":"Admin only."},403)
    conn = db()
    result = {
        "properties": conn.execute("SELECT COUNT(*) c FROM properties").fetchone()["c"],
        "users": conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"],
        "predictions": conn.execute("SELECT COUNT(*) c FROM predictions").fetchone()["c"],
        "available": conn.execute("SELECT COUNT(*) c FROM properties WHERE status='Available'").fetchone()["c"],
        "sold": conn.execute("SELECT COUNT(*) c FROM properties WHERE status='Sold'").fetchone()["c"],
        "avg_prediction": conn.execute("SELECT COALESCE(AVG(predicted_price),0) c FROM predictions").fetchone()["c"],
    }
    conn.close()
    return ok(result)


@app.get("/api/admin/users")
@require_auth
def admin_users(user):
    if user["role"] != "admin":
        return ok({"detail": "Admin only."}, 403)
    conn = db()
    rows = conn.execute("""
        SELECT u.id,u.name,u.email,u.role,u.created_at,
          COUNT(DISTINCT p.id) AS property_count,
          COUNT(DISTINCT pr.id) AS prediction_count
        FROM users u
        LEFT JOIN properties p ON p.owner_id=u.id
        LEFT JOIN predictions pr ON pr.user_id=u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return ok({"items": [dict(row) for row in rows]})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
