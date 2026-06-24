# Porchfest Pal

A platform for organizing community porchfest music festivals — managing band and porch applications, reviewer workflows, scheduling, and interactive maps.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Frontend      │     │      Backend         │     │    Database      │
│   Vite + React  │ ──► │   Node.js/Express    │ ──► │   PostgreSQL 16  │
│   (CloudFront)  │     │   (EC2 / systemd)    │     │   (Self-hosted)  │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
         │                        │
         │                        ├── S3 (band/porch photos)
         │                        ├── Resend (transactional email)
         │                        └── Nominatim (geocoding)
         │
         └── CloudFront CDN ── Route 53 (porchfestpal.com)
```

Infrastructure is provisioned via AWS CDK (`infra/`). Deploys happen via GitHub Actions — rsync to EC2 on push to `main`.

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm
- Docker (for local PostgreSQL)
- [go-task](https://taskfile.dev/) (optional, for task runner shortcuts)

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 16 on port 5432 with user `porchfest`, password `porchfest_dev`, database `porchfest`.

### 2. Install Dependencies

```bash
cd frontend && pnpm install
cd ../backend && pnpm install
```

### 3. Run Migrations

```bash
cd backend
pnpm migrate:up
```

### 4. Configure Environment

**Backend** (`backend/.env`):

```env
PORT=8080
DATABASE_URL=postgresql://porchfest:porchfest_dev@localhost:5432/porchfest
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:5173
S3_BUCKET_NAME=porchfest-band-photos-dev
AWS_REGION=us-east-2
RESEND_API_KEY=           # Required for email features
FROM_EMAIL=noreply@porchfest.app
LOG_LEVEL=info
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:8080
VITE_S3_BUCKET=porchfest-band-photos-dev
VITE_AWS_REGION=us-east-2
```

In local dev the Vite proxy handles `/api` forwarding, so `VITE_API_URL` can be left empty.

### 5. Run Development Servers

Using go-task:

```bash
task dev
```

Or manually:

```bash
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && pnpm dev

# Terminal 2 — Backend (http://localhost:8080)
cd backend && pnpm dev
```

### 6. Seed Test Data (Optional)

```bash
cd backend
psql $DATABASE_URL < seed-test-data.sql
```

## Project Structure

```
porchfest/
├── frontend/                  # Vite + React SPA
│   ├── src/
│   │   ├── pages/             # Route pages (dashboard, public apply, map)
│   │   ├── components/        # Shared UI components
│   │   ├── stores/            # Zustand state (auth, org)
│   │   ├── lib/               # API client
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                   # Express API
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # S3, email, geocoding
│   │   ├── middleware/        # Auth & role guards
│   │   └── data/              # Database client (pg) & types
│   ├── migrations/            # SQL migrations (node-pg-migrate)
│   ├── seed-test-data.sql     # Sample data for local dev
│   └── Dockerfile
├── infra/                     # AWS CDK infrastructure
│   ├── lib/
│   │   ├── porchfest-stack.ts # EC2, CloudFront, S3, Route 53
│   │   └── certificate-stack.ts
│   └── bin/porchfest.ts
├── .github/workflows/         # CI (pr.yml) + CD (deploy.yml)
├── docker-compose.yml         # Local PostgreSQL
└── Taskfile.yml               # Dev task runner
```

## Roles & Access

### Platform Roles

| Role | Description |
|------|-------------|
| `super-duper-admin` | Full platform access; can create organizations and users |
| `user` | Org-scoped access determined by org role |

### Organization Roles

| Role | Description |
|------|-------------|
| `owner` | Full org admin — manages users, events, all sections |
| `organizer` | Manages bands, porches, scheduling, map, tasks |
| `reviewer` | Reviews assigned band applications only |

Bands and porch hosts are **applicants** — they don't have platform accounts. Bands can self-edit via magic link email.

## Features

### Public Pages

| Page | Path | Description |
|------|------|-------------|
| Band Application | `/bandapplication/:slug` | Submit band application with photo upload |
| Porch Application | `/porchapplication/:slug` | Submit porch host application |
| Public Map | `/events/:slug/map` | Interactive map with time filter, band bios, social links |
| Band Self-Edit | `/band-login/:slug` → `/band-edit` | Magic-link auth for bands to update their application |

### Admin Dashboard (`/admin`)

| Section | Description |
|---------|-------------|
| Overview | Stats grid (pending/approved counts) |
| Bands | Review, approve/reject, export CSV/XLSX |
| Porches | Review, approve/reject porch applications |
| Assignments | Assign reviewers to bands, send email notifications |
| My Reviews | Reviewer workflow with 1–5 ratings and notes |
| Scheduler | Visual drag-to-schedule grid (band → porch + time) |
| Map | Interactive admin map with geocoding, color-coded status markers, sound zones, pin placement, status/band-in-mind filters |
| Events | Create/manage events per org, application windows, map publish toggle |
| Tasks | Event task templates, categorized task management, contacts |
| Organizations | Create/manage orgs (super-duper-admin only) |
| Manage Users | Invite/manage org members and roles |

### Map Features (Admin)

- **Color-coded markers** by porch status (pending, under review, approved, rejected)
- **Status filter toggles** — show/hide porches by status
- **"Band In Mind" filter** — isolate porches that indicated they have a band in mind
- **Auto-geocode on map open** — bulk geocodes un-geocoded porches via Nominatim
- **Manual pin placement** — click un-geocoded porches in the sidebar, then click the map to place
- **Drag to relocate** pins for already-geocoded porches
- **Sound zones** — configurable radius and directional cones per approved porch
- **Band assignment** — assign bands to porches with time slots directly from the map
- **Publish toggle** — controls whether the public map is accessible

## Database

Schema managed with [node-pg-migrate](https://github.com/salsita/node-pg-migrate). Migration files live in `backend/migrations/`.

### Commands

```bash
cd backend
pnpm migrate:up                      # Apply pending migrations
pnpm migrate:down                    # Roll back last migration
pnpm migrate:create my-change-name   # Create new migration file
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Admin/organizer accounts |
| `organizations` | Festival organizations (slug, city, state) |
| `organization_users` | User ↔ org membership with role |
| `events` | Per-org festivals with dates, app windows, map settings |
| `porches` | Porch host applications (address, geocoords, sound settings, status) |
| `bands` | Band applications (bio, genre, social links, photo, scheduling) |
| `time_slots` | Event time windows |
| `tasks` | Org-level recurring task templates |
| `event_tasks` | Per-event task instances with status and category |
| `task_contacts` | Vendor/contact info per task |
| `band_magic_tokens` | One-time tokens for band self-edit flow |

