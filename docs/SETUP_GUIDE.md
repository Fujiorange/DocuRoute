# DocuRoute Setup & Usage Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [External Services Setup](#external-services-setup)
7. [Running the Application](#running-the-application)
8. [Initial System Setup](#initial-system-setup)
9. [Navigating DocuRoute](#navigating-docuroute)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**DocuRoute** is a document management SaaS platform designed for regulated heavy industries (marine, engineering, construction). It provides ISO 9001-compliant document control with multi-tenant architecture, role-based access control, and comprehensive audit logging.

**Key Features:**
- Document lifecycle management with revision control
- PDF watermarking with QR code verification
- Document transmittals for controlled exchange
- Workflow approvals with multi-stage reviews
- Legal holds and retention policies
- PWA support for offline access
- Comprehensive audit logging

**Technology Stack:**
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, NextAuth v4
- **Database:** PostgreSQL (with Row-Level Security for multi-tenancy)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Resend
- **Queue:** BullMQ with Redis
- **Build System:** pnpm workspaces + Turborepo

---

## Prerequisites

Before installing DocuRoute, ensure you have the following installed. Don't worry if you're new to these tools – we'll explain what each one does and why you need it.

### Required Software

#### 1. **Node.js** (v20 or higher) - JavaScript Runtime

**What is it?** Node.js allows you to run JavaScript code outside of a web browser. DocuRoute's backend and build tools run on Node.js.

**Installation:**

- **macOS:** Download from [nodejs.org](https://nodejs.org) or use Homebrew:
  ```bash
  brew install node@20
  ```

- **Windows:** Download the installer from [nodejs.org](https://nodejs.org)

- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

**Verify installation:**
```bash
node --version
# Should show v20.x.x or higher
```

💡 **Tip:** If `node --version` shows a version lower than 20, you'll need to upgrade Node.js before proceeding.

---

#### 2. **pnpm** (v10.32.1 or higher) - Package Manager

**What is it?** pnpm is a package manager that downloads and manages the libraries (dependencies) that DocuRoute needs. It's faster and more efficient than npm.

**Why pnpm?** DocuRoute uses a "monorepo" structure with multiple interconnected packages. pnpm handles this better than npm or yarn.

**Installation:**
```bash
# Install pnpm globally using npm (which comes with Node.js)
npm install -g pnpm@10.32.1

# Verify installation
pnpm --version
# Should show 10.32.1 or higher
```

💡 **Tip:** If you get a permission error on macOS/Linux, try using `sudo`: `sudo npm install -g pnpm@10.32.1`

---

#### 3. **PostgreSQL** (v14 or higher) - Database

**What is it?** PostgreSQL is a powerful database that stores all of DocuRoute's data (users, documents, audit logs, etc.).

**Do I need to install it locally?** No! We **strongly recommend** using a managed service like [Supabase](https://supabase.com) (which is free for development). This is much easier than installing PostgreSQL yourself.

**Option A: Using Supabase (Recommended for Beginners):**
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Choose a name, password, and region
5. Wait 2-3 minutes for setup to complete
6. We'll get the connection details later in [Database Setup](#database-setup)

**Option B: Local PostgreSQL Installation (Advanced):**

If you prefer to run PostgreSQL locally:

- **macOS:**
  ```bash
  brew install postgresql@14
  brew services start postgresql@14
  ```

- **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)

- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt install postgresql-14
  sudo systemctl start postgresql
  ```

**Verify installation (local only):**
```bash
psql --version
# Should show 14.x or higher
```

---

#### 4. **Redis** (for background jobs and caching)

**What is it?** Redis is an in-memory data store used by DocuRoute for:
- **Background jobs** (like PDF watermarking, email sending)
- **Rate limiting** (preventing abuse)
- **Caching** (making permissions checks faster)

**Do I need to install it locally?** No! We **strongly recommend** using [Upstash Redis](https://upstash.com) (free tier available). This is much easier than running Redis yourself.

**Option A: Using Upstash Redis (Recommended for Beginners):**
1. Go to [upstash.com](https://upstash.com)
2. Sign up for a free account
3. Click "Create Database"
4. Choose a name and region close to you
5. Select the free tier
6. We'll get the connection details later in [External Services Setup](#external-services-setup)

**Option B: Local Redis Installation (Advanced):**

- **macOS:**
  ```bash
  brew install redis
  brew services start redis
  ```

- **Windows:** Download from [redis.io](https://redis.io/download) or use WSL

- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt install redis-server
  sudo systemctl start redis
  ```

**Verify installation (local only):**
```bash
redis-cli --version
# Should show 6.x or higher

# Test connection
redis-cli ping
# Should respond with "PONG"
```

---

### ✅ **Checkpoint: Prerequisites Complete**

Before moving forward, verify you have:
- ✅ Node.js v20+ installed (`node --version`)
- ✅ pnpm v10.32.1+ installed (`pnpm --version`)
- ✅ Signed up for Supabase OR installed PostgreSQL locally
- ✅ Signed up for Upstash Redis OR installed Redis locally

If all checkboxes are checked, you're ready to proceed!

### External Services (Required)

DocuRoute relies on several cloud services to function. Most have generous free tiers perfect for development and testing. We'll explain what each service does and help you sign up.

#### Summary of Services Needed:

| Service | Purpose | Free Tier? | Required? |
|---------|---------|------------|-----------|
| **Supabase** | Database hosting | ✅ Yes | ✅ Yes |
| **Cloudflare R2** | File storage (PDFs, etc.) | ✅ 10GB free | ✅ Yes |
| **Resend** | Email delivery | ✅ 100 emails/day | ✅ Yes |
| **Upstash Redis** | Background jobs & caching | ✅ 10K commands/day | ✅ Yes |
| **VirusTotal** | Virus scanning | ✅ 500 lookups/day | ✅ Yes |
| **Stripe** | Payment processing | ✅ Test mode free | ⚠️ Optional* |
| **AWS KMS** | Encryption keys | ❌ No (but can skip) | ⚠️ Optional* |

\* For development, you can skip Stripe (if not testing billing) and use `LOCAL_KMS_MODE=true` instead of AWS KMS.

---

#### 1. **Supabase** - PostgreSQL Database Hosting

**What it does:** Hosts your PostgreSQL database in the cloud. No need to manage servers yourself!

**Sign up:**
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. Click "New Project"
5. Fill in:
   - **Name:** `docuroute-dev` (or any name you like)
   - **Database Password:** Choose a strong password and **save it somewhere safe!**
   - **Region:** Choose one close to you for better performance
6. Click "Create new project"
7. Wait 2-3 minutes for the database to be created

**Getting your connection strings:**

After the project is created:

1. Click "Connect" button (or go to Project Settings > Database)
2. Look for **Connection Pooling** section (this is the pooled connection)
3. Copy the connection string that includes `:6543` in the port number
   - This is your `DATABASE_URL`
   - Format: `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres`
4. Now look for **Direct Connection** section (or change the mode dropdown)
5. Copy the connection string that includes `:5432` in the port number
   - This is your `DIRECT_URL`
   - Format: `postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres`

💡 **Important:** You need BOTH URLs - the pooled one (`:6543`) for queries and the direct one (`:5432`) for migrations.

**Save these for later** - you'll need them when setting up environment variables.

---

#### 2. **Cloudflare R2** - File Storage

**What it does:** Stores uploaded PDF files, watermarked documents, and other files. It's like Dropbox but for applications. R2 is S3-compatible (compatible with Amazon S3) but cheaper.

**Sign up:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up for a Cloudflare account (free)
3. Verify your email

**Create a storage bucket:**
1. In the Cloudflare dashboard, click **R2** in the left sidebar
2. Click "Create bucket"
3. Choose a name: `docuroute-files` (must be globally unique, add your initials if taken)
4. Select a location (choose one close to you)
5. Click "Create bucket"

**Generate API credentials:**
1. Go to **R2** > **Manage R2 API Tokens**
2. Click "Create API token"
3. Fill in:
   - **Token name:** `docuroute-api`
   - **Permissions:** Select "Object Read & Write"
   - **Bucket:** Select the bucket you just created
4. Click "Create API Token"
5. **IMPORTANT:** Copy these values immediately (they won't be shown again):
   - `Access Key ID` → This is your `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → This is your `R2_SECRET_ACCESS_KEY`
   - `Account ID` → This is your `R2_ACCOUNT_ID` (shown at the top)

**Get your public URL:**
- Your bucket URL will be: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- This is your `R2_PUBLIC_URL`

💡 **Tip:** Store these credentials securely - you won't be able to see the secret key again!

---

#### 3. **Resend** - Email Delivery

**What it does:** Sends emails from DocuRoute (magic login links, invitations, notifications).

**Sign up:**
1. Go to [resend.com](https://resend.com)
2. Click "Sign Up"
3. Create an account with email or GitHub
4. Verify your email address

**Get API key:**
1. Once logged in, go to **API Keys** in the left sidebar
2. Click "Create API Key"
3. Give it a name: `docuroute-dev`
4. Select permissions: **Full Access** (or "Sending access" if available)
5. Click "Create"
6. **Copy the API key immediately** - this is your `RESEND_API_KEY`
7. Store it securely (you won't see it again)

**For development (testing locally):**

You can use Resend's test mode right away! For development, you can use their domain:
- Set `RESEND_FROM_EMAIL=onboarding@resend.dev` (Resend provides this for testing)

**For production (custom domain):**

You'll need to verify your own domain:
1. Go to **Domains** in Resend
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records they provide (SPF, DKIM, DMARC)
5. Wait for verification (can take a few minutes to hours)
6. Then use `RESEND_FROM_EMAIL=noreply@yourdomain.com`

💡 **For now:** Just use `onboarding@resend.dev` for development. You can set up a custom domain later.

---

#### 4. **Upstash Redis** - Background Jobs & Caching

**What it does:** Handles background tasks (like watermarking PDFs) and speeds up permission checks through caching.

**Sign up:**
1. Go to [upstash.com](https://upstash.com)
2. Click "Get Started"
3. Sign up with GitHub, Google, or email
4. Verify your email

**Create Redis database:**
1. Click "Create Database"
2. Fill in:
   - **Name:** `docuroute-dev`
   - **Type:** Select **Regional** (faster, cheaper)
   - **Region:** Choose one close to you
   - **Eviction:** Leave as default
3. Click "Create"

**Get connection details:**

After creation, you'll see the database details page. You need TWO different connection methods:

1. **For BullMQ (Background Jobs):**
   - Look for section titled **"REST API"** or scroll down to **Connection**
   - Find the **Redis Connection String** (starts with `redis://`)
   - Copy the full URL: `redis://default:password@region.upstash.io:6379`
   - This is your `REDIS_URL`

2. **For Rate Limiting (REST API):**
   - Find **REST API** section
   - Copy `UPSTASH_REDIS_REST_URL` (starts with `https://`)
   - Copy `UPSTASH_REDIS_REST_TOKEN` (long random string)

💡 **Why two connection methods?** BullMQ (background jobs) needs the fast Redis protocol. Rate limiting can use the slower REST API since it's not time-critical.

---

#### 5. **VirusTotal** - File Scanning

**What it does:** Scans uploaded files for viruses and malware to keep your system secure.

**Sign up:**
1. Go to [virustotal.com](https://www.virustotal.com)
2. Click "Sign Up" in the top right
3. Create a free account
4. Verify your email

**Get API key:**
1. Log in and click your profile icon (top right)
2. Select **API Key** from the dropdown
3. Copy your API key - this is your `VIRUSTOTAL_API_KEY`

💡 **Free tier limits:** 500 lookups per day (plenty for development)

---

#### 6. **Stripe** (Optional - for payment testing)

**What it does:** Handles subscription payments and billing.

**Do I need this?** Only if you want to test the billing features. You can skip this for now and add it later.

**Sign up:**
1. Go to [stripe.com](https://stripe.com)
2. Create a free account
3. Go to **Developers** > **API Keys**
4. Find your **Publishable key** and **Secret key** (these are TEST keys)
5. Copy both:
   - Publishable key → `STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

**Webhook setup (advanced, skip for now):**

Webhooks notify DocuRoute when payments succeed. You can set this up later when deploying to production.

---

#### 7. **AWS KMS** (Optional - encryption)

**What it does:** Encrypts sensitive data using AWS Key Management Service.

**Do I need this?** Not for development! Just use `LOCAL_KMS_MODE=true` in your environment variables.

**For production (later):**
1. Create an AWS account
2. Go to AWS KMS service
3. Create a customer master key (CMK)
4. Copy the ARN (Amazon Resource Name)
5. Create IAM credentials with KMS permissions

💡 **For now:** Set `LOCAL_KMS_MODE=true` and skip AWS KMS entirely.

---

### ✅ **Checkpoint: Services Setup Complete**

Before continuing, make sure you have:

**Required Services:**
- ✅ Supabase account created with database running
- ✅ Saved `DATABASE_URL` (pooled, port 6543)
- ✅ Saved `DIRECT_URL` (direct, port 5432)
- ✅ Cloudflare R2 bucket created
- ✅ Saved R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`)
- ✅ Resend account created with API key
- ✅ Upstash Redis database created
- ✅ Saved Redis credentials (`REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- ✅ VirusTotal API key obtained

**Optional Services (can add later):**
- ⚠️ Stripe keys (only if testing billing)
- ⚠️ AWS KMS (use `LOCAL_KMS_MODE=true` instead)

💡 **Pro tip:** Create a temporary text file to store all these credentials. You'll need them in the next step when setting up environment variables!

---

## Installation

Now that you have all the prerequisites and services set up, let's install DocuRoute on your local machine.

### Step 1: Clone the Repository

**What this does:** Downloads the DocuRoute source code to your computer.

```bash
# Open your terminal and navigate to where you want to store the project
cd ~/Projects  # or wherever you keep your code

# Clone the repository
git clone https://github.com/Fujiorange/DocuRoute.git

# Navigate into the project folder
cd DocuRoute
```

💡 **What just happened?** You now have a folder called `DocuRoute` containing all the source code.

**Verify:**
```bash
# List the contents
ls -la

# You should see folders like:
# - apps/          (contains web app and worker)
# - packages/      (shared code libraries)
# - docs/          (documentation)
# - package.json   (project configuration)
```

---

### Step 2: Install Dependencies

**What this does:** Downloads all the libraries and tools that DocuRoute needs to run (there are hundreds of them!).

```bash
# Make sure you're in the DocuRoute folder
pwd  # Should show: /path/to/DocuRoute

# Install all dependencies
pnpm install
```

**What's happening during installation:**

1. pnpm reads `package.json` files to see what's needed
2. Downloads packages from npm registry
3. Sets up links between workspace packages
4. This might take 2-5 minutes depending on your internet speed

💡 **Expected output:** You'll see a progress bar and lots of package names scrolling by. This is normal!

**Successful installation looks like:**
```
Progress: resolved 1234, reused 1200, downloaded 34, added 1234
packages/db: Running postinstall script, done in 2s
Done in 3m 45s
```

⚠️ **Common issues:**

- **Error: "EACCES: permission denied"** → Try running without `sudo`. If that doesn't work, fix npm permissions
- **Error: "network timeout"** → Your internet connection might be slow. Try again
- **Error: "Unsupported engine"** → Check your Node.js version with `node --version` (need v20+)

**Verify installation:**
```bash
# Check that node_modules folder was created
ls node_modules  # Should show lots of folders

# Check that workspace packages were installed
ls apps/web/node_modules  # Should exist
ls packages/db/node_modules  # Should exist
```

### What You Just Installed:

DocuRoute is a **monorepo** (multiple interconnected packages in one repository):

```
DocuRoute/
├── apps/
│   ├── web/          ← Next.js frontend application
│   ├── worker/       ← Background job processor (PDF watermarking, emails)
│   └── pdf-worker/   ← Go service for PDF processing
├── packages/
│   ├── core/         ← Business logic (permissions, watermarking, etc.)
│   ├── db/           ← Prisma database client and schema
│   ├── types/        ← Shared TypeScript type definitions
│   └── emails/       ← Email templates (React Email)
└── docs/             ← Documentation you're reading now!
```

💡 **Good to know:** When you run `pnpm install`, it installs dependencies for ALL of these packages at once.

---

### ✅ **Checkpoint: Installation Complete**

Before moving on, verify:
- ✅ Repository cloned successfully
- ✅ `pnpm install` completed without errors
- ✅ `node_modules` folder exists
- ✅ All workspace packages have dependencies installed

If any step failed, scroll up to see the error message and try to resolve it before continuing.

---

## Environment Configuration

**What are environment variables?** These are secret configuration values (like passwords and API keys) that tell DocuRoute how to connect to services. They're stored in `.env.local` files which are kept out of git for security.

**Why two separate `.env.local` files?** DocuRoute has two main applications:
1. **Web app** (`apps/web`) - The main application users interact with
2. **Worker** (`apps/worker`) - Background processor for heavy tasks

Each needs its own configuration file.

---

### Step 1: Set Up Web Application Environment

Navigate to the web app directory:

```bash
cd apps/web
```

#### Create the Environment File

```bash
# Copy the example file
cp .env.example .env.local

# Open it for editing (choose your preferred editor)
nano .env.local    # or use: code .env.local (VS Code), vim, etc.
```

💡 **What's the difference?**
- `.env.example` - Template with placeholder values (safe to commit to git)
- `.env.local` - Your actual secrets (NEVER committed to git - listed in `.gitignore`)

---

#### Fill In Your Configuration

Now, let's fill in the `.env.local` file with the credentials you collected earlier. Here's what each section does:

##### **Database Configuration**

```bash
# ==========================================
# Database (Supabase or PostgreSQL)
# ==========================================

# PgBouncer pooled URL (port 6543) - for general queries
# Use the pooled connection you got from Supabase
DATABASE_URL=postgresql://postgres.xxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection (port 5432) - for migrations only
# Use the direct connection you got from Supabase
DIRECT_URL=postgresql://postgres.xxx:yourpassword@db.xxx.supabase.co:5432/postgres
```

**What's the difference?**
- **DATABASE_URL (pooled):** Used for normal app queries. Port 6543. Faster for many concurrent connections.
- **DIRECT_URL (direct):** Used only for database migrations (schema changes). Port 5432. Required for migrations to work.

⚠️ **Common mistake:** Swapping these URLs will cause migrations to fail!

---

##### **Authentication Configuration**

```bash
# ==========================================
# Authentication (NextAuth)
# ==========================================

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<generate-a-random-string-here>

# Your application URL (keep as localhost for development)
NEXTAUTH_URL=http://localhost:3000
```

**How to generate NEXTAUTH_SECRET:**

```bash
# In your terminal, run:
openssl rand -base64 32

# Copy the output and paste it as your NEXTAUTH_SECRET
# Example output: kJh3k9Lm4nB6vC8xZ0qW2eR5tY7uI9oP1aS3dF6gH8j=
```

**What is this?** A secret key used to encrypt session cookies and JWT tokens. Keep it secret!

---

##### **Cloudflare R2 (File Storage)**

```bash
# ==========================================
# Cloudflare R2 (File Storage)
# ==========================================

# Use the values you saved from Cloudflare R2 setup
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-r2-access-key-here
R2_SECRET_ACCESS_KEY=your-r2-secret-key-here
R2_BUCKET_NAME=docuroute-files  # or whatever you named your bucket
R2_PUBLIC_URL=https://your-account-id.r2.cloudflarestorage.com
```

💡 **Where to find these:** Go back to your Cloudflare dashboard > R2 > API Tokens

---

##### **AWS KMS (Encryption) - Development Mode**

```bash
# ==========================================
# AWS KMS (Encryption)
# ==========================================

# For development, use local mode (no AWS account needed!)
LOCAL_KMS_MODE=true

# For production (commented out for now):
# AWS_KMS_KEY_ARN=arn:aws:kms:region:account:key/xxx
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# AWS_REGION=us-east-1
```

**What is this?** Encryption for sensitive data. In local mode, it uses simple encryption. In production, it uses AWS for stronger security.

**For now:** Just set `LOCAL_KMS_MODE=true` and you're done!

---

##### **Email (Resend)**

```bash
# ==========================================
# Email (Resend)
# ==========================================

# Use the API key from Resend
RESEND_API_KEY=re_your_api_key_here

# For development, use Resend's test domain:
RESEND_FROM_EMAIL=onboarding@resend.dev

# For production with your own domain:
# RESEND_FROM_EMAIL=noreply@yourdomain.com
```

💡 **Development tip:** Use `onboarding@resend.dev` for now. You can set up a custom domain later.

---

##### **Stripe (Payment Processing) - Optional**

```bash
# ==========================================
# Stripe (Payment Processing)
# ==========================================

# Only fill these in if you want to test billing features
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key  # same as above
```

⚠️ **Can skip:** If you're not testing billing, you can leave these blank or commented out.

---

##### **Redis (Rate Limiting & Background Jobs)**

```bash
# ==========================================
# Redis (Rate Limiting - Upstash REST API)
# ==========================================

# From Upstash dashboard > Your database > REST API section
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-long-token-here

# ==========================================
# Redis (BullMQ - Direct Protocol)
# ==========================================

# From Upstash dashboard > Your database > Redis section
# IMPORTANT: Must start with redis:// (not rediss://)
REDIS_URL=redis://default:your-password@your-db.upstash.io:6379
```

**Why two Redis configurations?**
- **REST API:** For rate limiting (slower but simpler)
- **Direct protocol:** For background jobs (much faster, required for BullMQ)

⚠️ **Important:** Make sure `REDIS_URL` starts with `redis://` not `rediss://`

---

##### **Cron Protection**

```bash
# ==========================================
# Cron Protection
# ==========================================

# Generate with: openssl rand -hex 32
CRON_SECRET=<generate-another-random-string>
```

**Generate it:**
```bash
openssl rand -hex 32
# Example output: 4f7a8b9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f
```

**What is this?** Prevents unauthorized access to scheduled tasks (cron jobs).

---

##### **Application Configuration**

```bash
# ==========================================
# Application Configuration
# ==========================================

NEXT_PUBLIC_APP_URL=http://localhost:3000  # Keep this for local development
NEXT_PUBLIC_VERSION=0.1.0  # Current version
```

---

##### **Platform Admin**

```bash
# ==========================================
# Platform Admin
# ==========================================

# Use YOUR email address here - you'll use this to log in!
PLATFORM_ADMIN_EMAIL=your-email@example.com
```

**Important:** The first user to sign in with this email automatically becomes the platform admin (super user).

---

##### **Pilot Seeding (Optional)**

```bash
# ==========================================
# Pilot Seeding (Optional)
# ==========================================

# These are used if you run the seed script to create test data
PILOT_OWNER_EMAIL=pilot@yourdomain.com
PILOT_PROJECT_NAME=Test Project
PILOT_NAMING_MASK=PRJ-{YYYY}-{####}
```

⚠️ **Can skip:** Only needed if you want to create sample/demo data.

---

##### **Virus Scanning**

```bash
# ==========================================
# Virus Scanning
# ==========================================

# From VirusTotal dashboard
VIRUSTOTAL_API_KEY=your-virustotal-api-key-here
```

---

##### **QR Verification**

```bash
# ==========================================
# QR Verification
# ==========================================

# For development, keep as localhost
QR_VERIFICATION_BASE_URL=http://localhost:3000

# For production, use your actual domain:
# QR_VERIFICATION_BASE_URL=https://yourdomain.com
```

**What is this?** The URL that QR codes on documents link to for verification.

---

### Step 2: Set Up Worker Environment

Now navigate to the worker directory:

```bash
# From the web directory, go back to root, then to worker
cd ../worker

# Copy the example file
cp .env.example .env.local

# Edit it
nano .env.local
```

The worker needs fewer environment variables (no Stripe, no Next.js specific stuff):

```bash
# ==========================================
# Database
# ==========================================
DATABASE_URL=postgresql://postgres.xxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:yourpassword@db.xxx.supabase.co:5432/postgres

# ==========================================
# Cloudflare R2
# ==========================================
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=docuroute-files
R2_PUBLIC_URL=https://your-account-id.r2.cloudflarestorage.com

# ==========================================
# AWS KMS
# ==========================================
LOCAL_KMS_MODE=true

# ==========================================
# Email (Resend)
# ==========================================
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev

# ==========================================
# Redis (BullMQ)
# ==========================================
REDIS_URL=redis://default:your-password@your-db.upstash.io:6379

# ==========================================
# Cron Protection
# ==========================================
CRON_SECRET=your-cron-secret-here  # Use the SAME value as in web app

# ==========================================
# Platform Admin
# ==========================================
PLATFORM_ADMIN_EMAIL=your-email@example.com  # Use the SAME email as in web app

# ==========================================
# QR Verification
# ==========================================
QR_VERIFICATION_BASE_URL=http://localhost:3000
```

💡 **Important:** Use the **same values** for:
- Database URLs
- R2 credentials
- Redis URL
- `CRON_SECRET` (must match!)
- `PLATFORM_ADMIN_EMAIL` (must match!)

---

### ✅ **Checkpoint: Environment Configuration Complete**

Before continuing, verify:

**For `apps/web/.env.local`:**
- ✅ Both database URLs configured (port 6543 and 5432)
- ✅ `NEXTAUTH_SECRET` generated and set
- ✅ R2 credentials filled in (all 5 values)
- ✅ `RESEND_API_KEY` set
- ✅ Redis credentials set (both REST and direct protocol)
- ✅ `CRON_SECRET` generated and set
- ✅ `PLATFORM_ADMIN_EMAIL` set to your email
- ✅ `VIRUSTOTAL_API_KEY` set
- ✅ `LOCAL_KMS_MODE=true` set

**For `apps/worker/.env.local`:**
- ✅ All required values filled in
- ✅ `CRON_SECRET` matches the web app
- ✅ `PLATFORM_ADMIN_EMAIL` matches the web app

**Verify files exist:**
```bash
# From the root directory
ls apps/web/.env.local      # Should exist
ls apps/worker/.env.local   # Should exist

# Check they're not empty
wc -l apps/web/.env.local   # Should show 20+ lines
```

🎉 **Great job!** Your environment is configured. Let's set up the database next.

---

## Database Setup

### 1. Enable PostgreSQL Extensions

If using Supabase, go to **Database > Extensions** and enable:
- `pg_trgm` (for fuzzy text search)

If using self-hosted PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2. Generate Prisma Client

```bash
# From the root directory
cd /home/runner/work/DocuRoute/DocuRoute

# Generate Prisma client
pnpm --filter @docuroute/db exec prisma generate
```

### 3. Run Database Migrations

```bash
# Run all migrations
pnpm --filter @docuroute/db exec prisma migrate deploy
```

This will create all necessary tables and apply Row-Level Security policies.

### 4. Verify Database Schema

Check that these tables were created:
- `Role` - System and custom roles
- `Company` - Tenant companies
- `User` - User accounts
- `Project` - Projects within companies
- `Document` - Document metadata
- `DocumentRevision` - Document revisions (A, B, C, etc.)
- `Transmittal` - Document transmittals
- `AuditLog` - Immutable audit trail
- `Notification` - User notifications
- `CompanyOnboarding` - Onboarding state
- `CompanyTransmittalConfig` - Transmittal configuration

---

## External Services Setup

### 1. Cloudflare R2 Setup

1. **Create R2 Bucket:**
   - Log in to Cloudflare Dashboard
   - Navigate to **R2 Object Storage**
   - Click **Create bucket**
   - Name it (e.g., `docuroute-files`)
   - Choose location

2. **Generate API Token:**
   - Go to **R2 > Manage R2 API Tokens**
   - Click **Create API token**
   - Permissions: **Object Read & Write**
   - Note: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`

3. **Get Public URL:**
   - The public URL format: `https://[account_id].r2.cloudflarestorage.com`
   - Or set up custom domain in R2 bucket settings

### 2. Resend Email Setup

1. **Sign up and verify domain:**
   - Go to https://resend.com
   - Add your domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification

2. **Create API Key:**
   - Go to **API Keys**
   - Click **Create API Key**
   - Copy the key to `RESEND_API_KEY`

3. **Test Email:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@yourdomain.com",
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

### 3. Upstash Redis Setup

1. **Create Database:**
   - Go to https://upstash.com
   - Click **Create Database**
   - Choose region closest to your app
   - Select **Pay as you go** or **Free**

2. **Get Connection Strings:**
   - **For Rate Limiting:** Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - **For BullMQ:** Copy the Redis URL (format: `redis://default:password@host:6379`)

### 4. Stripe Setup (Optional)

1. **Get Test Keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** and **Secret key**

2. **Configure Webhook:**
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 5. VirusTotal Setup

1. **Sign up:**
   - Go to https://www.virustotal.com
   - Create account

2. **Get API Key:**
   - Go to **Profile > API Key**
   - Copy key to `VIRUSTOTAL_API_KEY`

---

## Running the Application

### Development Mode

You can run all services together or separately.

#### Option 1: Run Everything (Recommended)

From the root directory:

```bash
# Run web app, worker, and build watchers
pnpm dev
```

This starts:
- **Web app** on http://localhost:3000
- **Worker** (background jobs processor)
- All package build watchers

#### Option 2: Run Services Separately

**Terminal 1 - Web Application:**
```bash
cd apps/web
pnpm dev
```

**Terminal 2 - Worker:**
```bash
cd apps/worker
pnpm dev
```

### Production Mode

#### 1. Build the Application

```bash
# From root directory
pnpm build
```

This builds:
- All packages (`@docuroute/core`, `@docuroute/db`, etc.)
- Web application (Next.js)
- Worker

#### 2. Run in Production

**Web Application:**
```bash
cd apps/web
pnpm start
```

**Worker:**
```bash
cd apps/worker
node dist/index.js
```

### Verify Services

1. **Web App:** Open http://localhost:3000
2. **API Health:** http://localhost:3000/api/health
3. **Database Connection:** Check web app logs for successful connection

---

## Initial System Setup

### Step 1: Create Platform Admin Account

The platform admin is a special account for DocuRoute system administrators.

1. **Open the application:** http://localhost:3000
2. **Click "Sign in with Email"**
3. **Enter the email** specified in `PLATFORM_ADMIN_EMAIL`
4. **Check email** for magic link
5. **Click the link** to verify and log in

**Note:** The first user with the platform admin email automatically gets `PLATFORM_ADMIN` role.

### Step 2: Create Your First Company

After logging in as platform admin:

1. Navigate to **Settings > Platform** (only visible to platform admins)
2. Click **Create Company**
3. Fill in:
   - **Company Name:** e.g., "Acme Engineering"
   - **Slug:** e.g., "acme-engineering" (used in URLs)
   - **Plan Tier:** Choose "PILOT", "STANDARD", or "ENTERPRISE"
4. Click **Create**

The company will be created with:
- All 6 system roles (COMPANY_OWNER, COMPANY_ADMIN, etc.)
- Default settings
- Clean audit log

### Step 3: Create Company Owner

1. Navigate to **Settings > Users**
2. Click **Invite User**
3. Enter:
   - **Email:** Owner's email address
   - **Name:** Owner's full name
   - **Role:** Select "COMPANY_OWNER"
4. Click **Send Invitation**

The user will receive an email invitation with an accept link.

### Step 4: Accept Invitation (as new user)

1. **Check email** for invitation
2. **Click "Accept Invitation"** button
3. **Review permissions** shown on accept page
4. **Click "Accept & Sign In"**
5. **Sign in** with magic link sent to email

### Step 5: Create First Project

As a company owner or admin:

1. Navigate to **Projects** from sidebar
2. Click **Create Project**
3. Enter:
   - **Project Name:** e.g., "Vessel Hull 2026"
   - **Description:** Optional project description
4. Click **Create**

Projects are containers for documents. All documents must belong to a project.

### Step 6: Configure Document Settings (Optional)

1. Navigate to **Settings > Document Control**
2. Configure:
   - **Recycle Bin Retention:** Days before permanent deletion (default: 90)
   - **Bulk Operation Undo Window:** Minutes to undo bulk operations (default: 30)
   - **Naming Masks:** Document code patterns (e.g., `DWG-{YYYY}-{####}`)

### Step 7: Configure Transmittal Settings (Optional)

1. Navigate to **Settings > Transmittals**
2. Configure:
   - **Number Prefix:** e.g., "SHP" for shipyard transmittals
   - **Number Padding:** Digits in counter (default: 4 for 0001, 0002, etc.)
   - **Enabled Columns:** Select which document columns to show
   - **Header Fields:** Configure transmittal header information
3. **Reorder columns** using ↑↓ arrows
4. Click **Save Configuration**

---

## Navigating DocuRoute

### Main Navigation Structure

```
DocuRoute Dashboard
├── Dashboard (Home)
├── Documents
│   ├── All Documents (Register view)
│   ├── Document Details
│   └── Conflicts
├── Transmittals
│   ├── All Transmittals
│   ├── Create Transmittal
│   └── Transmittal Details
├── Projects
│   └── Project List
├── Approvals
│   ├── Pending Approvals
│   └── Completed Workflows
├── Search (Cmd+K / Ctrl+K)
├── Audit Log
├── Auditor Tools (for AUDITOR role)
└── Settings
    ├── Users
    ├── Roles
    ├── Security
    │   └── Identity & SSO
    ├── Service Accounts
    ├── Document Control
    ├── Naming Masks
    ├── Transmittals
    ├── Legal Holds
    ├── Retention Policies
    ├── Succession Planning
    ├── Billing
    └── Mobile/PWA
```

### Feature Walkthrough

#### 1. Document Management

**Upload a Document:**

1. Navigate to **Documents**
2. Click **Upload Document**
3. Drag & drop file or click to browse
4. Fill in metadata:
   - **Document Code:** e.g., "DWG-2026-0001"
   - **Title:** e.g., "Hull Section A - General Arrangement"
   - **Discipline:** Select from dropdown (Mechanical, Electrical, Civil, etc.)
   - **Project:** Select project
   - **Issue Purpose:** FOR_CONSTRUCTION, FOR_INFORMATION, etc.
5. Click **Upload**

The document will be:
- Uploaded to R2 storage
- Scanned for viruses (if VirusTotal configured)
- Watermarked with QR code (if <200MB and FOR_CONSTRUCTION)
- Created as Revision A (initial revision)
- Logged in audit trail

**View Document Register:**

1. Navigate to **Documents**
2. See table with columns:
   - Document Code
   - Title
   - Current Revision (A, B, C, etc.)
   - Discipline
   - Status
   - Last Modified
3. **Filter** by status, discipline, project
4. **Search** by document code or title
5. **Click row** to view document details

**View Document Details:**

1. Click any document in register
2. See document information:
   - Current revision highlighted
   - All revision history (A, B, C, etc.)
   - Metadata (code, title, discipline, etc.)
   - File size, upload date, uploader
3. **Download** current or any previous revision
4. **Upload New Revision** (creates revision B, C, etc.)
5. **View QR code** for field verification

**Upload New Revision:**

1. On document details page
2. Click **Upload New Revision**
3. Select new file
4. Add **Revision Notes** (required)
5. Click **Upload**

The system will:
- Mark previous revision as SUPERSEDED
- Increment revision code (A→B→C...Z→AA)
- Create new revision as CURRENT
- Log both REVISION_CREATED and REVISION_SUPERSEDED events

**Bulk Import from Excel:**

1. Navigate to **Documents**
2. Click **Bulk Import**
3. Download **Excel template** (if first time)
4. Fill in Excel with:
   - Column A: `documentCode` (required)
   - Column B: `title` (required)
   - Column C: `discipline` (optional)
5. Upload Excel file
6. Review preview
7. Click **Import**

Documents will be created with:
- Status: PENDING_METADATA
- Initial Revision: A
- Placeholder files (actual files uploaded later)

#### 2. Transmittals

**Create Transmittal:**

1. Navigate to **Transmittals**
2. Click **Create Transmittal**
3. Fill in:
   - **Recipient Company:** Company receiving documents
   - **Recipient Contact:** Contact person
   - **Project:** Select project
   - **Purpose:** Purpose of transmission
4. **Select Documents:** Add documents to transmittal
5. Review **transmittal preview** (uses configured template)
6. Click **Create Transmittal**

The transmittal will:
- Generate unique number (e.g., SHP-2026-0001)
- Create PDF cover sheet
- Log in audit trail

**View Transmittals:**

1. Navigate to **Transmittals**
2. See list of all transmittals
3. **Filter** by project, status, date range
4. **Click** to view details

**View Transmittal Details:**

1. Click any transmittal
2. See:
   - Transmittal number and metadata
   - List of documents included
   - Transmittal cover sheet (PDF)
   - Send history
3. **Download** transmittal package
4. **Send** via email (if configured)

#### 3. Workflows & Approvals

**Start Workflow:**

1. On document details page
2. Click **Start Workflow**
3. Select **workflow template**
4. Assign **reviewers** for each stage
5. Click **Start**

**Approve/Reject Document:**

1. Navigate to **Approvals**
2. See **Pending Approvals** assigned to you
3. Click document to review
4. View document and metadata
5. **Approve** or **Reject** with comments
6. Document advances to next stage or returns to submitter

**Force Unlock Workflow:**

For users with `FORCE_UNLOCK_WORKFLOW` permission:

1. Navigate to document in workflow
2. Click **Force Unlock**
3. Confirm action
4. Workflow is terminated and document unlocked

#### 4. Search

**Global Search (Cmd+K / Ctrl+K):**

1. Press **Cmd+K** (Mac) or **Ctrl+K** (Windows)
2. Type search query
3. Search looks in:
   - Document codes
   - Document titles
   - Document filenames
4. See **real-time results** (300ms debounce)
5. Click result to navigate

**Advanced Filters:**

On Documents page:

1. Use filter dropdowns:
   - **Status:** Current, Superseded, Archived
   - **Discipline:** Mechanical, Electrical, etc.
   - **Project:** Select specific project
2. Filters combine with search

#### 5. User Management

**Invite Users:**

1. Navigate to **Settings > Users**
2. Click **Invite User**
3. Enter email, name, role
4. Click **Send Invitation**

User receives email with:
- Company name
- Role and permissions
- Accept invitation link

**Manage User Roles:**

1. Navigate to **Settings > Users**
2. Click user
3. Click **Change Role**
4. Select new role
5. Confirm change

**Deactivate User:**

1. Navigate to **Settings > Users**
2. Click user
3. Click **Deactivate**
4. User loses access immediately
5. Sessions are invalidated

#### 6. Role Management

**Create Custom Role:**

1. Navigate to **Settings > Roles**
2. Click **Create Custom Role**
3. Enter:
   - **Role Name:** e.g., "Field Engineer"
   - **Description:** Role purpose
4. **Select Permissions:** Check boxes for 41 granular permissions
5. Click **Create**

**Edit Role Permissions:**

1. Navigate to **Settings > Roles**
2. Click custom role (system roles are immutable)
3. Click **Edit Permissions**
4. Check/uncheck permissions
5. Click **Save**

**Note:** Permission changes take effect immediately via Redis cache invalidation.

#### 7. Audit Log

**View Audit Log:**

1. Navigate to **Audit Log**
2. See chronological list of all actions:
   - User who performed action
   - Action type (DOCUMENT_UPLOADED, REVISION_CREATED, etc.)
   - Timestamp
   - IP address
   - Related entities (document ID, etc.)
3. **Filter** by:
   - User
   - Action type
   - Date range
   - Entity ID
4. **Search** by keyword

**Export Audit Vault:**

For users with `EXPORT_AUDIT_VAULT` permission:

1. Navigate to **Audit Log**
2. Click **Export**
3. Select:
   - Date range
   - Format (CSV or JSON)
4. Click **Generate Export**
5. Download exported file

**Note:** Audit log entries are **immutable** - they cannot be edited or deleted (enforced by database trigger).

#### 8. Settings & Configuration

**Document Control Settings:**

- **Recycle Bin Retention:** Days before permanent deletion
- **Bulk Operation Undo Window:** Minutes to undo
- **Naming Masks:** Define document code patterns

**Security Settings:**

- **SSO Configuration:** SAML/OIDC setup (Enterprise)
- **SCIM Provisioning:** User sync (Enterprise)
- **Service Accounts:** API keys for integrations
- **MFA Requirements:** Enforce multi-factor authentication

**Legal & Compliance:**

- **Legal Holds:** Place/lift holds on documents
- **Retention Policies:** Configure retention periods
- **Succession Planning:** Configure ownership transfer

**Billing:**

- View current plan
- Manage subscription
- View invoices
- Update payment method

#### 9. QR Code Verification

**Scan QR Code (Field Use):**

1. Open **any QR reader app** on smartphone
2. Scan QR code on printed document
3. Opens verification page (no login required)
4. See:
   - Document code and title
   - Current revision
   - Issue purpose (FOR_CONSTRUCTION, etc.)
   - Status (CURRENT, SUPERSEDED)
   - **Warning if SUPERSEDED** (red alert)

**Use Case:**
Field workers can verify they have the correct, current revision before construction/installation.

---

## Key Concepts & Terminology

### Multi-Tenancy
- Each **Company** is a separate tenant with isolated data
- Row-Level Security (RLS) enforces data isolation
- Users belong to one company
- Can't see data from other companies

### Authorization Model

**System Roles (Immutable):**
1. **PLATFORM_ADMIN** - DocuRoute staff only
2. **COMPANY_OWNER** - All permissions (39 permissions)
3. **COMPANY_ADMIN** - User/role management, documents (32 permissions)
4. **DOCUMENT_CONTROLLER** - Document lifecycle, workflows (14 permissions)
5. **AUDITOR** - Read-only audit access (3-4 permissions)
6. **BILLING_CONTACT** - Billing only (2 permissions)

**Custom Roles:**
- Created by companies with `MANAGE_CUSTOM_ROLES` permission
- Can have any subset of 41 permissions
- Examples: "Field Engineer", "Project Manager", "QA Inspector"

**41 Granular Permissions:**
- Document operations (UPLOAD_DOCUMENT, VIEW_DOCUMENT, etc.)
- Workflow (START_WORKFLOW, APPROVE_WORKFLOW, etc.)
- Transmittals (CREATE_TRANSMITTAL, SEND_TRANSMITTAL, etc.)
- Users & roles (INVITE_USERS, MANAGE_CUSTOM_ROLES, etc.)
- Legal & compliance (PLACE_LEGAL_HOLD, VIEW_AUDIT_LOG, etc.)
- Security (CONFIGURE_SSO, MANAGE_SCIM, etc.)
- Billing & ownership (MANAGE_BILLING, TRANSFER_OWNERSHIP, etc.)

### Document Lifecycle

**Statuses:**
- **CURRENT** - Active, latest approved revision
- **SUPERSEDED** - Replaced by newer revision
- **ARCHIVED** - Moved to archive, still retrievable
- **DELETED** - In recycle bin, recoverable within retention period
- **PURGED** - Permanently deleted
- **PENDING_METADATA** - Bulk imported, awaiting file upload

**Revisions:**
- Each document has multiple revisions (A, B, C, etc.)
- Only ONE revision can be CURRENT at a time
- Uploading new revision automatically supersedes previous
- Revision codes: A→B→C...→Z→AA→AB...→ZZ→AAA
- All revisions retained for audit trail

**Issue Purposes:**
- **FOR_CONSTRUCTION** - Approved for building/installation
- **FOR_APPROVAL** - Awaiting approval
- **FOR_INFORMATION** - Reference only
- **FOR_TENDER** - Bidding purposes
- **AS_BUILT** - Final as-constructed drawings

### Transmittals

A **transmittal** is a formal document exchange package containing:
- Cover sheet with transmittal number
- List of documents being transmitted
- Purpose and recipient information
- Metadata (date, sender, project, etc.)

**Transmittal Numbers:**
Format: `{PREFIX}-{YYYY}-{####}`
Example: `SHP-2026-0001`

**Configuration:**
- Number prefix (e.g., "SHP" for shipyard)
- Number padding (4 digits = 0001, 0002, etc.)
- Enabled columns (which document fields to show)
- Header fields (transmittal metadata)

### Workflows

**Workflow** = Multi-stage approval process for documents

**Stages:**
1. Document submitted
2. Reviewer 1 approves → advances to stage 2
3. Reviewer 2 approves → advances to stage 3
4. Final approver approves → document marked approved

**Rejection:**
If any reviewer rejects, document returns to submitter for corrections.

**Force Unlock:**
Users with `FORCE_UNLOCK_WORKFLOW` permission can terminate workflow and unlock document.

### Legal Holds

**Legal Hold** = Preservation requirement for legal/regulatory purposes

When placed:
- Document cannot be deleted
- Document cannot be archived
- All revisions preserved
- Audit log tracks hold placement and lifting

Use cases:
- Litigation
- Regulatory investigations
- Compliance audits

### Audit Trail

Every action in DocuRoute is logged to an **immutable audit vault**:
- User who performed action
- Action type (DOCUMENT_UPLOADED, USER_INVITED, etc.)
- Timestamp with millisecond precision
- IP address
- Related entity IDs
- Before/after values (for updates)

**Immutability:**
- Audit log entries cannot be edited
- Audit log entries cannot be deleted
- Enforced by PostgreSQL trigger
- Required for ISO 9001 compliance

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Error:** `Can't reach database server`

**Solutions:**
- Check `DATABASE_URL` is correct
- Verify database is running
- Check firewall rules (Supabase: allow connections)
- Test connection:
  ```bash
  psql "postgresql://user:pass@host:5432/db"
  ```

#### 2. Prisma Client Out of Sync

**Error:** `Prisma Client has not been generated`

**Solution:**
```bash
pnpm --filter @docuroute/db exec prisma generate
```

#### 3. Redis Connection Fails

**Error:** `Redis connection timeout`

**Solutions:**
- Check `REDIS_URL` format: `redis://default:password@host:6379`
- Verify Redis is accessible
- Test with redis-cli:
  ```bash
  redis-cli -u redis://default:password@host:6379 PING
  ```

#### 4. R2 Upload Fails

**Error:** `AccessDenied` or `NoSuchBucket`

**Solutions:**
- Verify R2 credentials in `.env.local`
- Check bucket name is correct
- Verify API token has **Object Read & Write** permissions
- Test with AWS CLI:
  ```bash
  aws s3 ls --endpoint-url https://<account_id>.r2.cloudflarestorage.com
  ```

#### 5. Email Not Sending

**Error:** Magic link not received

**Solutions:**
- Check spam folder
- Verify `RESEND_API_KEY` is valid
- Check sending domain is verified in Resend
- Check Resend dashboard for delivery logs
- Test API key:
  ```bash
  curl https://api.resend.com/emails \
    -H "Authorization: Bearer YOUR_KEY"
  ```

#### 6. Permission Denied Errors

**Error:** `User does not have permission`

**Solutions:**
- Check user's role has required permission
- Verify JWT is not stale (refresh by logging out/in)
- Check Redis cache is accessible
- Review audit log for permission changes

#### 7. Build Fails

**Error:** TypeScript errors during build

**Solutions:**
```bash
# Clean build artifacts
rm -rf apps/*/dist apps/*/.next node_modules/.cache

# Reinstall dependencies
pnpm install

# Generate Prisma client
pnpm --filter @docuroute/db exec prisma generate

# Rebuild
pnpm build
```

#### 8. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 pnpm dev
```

### Debug Mode

Enable verbose logging:

```bash
# In .env.local
DEBUG=docuroute:*
LOG_LEVEL=debug
```

### Getting Help

1. **Check logs:**
   - Web app: Console in browser + terminal
   - Worker: Check worker logs
   - Database: Check Supabase logs

2. **Review audit log:**
   - Navigate to Audit Log
   - Filter by action type and timeframe
   - Look for error events

3. **Check documentation:**
   - `/docs` directory in repository
   - `docs/DocuRouteP0P1.md` - Complete technical overview
   - `docs/Phase2Plan.md` - Future features

4. **Community:**
   - GitHub Issues: https://github.com/Fujiorange/DocuRoute/issues
   - Check existing issues for similar problems

---

## Next Steps

After completing setup:

1. **Invite team members:**
   - Create users with appropriate roles
   - Send invitation emails
   - Guide them through acceptance

2. **Create projects:**
   - Organize by vessel, facility, or contract
   - Assign documents to projects

3. **Configure settings:**
   - Document naming masks
   - Transmittal templates
   - Retention policies
   - Legal hold procedures

4. **Import existing documents:**
   - Use bulk import for document register
   - Upload files individually or in batches
   - Apply metadata and tags

5. **Set up workflows:**
   - Create workflow templates
   - Define approval stages
   - Assign default reviewers

6. **Train users:**
   - Document management procedures
   - QR code verification for field workers
   - Transmittal creation and sending
   - Audit log review

7. **Monitor system:**
   - Check audit log regularly
   - Review user activity
   - Monitor storage usage
   - Track workflow completion rates

---

## Production Deployment

For production deployment, consider:

1. **Use managed services:**
   - Supabase (database)
   - Upstash (Redis)
   - Cloudflare R2 (storage)
   - Resend (email)

2. **Deploy platforms:**
   - **Vercel** (web app) - See `vercel.json`
   - **Render** (worker + crons) - See `render.yaml`
   - Or self-host with Docker

3. **Security:**
   - Enable AWS KMS (set `LOCAL_KMS_MODE=false`)
   - Configure HTTPS
   - Set up proper firewall rules
   - Enable MFA for admin accounts
   - Rotate secrets regularly

4. **Monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Monitor database performance
   - Track API response times
   - Alert on queue backlogs

5. **Backups:**
   - Enable automated database backups
   - Backup R2 storage
   - Export audit logs regularly
   - Test restore procedures

6. **Compliance:**
   - Review ISO 9001 requirements
   - Configure retention policies
   - Set up legal hold procedures
   - Train document controllers

---

## Summary

DocuRoute is now ready to use! You have:

✅ Installed all dependencies
✅ Configured environment variables
✅ Set up database with migrations
✅ Connected external services
✅ Created first company and users
✅ Understood navigation and features

**Key URLs:**
- **Application:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health
- **Documents:** http://localhost:3000/documents
- **Transmittals:** http://localhost:3000/transmittals
- **Audit Log:** http://localhost:3000/audit-log

**Default Ports:**
- Web app: 3000
- Worker: N/A (background process)

For questions or issues, refer to the troubleshooting section or check the documentation in the `/docs` directory.

Happy document managing! 📄🚢
