# DocuRoute

Document management platform for Singapore construction and engineering companies.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend**: Next.js API Routes, Prisma v7 ORM, PostgreSQL
- **Auth**: JWT in httpOnly cookies, bcryptjs
- **Storage**: Local disk (`/public/uploads/`) — ephemeral on Render (Phase 1)
- **Deploy**: Render (Web Service) + Neon / Render PostgreSQL

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on Render pointing to this repo
3. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`
4. Render will use `render.yaml` to build and start the app

## Features (Phase 1)

- **Authentication**: Register (creates company + IT Admin), Login, Logout
- **Multi-tenancy**: Each company has isolated data
- **Projects**: Create and manage construction projects
- **Documents**: Upload, download, and delete project documents
- **Team**: Invite team members by email (email sending stubbed — link logged to console)
- **Settings**: Update company name (IT Admin only)

## File Storage Note

Files are stored on local disk in `/public/uploads/`. On Render, the filesystem is ephemeral — uploaded files will be lost on restart/redeploy. This is acceptable for Phase 1 demo. Phase 2 will migrate to cloud storage (Backblaze B2 / S3).

## Roles

| Role | Description |
|------|-------------|
| `it_admin` | Full access, can manage company settings and invite users |
| `project_admin` | Can manage projects and invite users |
| `engineer` | Can upload/download documents |
| `client` | Read-only access |
