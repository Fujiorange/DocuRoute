# DocuRoute

Document management platform for Singapore construction and engineering companies.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend**: Next.js API Routes, Prisma v7 ORM, PostgreSQL
- **Auth**: JWT in httpOnly cookies, bcryptjs
- **Storage**: Local disk (`/public/uploads/`) — ephemeral on Render (Phase 1)
- **Deploy**: Render (Web Service) + Neon / Render PostgreSQL

---

## Complete Setup Guide (for New Programmers)

Follow every step in order. Do not skip any step.

---

### Step 1 — Install Prerequisites

Before you can run this project you need two tools installed on your computer.

#### 1a. Install Node.js (includes npm)

Node.js is the runtime that executes the project code. npm is the package manager that comes bundled with it.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** (Long Term Support) version — it is the most stable
3. Run the installer and follow the on-screen steps (keep all defaults)
4. Open a terminal / command prompt and verify the installation:

```bash
node --version
npm --version
```

You should see version numbers printed for both commands (e.g. `v20.x.x` and `10.x.x`).

> **Windows tip**: Search for "Command Prompt" or "PowerShell" in the Start menu to open a terminal.  
> **macOS tip**: Open the "Terminal" app from Applications → Utilities.

#### 1b. Install Git

Git lets you download (clone) this repository to your computer.

