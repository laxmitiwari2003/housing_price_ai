from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from common import *

app = FastAPI(title="Housing Price AI REST API", version="1.0.0",
              description="Serverless-style stateless REST API for housing price prediction and property management.")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS","*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins if origins != ["*"] else ["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Login(BaseModel):
    email: EmailStr
    password: str

class Register(Login):
    name: str = Field(min_length=2)

class Prediction(BaseModel):
    area_sqft: float = Field(gt=0)
    bedrooms: int = Field(ge=0)
    bathrooms: float = Field(ge=0)
    parking_spaces: int = Field(ge=0)
    property_id: Optional[int] = None

def current_user(authorization: Optional[str]):
    if not AUTH_REQUIRED: return None
    user = user_from_auth_header(authorization)
    if not user: raise HTTPException(401, "Authentication required")
    return user

@app.get("/api/health")
def health():
    return {"status":"ok","service":"Housing Price AI FastAPI"}

@app.post("/api/auth/register")
def register(data: Register):
    conn=db()
    try:
        cur=conn.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                         (data.name,data.email.lower(),hash_password(data.password),"user",now()))
        conn.commit()
        user=conn.execute("SELECT id,name,email,role,created_at FROM users WHERE id=?",(cur.lastrowid,)).fetchone()
        return {"user":dict(user),"token":create_token(user)}
    except Exception:
        raise HTTPException(409,"Email already registered")
    finally: conn.close()

@app.post("/api/auth/login")
def login(data: Login):
    conn=db(); user=conn.execute("SELECT * FROM users WHERE email=?",(data.email.lower(),)).fetchone(); conn.close()
    if not user or not verify_password(data.password,user["password_hash"]):
        raise HTTPException(401,"Invalid email or password")
    return {"user":{k:user[k] for k in ("id","name","email","role","created_at")},"token":create_token(user)}

@app.get("/api/auth/me")
def me(authorization: Optional[str]=Header(None)):
    return {"user":current_user(authorization)}

@app.get("/api/properties")
def properties(q: str="", status: str=""):
    conn=db()
    sql="SELECT * FROM properties WHERE 1=1"; params=[]
    if q: sql+=" AND (title LIKE ? OR location LIKE ? OR property_type LIKE ?)"; params += [f"%{q}%"]*3
    if status: sql+=" AND status=?"; params.append(status)
    rows=conn.execute(sql+" ORDER BY id DESC",params).fetchall(); conn.close()
    return {"items":[dict(r) for r in rows]}

@app.post("/api/properties")
def add_property(data: dict, authorization: Optional[str]=Header(None)):
    user=current_user(authorization)
    for k in ["title","location","property_type","area_sqft","bedrooms","bathrooms","parking_spaces"]:
        if k not in data: raise HTTPException(400,f"Missing field: {k}")
    conn=db()
    cur=conn.execute("""INSERT INTO properties
    (owner_id,title,location,property_type,area_sqft,bedrooms,bathrooms,parking_spaces,description,status,asking_price,photo_url,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (user["id"],data["title"],data["location"],data["property_type"],data["area_sqft"],data["bedrooms"],
     data["bathrooms"],data["parking_spaces"],data.get("description",""),data.get("status","Available"),data.get("asking_price",0) or 0,data.get("photo_url",""),now()))
    conn.commit(); row=conn.execute("SELECT * FROM properties WHERE id=?",(cur.lastrowid,)).fetchone(); conn.close()
    return dict(row)

@app.post("/api/predict")
def predict(data: Prediction, authorization: Optional[str]=Header(None)):
    user=current_user(authorization)
    result=predict_price([data.area_sqft,data.bedrooms,data.bathrooms,data.parking_spaces])
    conn=db()
    cur=conn.execute("""INSERT INTO predictions
    (user_id,property_id,area_sqft,bedrooms,bathrooms,parking_spaces,predicted_price,created_at)
    VALUES(?,?,?,?,?,?,?,?)""",
    (user["id"] if user else None,data.property_id,data.area_sqft,data.bedrooms,data.bathrooms,data.parking_spaces,result,now()))
    conn.commit(); conn.close()
    return {"prediction_id":cur.lastrowid,"predicted_price":result,"currency":"INR"}

@app.get("/api/predictions")
def history(authorization: Optional[str]=Header(None)):
    user=current_user(authorization)
    conn=db()
    if user["role"]=="admin":
        rows=conn.execute("SELECT p.*,u.name user_name,pr.title property_title FROM predictions p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN properties pr ON pr.id=p.property_id ORDER BY p.id DESC").fetchall()
    else:
        rows=conn.execute("SELECT p.*,pr.title property_title FROM predictions p LEFT JOIN properties pr ON pr.id=p.property_id WHERE p.user_id=? ORDER BY p.id DESC",(user["id"],)).fetchall()
    conn.close()
    return {"items":[dict(r) for r in rows]}

@app.get("/api/admin/stats")
def admin_stats(authorization: Optional[str]=Header(None)):
    user=current_user(authorization)
    if user["role"]!="admin": raise HTTPException(403,"Admin only")
    conn=db()
    r={k:conn.execute(sql).fetchone()["c"] for k,sql in {
        "properties":"SELECT COUNT(*) c FROM properties","users":"SELECT COUNT(*) c FROM users",
        "predictions":"SELECT COUNT(*) c FROM predictions","available":"SELECT COUNT(*) c FROM properties WHERE status='Available'",
        "sold":"SELECT COUNT(*) c FROM properties WHERE status='Sold'","avg_prediction":"SELECT COALESCE(AVG(predicted_price),0) c FROM predictions"
    }.items()}
    conn.close(); return r


@app.get("/api/admin/users")
def admin_users(authorization: Optional[str]=Header(None)):
    user=current_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    conn=db()
    rows=conn.execute("""
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
    return {"items":[dict(row) for row in rows]}
