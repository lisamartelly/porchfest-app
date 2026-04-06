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

- Node.js 22+
- npm or pnpm
- PostgreSQL database (self-hosted or cloud)
- Google Cloud account (for backend deployment)
- Vercel account (for frontend deployment)

### 1. Start PostgreSQL

Using Docker Compose (recommended):

```bash
docker compose up -d db
```

Or use any PostgreSQL 16+ instance.

### 2. Run Database Migrations

```bash
cd backend
pnpm migrate:up
```

This creates all tables and seeds the admin user. See [Database Migrations](#-database-migrations) for details.

### 3. Configure Environment Variables

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

### 4. Install Dependencies

```bash
# Frontend
cd frontend
pnpm install

# Backend
cd ../backend
pnpm install
```

### 5. Run Development Servers

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

## Backend Unit Tests

Run backend tests with the Node version from `.nvmrc`:

```bash
source ~/.nvm/nvm.sh && nvm use
cd backend
pnpm test
```

Run backend tests in watch mode:

```bash
source ~/.nvm/nvm.sh && nvm use
cd backend
pnpm test:watch
```

Generate backend coverage report:

```bash
source ~/.nvm/nvm.sh && nvm use
cd backend
pnpm test:coverage
```

Coverage output is written to `backend/coverage/` (including `lcov.info`).

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
│   └── Dockerfile
├── backend/                # Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth middleware
│   │   └── data/           # Database client & types
│   ├── migrations/         # SQL migrations (node-pg-migrate)
│   ├── seed-dev.sql        # Sample data for local dev
│   └── Dockerfile
├── database/               # Legacy init scripts (reference only)
└── docker-compose.yml      # Local Docker setup
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

## 🗄️ Database Migrations

Schema changes are managed with [node-pg-migrate](https://github.com/salsita/node-pg-migrate). Migration files live in `backend/migrations/` and use plain SQL with `-- Up Migration` and `-- Down Migration` sections.

### Commands

All commands run from the `backend/` directory and use `DATABASE_URL` from your environment.

```bash
pnpm migrate:up                          # Apply all pending migrations
pnpm migrate:down                        # Roll back the last migration
pnpm migrate:create my-change-name       # Create a new migration file
```

### Writing a Migration

Generated migration files have `-- Up Migration` and `-- Down Migration` markers. Write your forward change under Up and the reverse under Down:

```sql
-- Up Migration
ALTER TABLE porches ADD COLUMN phone VARCHAR(50);

-- Down Migration
ALTER TABLE porches DROP COLUMN phone;
```

### Dev Seed Data

Sample data (events, porches, bands) for local development is in `backend/seed-dev.sql`. Load it after running migrations:

```bash
pnpm db:seed
```

### Full Database Reset

To wipe and recreate everything from scratch:

```bash
pnpm db:reset        # Destroys Docker volume, recreates DB, runs migrations
pnpm db:seed         # (optional) Load sample data
```

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