1. Go to [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Download and install the version for your operating system (keep all defaults)
3. Verify in a terminal:

```bash
git --version
```

You should see something like `git version 2.x.x`.

---

### Step 2 — Get a PostgreSQL Database

This project requires a PostgreSQL database to store its data. You have two options:

#### Option A — Free cloud database with Neon (Recommended for beginners — no local install needed)

1. Go to [https://neon.tech](https://neon.tech) and create a free account
2. Click **"Create Project"**, give it any name (e.g. `docuroute`), and select the region closest to you
3. After the project is created, find the **Connection Details** panel
4. Select **"Connection string"** from the dropdown and copy the full string — it looks like:
   ```
   postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this connection string — you will need it in Step 5

#### Option B — Local PostgreSQL installation

1. Go to [https://www.postgresql.org/download/](https://www.postgresql.org/download/) and install PostgreSQL for your OS
2. During installation, set a password for the `postgres` user (remember it!)
3. After installation, open **pgAdmin** (installed with PostgreSQL) or a terminal and create a new database called `docuroute`:
   ```bash
   psql -U postgres -c "CREATE DATABASE docuroute;"
   ```
4. Your connection string will be:
   ```
   postgresql://postgres:YOUR_PASSWORD@localhost:5432/docuroute
   ```
   Replace `YOUR_PASSWORD` with the password you set during installation.

---

### Step 3 — Clone the Repository

A "clone" downloads a copy of the project code to your computer.

Open a terminal, navigate to the folder where you want to keep the project (e.g. your Desktop or a `Projects` folder), and run:

```bash
git clone https://github.com/Fujiorange/DocuRoute.git
cd DocuRoute
```

You are now inside the project folder.

---

### Step 4 — Install Project Dependencies

The project relies on third-party libraries (called "packages"). Install them with:

```bash
npm install
```

This may take a minute or two. You will see a progress bar. When it finishes you will be back at the command prompt.

---

### Step 5 — Create the Environment File

The app needs a file called `.env.local` to know your database credentials and other settings. This file is **never committed to Git** because it contains secrets — you must create it yourself.

#### 5a. Copy the example file

A template is provided in `.env.example`. Copy it to create your own `.env.local`:

**macOS / Linux:**
```bash
cp .env.example .env.local
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

#### 5b. Open `.env.local` in a text editor

Open the file with any text editor (Notepad, VS Code, etc.). You will see:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="change-me-to-a-long-random-secret-at-least-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 5c. Fill in each value

**`DATABASE_URL`** — Replace the placeholder with your actual connection string from Step 2.

- If you used Neon:
  ```
  DATABASE_URL="postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```
- If you installed PostgreSQL locally:
  ```
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/docuroute"
  ```

**`JWT_SECRET`** — This must be a long, random string of at least 32 characters. It is used to sign login tokens and must be kept secret. Generate one by running this command in your terminal:

**macOS / Linux / PowerShell / Git Bash:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Windows Command Prompt:**
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Windows tip**: If the above command gives an error in Command Prompt, open **PowerShell** or **Git Bash** instead and run the same command there.

Copy the output (a 64-character hex string) and paste it as the value:

```
JWT_SECRET="a3f1c9e2b7d4082e5a6f3c1d9e0b2a4f7c8e1d3b5a9f2c0e4d7b1a8f3c6e9d2"
```

**`NEXT_PUBLIC_APP_URL`** — Leave this as-is for local development:

```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 5d. Save the file

Make sure you save `.env.local` after making your changes.

Your finished `.env.local` should look something like this (with your real values):

```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/docuroute"
JWT_SECRET="a3f1c9e2b7d4082e5a6f3c1d9e0b2a4f7c8e1d3b5a9f2c0e4d7b1a8f3c6e9d2"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### Step 6 — Run Database Migrations

Migrations create the required tables and structure inside your database. Run:

```bash
npx prisma migrate dev
```

When prompted for a migration name, you can type anything (e.g. `init`) or just press Enter.

If the command succeeds you will see a message like `Your database is now in sync with your schema.`

> **Troubleshooting**: If you see a connection error, double-check that your `DATABASE_URL` in `.env.local` is correct and that your database is running.

---

### Step 7 — Start the Development Server

```bash
npm run dev
```

You will see output like:

```
▲ Next.js 15.x.x (Turbopack)
- Local:        http://localhost:3000
```

Open your browser and go to [http://localhost:3000](http://localhost:3000).

---

### Step 8 — Create Your First Account

1. Click **"Register"** (or go to [http://localhost:3000/register](http://localhost:3000/register))
2. Fill in your company name, your name, email address, and a password
3. Click **"Create Account"** — this automatically creates your company and assigns you the **IT Admin** role
4. You are now logged in and can start using DocuRoute

---

## Deployment (Render)

To deploy DocuRoute to the internet using [Render](https://render.com):

1. Push your code to a GitHub repository
2. Go to [https://render.com](https://render.com) and sign in (or create a free account)
3. Click **"New +"** → **"Web Service"** and connect your GitHub repository
4. Render will detect `render.yaml` automatically
5. Add the following environment variables in the Render dashboard under **Environment**:
   - `DATABASE_URL` — your production PostgreSQL connection string (Neon or Render PostgreSQL)
   - `JWT_SECRET` — a new, strong random secret (generate one as shown in Step 5c above)
   - `NEXT_PUBLIC_APP_URL` — your Render app URL (e.g. `https://docuroute.onrender.com`)
6. Click **"Create Web Service"** — Render will install dependencies, run migrations, build, and start the app

---

## Features (Phase 1)

- **Authentication**: Register (creates company + IT Admin), Login, Logout
- **Multi-tenancy**: Each company has isolated data
- **Projects**: Create and manage construction projects
- **Documents**: Upload, download, and delete project documents
- **Team**: Invite team members by email (email sending stubbed — invitation link is printed to the server console)
- **Settings**: Update company name (IT Admin only)

## File Storage Note

Uploaded files are stored locally in `/public/uploads/`. On Render, the filesystem is ephemeral — uploaded files will be lost on restart or redeploy. This is expected for the Phase 1 demo. Phase 2 will migrate to cloud storage (Backblaze B2 / S3).

## Roles

| Role | Description |
|------|-------------|
| `it_admin` | Full access: manage company settings, invite users, manage all projects |
| `project_admin` | Can create/manage projects and invite users |
| `engineer` | Can upload and download documents |
| `client` | Read-only access to documents |
