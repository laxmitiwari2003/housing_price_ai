# Housing Price AI — Full Stack UI + APIs

EstateIQ is a responsive housing-price valuation and property marketplace built with HTML/CSS/JavaScript, Flask, FastAPI, SQLite, JWT authentication, CRUD property management, prediction history, search, and an admin dashboard.

## Project structure

```text
housing_price_ai/
├── backend/
│   ├── flask_app.py          # Flask API + server-rendered fallback
│   ├── fastapi_app.py        # FastAPI REST API / serverless-style endpoint
│   ├── common.py             # shared database/model/auth logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── model/
│   └── LR_Model(2).pkl       # your uploaded model
├── database/
│   └── .gitkeep
└── README.md
```

## Important model note

The supplied pickle is a `sklearn.linear_model.LinearRegression` with `n_features_in_ = 4`. The pickle has no feature-name metadata.

This project therefore uses these configurable default inputs:
1. area_sqft
2. bedrooms
3. bathrooms
4. parking_spaces

If your training dataset used different columns/order, change `MODEL_FEATURES` in `backend/common.py` to the exact training order. The prediction endpoint passes values in that exact order.

## Run locally

### 1. Create an environment

Windows:
```powershell
python -m venv .venv
.venv\Scripts\activate
```

macOS/Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install

```bash
pip install -r backend/requirements.txt
```

### 3. Put the model in the model folder

The included project already contains `model/LR_Model(2).pkl`.

### 4. Start FastAPI

```bash
uvicorn backend.fastapi_app:app --reload --port 8000
```

FastAPI docs:
`http://127.0.0.1:8000/docs`

### 5. Start Flask in another terminal

```bash
python backend/flask_app.py
```

Frontend:
`http://127.0.0.1:5000`

The Flask API is available under `/api/*`, while FastAPI provides the same core REST functionality under `/api/*` on port 8000.

## User accounts and sign-in

The sign-in screen supports both existing-account login and self-service user registration. New registrations are assigned the `user` role automatically; only the seeded administrator has the `admin` role. Users can view their own prediction history and manage their own property records. Admin dashboard navigation remains hidden for regular users.

Demo administrator login (for local testing only):

The database seeds an administrator:
- Email: `admin@example.com`
- Password: `Admin@123`

Change this immediately for real deployments.

## Enhanced features

- Interactive valuation sliders for area, bedrooms, bathrooms, and parking, with a live property summary.
- Animated valuation result card with estimated price per square foot and a clear non-guarantee disclaimer.
- Each prediction is saved by the API to prediction history; individual valuations can be exported as CSV.
- Comparable listing panel ranks properties by similar floor area and compares asking price per square foot when asking prices are available. It never invents missing comparables.
- Property marketplace cards with photo URLs, location, type, size, asking price, status, and bedroom/bathroom/parking facts.
- Search, location/type/status/price filters, browser-local favorites, and side-by-side comparison of up to three listings.
- Property details view with saved valuation history and a no-key OpenStreetMap location search link.
- Property records now include optional `asking_price` and `photo_url` fields. Existing SQLite databases are migrated additively on startup.

The seeded listing prices and photos are illustrative demo content. Replace them with authorized, accurate listing data for a real deployment. Asking prices are user-entered listing data, not verified transaction prices.

## Features

- Login / registration with JWT
- Optional authentication toggle in `common.py`
- Housing price prediction using uploaded LinearRegression model
- Prediction history
- Add, edit, delete and search properties
- Admin dashboard
- Property statistics
- Responsive desktop/tablet/mobile UI with redesigned sign-in and registration screens
- Self-service user registration, password visibility toggle, and role-aware interface
- Dark/light appearance toggle
- Export prediction history to CSV
- Flask API
- FastAPI API
- SQLite cloud-ready data layer
- CORS
- Health endpoint
- API documentation through FastAPI Swagger
- Serverless-friendly stateless REST design

## Free-first usage notes

- The frontend, Flask API, FastAPI API, SQLite, CSS/JavaScript, CSV export, and OpenStreetMap search links require no paid subscription for local use.
- External listing photos are loaded from public Unsplash image URLs in the demo seed records; the app also supports your own image URLs. Network access is required for these images, but they are not required for the core application.
- Hosting/database free tiers change over time and may have usage limits. Check provider terms before deploying; this project does not require a paid map API key.

## Free-first usage notes

- The frontend, Flask API, FastAPI API, SQLite, CSS/JavaScript, CSV export, and OpenStreetMap search links require no paid subscription for local use.
- External listing photos are loaded from public Unsplash image URLs in the demo seed records; the app also supports your own image URLs. Network access is required for these images, but they are not required for the core application.
- Hosting/database free tiers change over time and may have usage limits. Check provider terms before deploying; this project does not require a paid map API key.

## Cloud deployment

The API is designed to be stateless at the HTTP layer. For production:
- Use PostgreSQL/Supabase/Neon instead of SQLite.
- Store the model in object storage or package it with the function.
- Set `JWT_SECRET`, `DATABASE_URL`, and CORS values as environment variables.
- Deploy FastAPI with a platform that supports ASGI/serverless functions.
- Keep Flask for local development or traditional WSGI hosting.

## Security

This is a complete development starter, not a production security audit. Before deployment:
- Change the seed admin password.
- Use HTTPS.
- Store secrets only in environment variables.
- Use a managed PostgreSQL database.
- Add rate limiting and stronger password policies.
- Restrict CORS to your frontend domain.


## Latest UI and administration enhancements

- Dashboard monthly valuation activity chart covering the last six calendar months. Bars are calculated from saved prediction timestamps; empty months display zero rather than sample values.
- Improved light/dark theme tokens, with the chosen appearance saved in browser local storage.
- Improved active navigation states, mobile sidebar overlay, outside-click close behavior, keyboard focus rings, and reduced-motion support.
- Expanded Indian city suggestions for property entry and location filters, including Indore, Bhopal, Ujjain, Dewas, Jabalpur, Mumbai, Pune, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, and many more. Custom locations can still be typed.
- Admin-only registered-user records table showing account ID, name, email, role, join date, property count, and prediction count. Password hashes are never returned by the user-record endpoint.
- Admin-only CSV export for user records.
- New protected endpoint: `GET /api/admin/users` (available through both Flask and FastAPI). It requires an authenticated administrator.

Monthly charts and user records use actual database values. If there is no prediction activity in a month, its chart bar remains at zero.
