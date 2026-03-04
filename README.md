# DocuRoute

A document management platform for Singapore construction and engineering companies.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon), Prisma ORM
- **Auth**: JWT (httpOnly cookies), bcrypt
- **Storage**: Local disk (`/uploads`)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Update `.env.local` with your database URL and JWT secret
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
6. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
7. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment (Vercel)

1. Push code to GitHub
2. Create a Neon PostgreSQL database
3. Create a Vercel project, link your GitHub repo
4. Add environment variables in Vercel dashboard
5. Deploy — Vercel will run `prisma generate` and migrations automatically

## Environment Variables

See `.env.example` for all required variables.

## Features

- ✅ Multi-tenant (company-based isolation)
- ✅ User authentication (register, login, logout)
- ✅ Project management
- ✅ Document upload & download
- ✅ Team invitations
- ✅ Role-based access (IT Admin, Project Admin, Engineer, Client)
- ✅ Company settings

## Roles

- **IT Admin**: Full access, manage company settings and team
- **Project Admin**: Create and manage projects
- **Engineer**: Upload and view documents
- **Client**: View documents
