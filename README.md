# 🎵 Porchfest

A platform for organizing community music festivals where bands perform on neighborhood porches.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Frontend      │     │      Backend        │     │    Database     │
│   Vite + React  │ ──► │   Node.js/Express   │ ──► │   PostgreSQL    │
│   (Vercel)      │     │   (Google Cloud Run)│     │  (Self-hosted)  │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL database (self-hosted or cloud)
- Google Cloud account (for backend deployment)
- Vercel account (for frontend deployment)

### 1. Set up PostgreSQL

Run the migration to create tables:

```bash
psql -d your_database -f supabase/migrations/001_initial_schema.sql
```

### 2. Configure Environment Variables

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:8080
```

**Backend** (`backend/.env`):
```env
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/porchfest
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:5173
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend
pnpm install

# Backend
cd ../backend
pnpm install
```

### 4. Run Development Servers

```bash
# Terminal 1 - Frontend
cd frontend
pnpm dev

# Terminal 2 - Backend
cd backend
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080

## 📁 Project Structure

```
porchfest/
├── frontend/               # Vite + React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── stores/         # Zustand state
│   │   ├── lib/            # API client
│   │   └── types/          # TypeScript types
│   └── ...
├── backend/                # Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth middleware
│   │   └── lib/            # Database client
│   └── Dockerfile
├── supabase/               # Database (name kept for folder structure)
│   └── migrations/         # SQL migrations
├── docker-compose.yml      # Local Docker setup
└── cloudbuild.yaml        # Google Cloud Build
```

## 🎭 User Roles

| Role | Description |
|------|-------------|
| **Band** | Musicians applying to perform |
| **Porch** | Homeowners offering their porch |
| **Admin** | Festival organizers |

## 🔄 Vetting Workflow

1. **Apply**: Bands/porches submit applications
2. **Review**: Admins review and vet submissions
3. **Approve/Reject**: Update status with optional notes
4. **Schedule**: Match approved bands with porches

## 🚢 Deployment

### Frontend to Vercel

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

### Backend to Google Cloud Run

1. Enable Cloud Build and Cloud Run APIs
2. Update substitution variables in `cloudbuild.yaml`
3. Run:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## 📝 API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/schedule` - Public schedule
- `GET /api/venues` - Approved venues

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Protected (requires auth)
- `GET /api/bands/me` - Get user's band
- `POST /api/bands` - Create/update band
- `GET /api/porches/me` - Get user's porch
- `POST /api/porches` - Create/update porch

### Admin Only
- `GET /api/admin/bands` - List all bands
- `PATCH /api/admin/bands/:id/status` - Update band status
- `GET /api/admin/porches` - List all porches
- `PATCH /api/admin/porches/:id/status` - Update porch status

## 🛡️ Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- CORS configured for frontend origin
- Helmet.js security headers

## 📄 License

MIT
