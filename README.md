# OnboardIQ — HR Document Management

OnboardIQ is a full-stack onboarding portal for collecting, reviewing, and tracking employee documents. It gives HR teams a central review workspace while giving employees a clear checklist for submitting documents and monitoring their progress.

## What it does

- HR can invite employees, configure document types and requirements, review uploads, and keep an audit trail.
- Employees can activate their account, upload required documents, see HR feedback, and download previous submissions.
- Both roles receive document-status notifications.
- Two-factor authentication is available for account protection.
- Files are stored in MinIO, with document metadata, users, requirements, notifications, and audit events stored in PostgreSQL.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL |
| File storage | MinIO (S3-compatible) |
| Authentication | JWT, Argon2 password hashing, TOTP 2FA |

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── auth/           # Login, activation, profile, and 2FA
│   │   ├── employees/      # HR employee-management API
│   │   ├── documents/      # Upload, review, requirements, and downloads
│   │   ├── notifications/  # In-app notifications
│   │   ├── audit/          # Audit-log API
│   │   └── storage/        # MinIO integration
│   └── migrations/         # Alembic database migrations
└── frontend/
    └── src/
        ├── pages/          # Employee, HR, and authentication pages
        ├── layouts/        # Shared employee and HR application shells
        ├── components/     # Reusable UI, feedback, and route components
        └── api/            # Axios client and authentication header handling
```

## Roles and workflows

### HR

1. Register the first HR account.
2. Create document types and assign requirements by employment type.
3. Invite employees and monitor their onboarding progress.
4. Review each uploaded document, then approve it or reject it with a reason.
5. Review audit logs, notifications, account profile, and security settings.

### Employee

1. Activate the account from the invitation flow.
2. Sign in and complete the required-document checklist.
3. Upload PDF, JPEG, or PNG files (up to 5 MB per file).
4. Track review status, HR feedback, previous upload versions, and notifications.
5. Manage profile details and two-factor authentication.

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL
- A running MinIO server and bucket credentials

## Local setup

### 1. Configure the backend

Create `backend/.env` with the following values. Adjust hostnames, ports, and credentials to match your local services.

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/hr_documents

JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

FRONTEND_URL=http://localhost:5173

MINIO_ENDPOINT=127.0.0.1:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=hr-documents
MINIO_SECURE=false

# Optional automation webhooks
N8N_DOCUMENT_WEBHOOK_URL=
N8N_INVITATION_WEBHOOK_URL=
```

Install dependencies, apply migrations, and start the API:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Configure the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The frontend’s API base URL is currently configured as `http://127.0.0.1:8000` in `frontend/src/api/api.js`.

## Frontend commands

Run these from `frontend/`:

```bash
npm run dev      # Start the Vite development server
npm run build    # Produce a production build
npm run preview  # Preview the production build locally
npm run lint     # Run Oxlint
```

## Backend health checks

With the API running:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/health/database
```

## Key API areas

| Base path | Purpose |
| --- | --- |
| `/auth` | Registration, login, account activation, profile, and 2FA |
| `/employees` | Employee invitations, directory, account state, and resend actions |
| `/documents` | Types, requirements, uploads, review actions, history, and downloads |
| `/notifications` | Notification inbox and read-state updates |
| `/audit` | HR activity history |

## UI architecture

The HR and employee workspaces use the same responsive application-shell pattern. Shared UI primitives in `frontend/src/components/ui/` provide consistent page headers, cards, form fields, status badges, tables, timelines, drawers, dialogs, file pickers, loading states, filters, pagination, and progress bars. Global toast feedback is provided through `ToastProvider`.

## Security notes

- Never commit `backend/.env`, database credentials, JWT secrets, or MinIO credentials.
- Use a unique, long `JWT_SECRET` outside local development.
- Use HTTPS and `MINIO_SECURE=true` in deployed environments.
- Restrict CORS origins in `backend/app/main.py` to deployed frontend domains.
