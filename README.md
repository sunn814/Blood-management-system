# Blood Management System (MERN Stack)

A full-stack Blood Bank / Blood Management System built with MongoDB, Express, React and Node.js. Built as a college mini project (Mini Project I).

## Features

- **Authentication & Roles** — JWT-based login/register with 3 roles: `admin`, `donor`, `hospital`
- **Donor Management** — donors register their profile; admin can search (by name/phone/address), filter by blood group, record a donation (auto-updates stock, enforces a 3-month eligibility gap), and delete records
- **Blood Stock** — live inventory per blood group (A+, A-, B+, B-, AB+, AB-, O+, O-), color-coded (low/medium/high), admin can manually adjust units
- **Blood Requests** — donors/hospitals raise a request for a patient; admin approves/rejects/fulfills (fulfilling auto-deducts from stock, with a stock-availability check)
- **Reports** — admin dashboard: total donors, total/pending/fulfilled requests, donations this month, stock by group, requests by group

## New in this version

- **Blood Compatibility Matcher** (`/matcher`, admin + hospital) — enter a patient's blood group; the system lists every compatible group (exact match first, universal donor O- last), the stock of each, and all *eligible* registered donors, with click-to-call phone numbers. API: `GET /api/donors/compatible?bloodGroup=A+`
- **Stock substitution** — if the exact group is out of stock, the admin can fulfil a request from a compatible group (e.g. A+ patient from O+). The request stores which group was used (`fulfilledFrom`).
- **Urgent & low-stock alerts** (dashboard, `GET /api/alerts`) — admin sees open high-urgency requests; donors see if their blood group can help urgent patients and when they are eligible again; everyone sees low-stock groups (5 units or less).
- **Reports charts** — bar charts of stock and requests per blood group (`/reports`)
- **Request tracking** (`/requests/:id`) — progress steps (Pending → Approved → Fulfilled) and a full history of who changed the status and when. Only the admin and the person who raised the request can open it. API: `GET /api/requests/:id`
- **Map + radius search** — donors and hospitals can add a location (browser location). In Find donors, choose a distance (5–100 km) and see eligible compatible donors on an OpenStreetMap map, nearest first. Uses MongoDB `2dsphere` + `$geoNear`. Hospitals only see approximate pins (about 1 km) to protect donor privacy.
- **Dark mode** — toggle in the sidebar; remembers your choice and follows the device setting by default.

- **Donor eligibility** is now calculated from the last donation date (3-month rule) instead of a stored flag.

## Security fixes

- Public registration can no longer create admins (role is forced to `donor`/`hospital`). Create admins with: `npm run create-admin -- "Name" email password`
- Donors can only edit their own profile; only admins can list all donors (phone numbers are private)
- Request status changes follow rules (Pending → Approved/Rejected → Fulfilled); stock deduction is atomic so a request can never be fulfilled twice
- Input validation, regex escaping on search, NoSQL-injection type checks, `helmet`, rate limiting on login/register, CORS limited via `CLIENT_URL`
- `.env` is never committed; use `.env.example`

## Run tests

```bash
cd backend
npm test
```

## Security hardening (after attacker-style review)

- **Hospital approval** - new hospital accounts must be approved by an admin (Admin page) before they can search donors or raise requests
- **Donor privacy** - hospitals never receive addresses or donation history; phone numbers are masked until "Show number" is pressed (20 per day per hospital, every reveal is logged); distances are rounded to whole km
- **Rate limits** - 400 requests / 15 min per IP on the API, 30 / 15 min on login and register, 30 searches / 10 min and 10 new requests / hour per user
- **Login** - 5 wrong passwords lock the account for 15 minutes, unknown emails take the same time as real ones, passwords need 8+ characters with a letter and a number
- **Tokens** - valid 1 day, signed with a fixed algorithm, and the user's role is read from the database on every request, so deleted or demoted users lose access immediately
- **Fake requests** - only admins and approved hospitals can mark a request High urgency; one account can have at most 5 open requests
- **Input limits** - length limits and phone format checks on all text fields
- **Audit log** - donations, deletions, stock changes, request decisions, hospital approvals and number reveals are recorded (Admin page)
- **Headers** - Vercel sends X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy
- **Packages** - `npm audit` shows 0 vulnerabilities for backend production packages

### Before you deploy
1. Rotate the MongoDB password and `JWT_SECRET` (the old ones were committed to git).
2. Render environment: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL, no trailing slash). `NODE_ENV=production` is also recommended.
3. Existing hospital accounts stay approved. New ones need approval.

## Tech Stack

- **Frontend:** React 18, React Router, Axios, Vite
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcrypt password hashing

## Project Structure

```
blood-management-system/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── models/                # User, Donor, BloodStock, Request
│   ├── middleware/auth.js     # JWT verify + role-based authorize()
│   ├── controllers/           # business logic per module
│   ├── routes/                # REST API routes
│   ├── server.js              # Express app entry point
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/axios.js       # axios instance, auto-attaches JWT
    │   ├── context/AuthContext.jsx
    │   ├── components/        # Navbar, PrivateRoute
    │   ├── pages/              # Login, Register, Dashboard, Donors, BloodStock, Requests, Reports
    │   └── App.jsx / main.jsx
    └── vite.config.js
```

## Setup Instructions

### Prerequisites
- Node.js (v18+) installed
- MongoDB running locally (`mongod`) or a free MongoDB Atlas cluster

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI and a JWT_SECRET
npm run dev      # starts on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
```

The frontend proxies `/api` requests to `http://localhost:5000` (see `vite.config.js`), so both servers must be running.

### 3. Try it out
1. Open `http://localhost:5173/register`
2. Create an **admin** account first (select "Admin" role) to manage the system
3. Register a couple of **donor** accounts to test donor profile creation and donation recording
4. Register a **hospital** account to raise blood requests
5. As admin: go to Requests → Approve → Mark Fulfilled to see stock deduct automatically

## Database Schema (Mongo Collections)

| Collection | Key Fields |
|---|---|
| `users` | name, email, password (hashed), role, bloodGroup |
| `donors` | user (ref), name, age, bloodGroup, phone, address, lastDonationDate, totalDonations |
| `bloodstocks` | bloodGroup, unitsAvailable |
| `requests` | requestedBy (ref), patientName, bloodGroup, unitsRequired, hospitalName, urgency, status |

## API Endpoints (for viva reference)

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged in |
| POST | `/api/donors` | Logged in (self-register as donor) |
| GET | `/api/donors?search=&bloodGroup=` | Logged in |
| POST | `/api/donors/:id/donate` | Admin |
| DELETE | `/api/donors/:id` | Admin |
| GET | `/api/stock` | Logged in |
| PUT | `/api/stock/:bloodGroup` | Admin |
| POST | `/api/requests` | Logged in |
| GET | `/api/requests` | Logged in (own requests; admin sees all) |
| PUT | `/api/requests/:id/status` | Admin |
| GET | `/api/requests/reports` | Admin |

## Possible Extensions (mention these in viva as "future scope")

- Email/SMS notifications when stock runs low or a request is approved
- Blood expiry tracking (units expire ~42 days after donation)
- Donor eligibility reminders (auto-email when 3-month gap completes)
- Deployment on Render/Vercel + MongoDB Atlas for a live demo link
