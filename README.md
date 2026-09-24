# Blood Management System (MERN Stack)

A full-stack Blood Bank / Blood Management System built with MongoDB, Express, React and Node.js. Built as a college mini project (Mini Project I).

## Features

- **Authentication & Roles** — JWT-based login/register with 3 roles: `admin`, `donor`, `hospital`
- **Donor Management** — donors register their profile; admin can search (by name/phone/address), filter by blood group, record a donation (auto-updates stock, enforces a 3-month eligibility gap), and delete records
- **Blood Stock** — live inventory per blood group (A+, A-, B+, B-, AB+, AB-, O+, O-), color-coded (low/medium/high), admin can manually adjust units
- **Blood Requests** — donors/hospitals raise a request for a patient; admin approves/rejects/fulfills (fulfilling auto-deducts from stock, with a stock-availability check)
- **Reports** — admin dashboard: total donors, total/pending/fulfilled requests, donations this month, stock by group, requests by group

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