### Migration Format

```sql
-- Up Migration
ALTER TABLE porches ADD COLUMN phone VARCHAR(50);

-- Down Migration
ALTER TABLE porches DROP COLUMN phone;
```

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (DB connectivity) |
| GET | `/api/schedule` | Published schedule (approved bands + assignments) |
| GET | `/api/venues` | Approved porches (public-safe fields) |
| GET | `/api/events/org/:slug` | Active event info + application window status |
| GET | `/api/events/org/:slug/map` | Published map data (porches + bands with coordinates) |
| GET | `/api/bands/public` | Approved bands (public-safe fields) |
| POST | `/api/bands/apply` | Submit band application |
| POST | `/api/porches/apply` | Submit porch application |
| GET | `/api/bands/upload-url` | Presigned S3 URL for band photo |
| GET | `/api/porches/upload-url` | Presigned S3 URL for porch app config photo |

### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Login → JWT |
| POST | `/register` | Create user (super-duper-admin only) |
| GET | `/me` | Current user info |
| PATCH | `/password` | Change password |
| PATCH | `/profile` | Update name |

### Band Self-Edit (`/api/bands/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/magic-link` | Send magic link email to band |
| POST | `/verify` | Verify token → short-lived JWT |
| PATCH | `/band` | Update band application (with band-edit JWT) |

### Admin (`/api/admin`) — Requires auth + org role

Key endpoints (not exhaustive):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bands` | List all bands for org |
| PATCH | `/bands/:id/status` | Update band status |
| PATCH | `/bands/:id/schedule` | Assign band to porch + time |
| GET | `/porches` | List all porches for org |
| PATCH | `/porches/:id/status` | Update porch status |
| POST | `/porches/geocode` | Bulk geocode (filterable by status) |
| PATCH | `/porches/:id/coordinates` | Manual pin placement |
| PATCH | `/porches/:id/sound` | Sound zone settings |
| GET | `/event` | Active event settings |
| PATCH | `/event` | Update event settings |
| GET | `/reviewers` | List org reviewers |
| POST | `/bands/:id/assign-reviewer` | Assign reviewer + send email |

## Testing

```bash
cd backend

# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report (output in backend/coverage/)
pnpm test:coverage
```

CI runs tests automatically on pull requests (`.github/workflows/pr.yml`).

## Deployment

### Infrastructure (one-time)

```bash
cd infra
pnpm install
pnpm cdk deploy --all
```

Provisions EC2, CloudFront, S3, Route 53, ACM certificate, and SSM parameters.

### Application Deploy

Automated via GitHub Actions on push to `main` (`.github/workflows/deploy.yml`):

1. Builds backend and frontend
2. Rsyncs artifacts to EC2
3. Runs `activate.sh` on server (migrations + service restart)
4. Invalidates CloudFront cache

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `EC2_SSH_KEY` | SSH key for deploy to EC2 |
| `EC2_HOST` | EC2 public IP/hostname |
| `AWS_ROLE_ARN` | IAM role for CloudFront invalidation |
| `CLOUDFRONT_DISTRIBUTION_ID` | CDN distribution to invalidate |

### Production Secrets

Stored in AWS SSM Parameter Store under `/porchfest/`:
- `database-url`, `jwt-secret`, `resend-api-key`, `frontend-url`, `s3-bucket-name`

Written to `backend/.env` by `activate.sh` during deploy.

## Security

- JWT authentication (admin accounts + band self-edit)
- Password hashing with bcrypt
- Role-based access control (platform + org level)
- CORS restricted to configured frontend origin
- Helmet.js security headers
- S3 presigned URLs for file uploads (no direct bucket write access from client)
- Magic-link tokens expire and are single-use

## License

MIT
