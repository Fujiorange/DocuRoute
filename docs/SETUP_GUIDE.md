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

Now that environment variables are configured, let's set up the database structure. This involves enabling extensions, generating database client code, and running migrations to create tables.

---

### Step 1: Enable PostgreSQL Extensions

**What are extensions?** PostgreSQL extensions add extra features to the database. DocuRoute needs `pg_trgm` for fast fuzzy text searching (helps you search documents by partial matches).

#### If Using Supabase:

1. Log in to your Supabase dashboard
2. Select your project
3. Click **Database** in the left sidebar
4. Click **Extensions**
5. Search for `pg_trgm`
6. Click the toggle to **enable** it
7. Wait a few seconds for it to activate

💡 **Tip:** You should see a green checkmark when it's enabled.

#### If Using Self-Hosted PostgreSQL:

```bash
# Connect to your database
psql -U postgres -d your_database_name

# Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

# Verify it's installed
\dx pg_trgm

# Exit psql
\q
```

---

### Step 2: Generate Prisma Client

**What is Prisma?** Prisma is a database toolkit that DocuRoute uses. The Prisma Client is auto-generated TypeScript code that lets the app talk to the database safely.

**Why generate it?** The client code is based on your database schema and needs to be generated before you can run the app.

```bash
# Navigate to the project root (if not already there)
cd /path/to/DocuRoute

# Generate the Prisma client
pnpm --filter @docuroute/db exec prisma generate
```

**What's happening:**
1. pnpm targets the `@docuroute/db` package
2. Runs `prisma generate` inside that package
3. Reads the schema from `packages/db/prisma/schema.prisma`
4. Generates TypeScript code in `node_modules/@prisma/client`

**Expected output:**
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 123ms

You can now start using Prisma Client in your code:

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

⚠️ **If you get an error:** Make sure your `DATABASE_URL` in `.env.local` is correct and the database is accessible.

---

### Step 3: Run Database Migrations

**What are migrations?** Migration files contain SQL commands to create/modify database tables and relationships. Think of them as a recipe for building your database structure.

**Important:** This step creates ALL the tables, columns, indexes, and security policies that DocuRoute needs.

```bash
# Run all pending migrations
pnpm --filter @docuroute/db exec prisma migrate deploy
```

**What's happening:**
1. Prisma checks which migrations haven't been applied yet
2. Executes SQL commands in order (creating tables, indexes, etc.)
3. Records which migrations have been applied (in `_prisma_migrations` table)
4. Sets up Row-Level Security (RLS) policies for multi-tenancy

**Expected output:**
```
Applying migration `20260323_rls_multi_tenancy`
Applying migration `20260401_add_documentcode_title`
Applying migration `20260406_add_transmittal_config`
...

The following migrations have been applied:

migrations/
  └─ 20260323_rls_multi_tenancy/
      └─ migration.sql
  └─ 20260401_add_documentcode_title/
      └─ migration.sql
  ...

All migrations have been successfully applied.
```

💡 **This might take 30-60 seconds** as it creates dozens of tables and indexes.

⚠️ **Common Issues:**

- **"Can't reach database server"** → Check your `DIRECT_URL` is correct and uses port `5432`
- **"Database ... does not exist"** → Make sure you specified the correct database name in the connection string
- **"Permission denied"** → Your database user needs CREATE TABLE permissions

---

### Step 4: Verify Database Schema

Let's make sure all the tables were created successfully.

#### Using Supabase (Recommended):

1. Go to your Supabase dashboard
2. Click **Table Editor** in the left sidebar
3. You should see these tables:

| Table Name | Purpose |
|------------|---------|
| `Role` | System and custom roles (COMPANY_OWNER, DOCUMENT_CONTROLLER, etc.) |
| `Company` | Tenant companies (multi-tenancy) |
| `User` | User accounts and authentication |
| `UserCompany` | Links users to companies |
| `Project` | Projects within companies |
| `Document` | Document metadata (codes, titles, status) |
| `DocumentRevision` | Document revisions (A, B, C, etc.) |
| `Transmittal` | Document transmittals |
| `TransmittalDocument` | Documents included in transmittals |
| `AuditLog` | Immutable audit trail |
| `Notification` | User notifications |
| `CompanyOnboarding` | Onboarding progress |
| `CompanyTransmittalConfig` | Transmittal configuration per company |
| `ClassSocietySubmission` | Classification society submissions |
| ... and others |

#### Using psql (Command Line):

```bash
# Connect to database
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# List all tables
\dt

# Check a specific table structure
\d "Document"

# Count rows (should be 0 for now)
SELECT COUNT(*) FROM "Document";

# Exit
\q
```

**Expected result:** You should see 20-30 tables listed.

---

### Step 5: Verify Row-Level Security (Optional but Recommended)

DocuRoute uses Row-Level Security (RLS) to enforce multi-tenancy (data isolation between companies).

**Check if RLS is enabled:**

```bash
# Connect to database
psql "your-direct-url-here"

# Check RLS status on key tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('Document', 'User', 'Project', 'Company');

# You should see rowsecurity = true for all of them
```

**Expected output:**
```
 schemaname | tablename | rowsecurity
------------+-----------+-------------
 public     | Document  | t
 public     | User      | t
 public     | Project   | t
 public     | Company   | t
```

💡 **What this means:** Each company can only see their own data. This is enforced at the database level for security.

---

### ✅ **Checkpoint: Database Setup Complete**

Before continuing, verify:
- ✅ `pg_trgm` extension enabled
- ✅ Prisma client generated successfully
- ✅ All migrations applied without errors
- ✅ Tables visible in Supabase Table Editor (or via psql)
- ✅ At least 20 tables exist (Role, Company, User, Document, etc.)
- ✅ Row-Level Security enabled on main tables

**Test database connection:**
```bash
# Quick test (should connect without errors)
psql "your-DATABASE_URL-here" -c "SELECT 1;"

# Should output:
#  ?column?
# ----------
#         1
```

🎉 **Excellent!** Your database is ready. Let's run the application next!

---

## Running the Application

You're almost there! Now it's time to start DocuRoute and see it in action.

**What we'll run:**
1. **Web Application** - The main Next.js app (frontend + API)
2. **Worker** - Background processor for heavy tasks (PDF watermarking, emails, etc.)

You can run both together (easiest) or separately (for debugging).

---

### Development Mode

#### Option 1: Run Everything Together (Recommended for Beginners)

This is the easiest way to get started. One command runs both the web app and worker.

```bash
# Make sure you're in the project root
cd /path/to/DocuRoute

# Start everything
pnpm dev
```

**What's happening:**
- Turborepo starts all development servers in parallel
- Web app starts on http://localhost:3000
- Worker starts and connects to Redis for background jobs
- Package build watchers start (auto-rebuild when you change code)
- Hot reload is enabled (changes appear instantly in browser)

**Expected output:**
```
• Packages in scope: @docuroute/core, @docuroute/db, @docuroute/emails, @docuroute/types, web, worker
• Running dev in 6 packages
• Remote caching disabled

web:dev: > web@0.1.0 dev
web:dev: > next dev
web:dev:   ▲ Next.js 15.1.0
web:dev:   - Local:        http://localhost:3000
web:dev:   - Network:      http://192.168.1.x:3000

worker:dev: > worker@0.1.0 dev
worker:dev: > tsx watch src/index.ts
worker:dev: ✓ Worker started successfully
worker:dev: ✓ Connected to Redis
worker:dev: ✓ Listening for jobs...
```

💡 **Keep this terminal open!** This is your development server. You'll see logs here as you use the app.

**How to stop:** Press `Ctrl+C` in the terminal.

---

#### Option 2: Run Services Separately (For Debugging)

If you need to see logs from each service separately or debug one at a time:

**Terminal 1 - Web Application:**
```bash
# Navigate to web app
cd apps/web

# Start the web app
pnpm dev
```

**Expected output:**
```
> web@0.1.0 dev
> next dev

  ▲ Next.js 15.1.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.3s
```

**Terminal 2 - Worker (in a new terminal):**
```bash
# Navigate to worker
cd apps/worker

# Start the worker
pnpm dev
```

**Expected output:**
```
> worker@0.1.0 dev
> tsx watch src/index.ts

[INFO] Worker starting...
[INFO] Connected to Redis at redis://...
[INFO] Registered watermark worker
[INFO] Registered email worker
[INFO] Worker ready and listening for jobs
```

💡 **Why separate terminals?** Makes it easier to see which service is logging what message.

---

### Verify Everything is Running

#### 1. Check the Web App

Open your browser and go to: **http://localhost:3000**

You should see:
- ✅ DocuRoute landing/login page
- ✅ "Sign in with Email" button
- ✅ No error messages

⚠️ **If you see an error page:**
- Check the terminal for error messages
- Make sure `.env.local` files are configured correctly
- Verify database migrations ran successfully

---

#### 2. Check the API Health Endpoint

This endpoint confirms the app can connect to the database and Redis.

```bash
# In a new terminal, test the API
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-06T03:19:18.803Z",
  "database": "connected",
  "redis": "connected"
}
```

✅ **All "connected"?** Perfect! Everything is working.

⚠️ **If you see errors:**
- `database: "error"` → Check `DATABASE_URL` in `.env.local`
- `redis: "error"` → Check `REDIS_URL` in `.env.local`

---

#### 3. Check the Worker Logs

Look at the worker terminal. You should see:
- ✅ "Worker started successfully"
- ✅ "Connected to Redis"
- ✅ "Listening for jobs"
- ✅ No error messages

The worker is idle until there's a background job to process (like watermarking a PDF).

---

### First-Time Setup: Create Your Admin Account

Now that the app is running, let's create your platform admin account!

#### Step 1: Access the Application

1. Open your browser
2. Go to **http://localhost:3000**
3. You should see the sign-in page

---

#### Step 2: Sign In with Your Admin Email

1. Click **"Sign in with Email"**
2. Enter the email address you set as `PLATFORM_ADMIN_EMAIL` in your `.env.local`
3. Click **"Send Magic Link"**

**What happens:**
- DocuRoute sends a magic link email to your address
- No password needed! (passwordless authentication)
- The link expires after 1 hour

💡 **Magic link authentication** is more secure than passwords - no password to forget or steal!

---

#### Step 3: Check Your Email

1. Open your email inbox
2. Look for an email from **DocuRoute** (or from `onboarding@resend.dev` if using Resend's test domain)
3. Subject: "Sign in to DocuRoute"
4. Click the **"Sign in to DocuRoute"** button in the email

**Expected:**
- Opens a new browser tab
- Automatically logs you in
- Redirects to the dashboard

⚠️ **Didn't receive the email?**

Check these:
1. **Spam folder** - Magic link emails sometimes land here
2. **Resend dashboard** - Go to resend.com > Logs to see if email was sent
3. **Email address** - Make sure you used the exact email from `PLATFORM_ADMIN_EMAIL`
4. **Worker logs** - Check if worker is running (emails are sent via background jobs)
5. **Resend API key** - Verify it's valid in your `.env.local`

**Debug emails:**
```bash
# Check worker logs for email job
# Look for messages like:
# [INFO] Processing job: send-email
# [SUCCESS] Email sent to your-email@example.com
```

---

#### Step 4: Welcome to DocuRoute!

After clicking the magic link, you're logged in as the **Platform Admin** - the superuser with all permissions.

You should see:
- ✅ DocuRoute dashboard
- ✅ Your email in the top-right corner
- ✅ Sidebar with navigation menu
- ✅ "Settings" menu includes "Platform" option (only visible to platform admins)

🎉 **Congratulations!** You're now logged in and ready to set up your first company.

---

### Understanding Your Development Environment

Now that everything is running, here's what's happening behind the scenes:

#### Hot Reload / Fast Refresh

When you edit code files:
- **Frontend changes** (React components): Page updates instantly without losing state
- **Backend changes** (API routes): Server restarts automatically (~2 seconds)
- **CSS changes**: Styles update instantly

Try it:
1. Open `apps/web/src/app/page.tsx` in your editor
2. Change some text
3. Save the file
4. Watch your browser update instantly

#### Development vs Production

You're running in **development mode**, which includes:
- ✅ Detailed error messages with stack traces
- ✅ Hot reload for instant updates
- ✅ Unoptimized code (larger, easier to debug)
- ✅ Source maps (map compiled code back to source)
- ⚠️ Slower performance (not a problem for development)

For production, you'll build optimized code (covered later in deployment section).

---

### Common Issues & Quick Fixes

#### "Port 3000 is already in use"

**Problem:** Another process is using port 3000.

**Solution:**
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 pnpm dev
```

---

#### "Cannot find module '@prisma/client'"

**Problem:** Prisma client wasn't generated.

**Solution:**
```bash
pnpm --filter @docuroute/db exec prisma generate
```

---

#### "Database connection failed"

**Problem:** Can't connect to PostgreSQL.

**Solution:**
1. Check `DATABASE_URL` in `apps/web/.env.local`
2. Verify Supabase project is running
3. Test connection:
```bash
psql "your-DATABASE_URL-here" -c "SELECT 1;"
```

---

#### "Redis connection timeout"

**Problem:** Can't connect to Redis.

**Solution:**
1. Check `REDIS_URL` in `apps/web/.env.local` and `apps/worker/.env.local`
2. Verify Upstash Redis database is running
3. Make sure URL starts with `redis://` not `rediss://`
4. Test connection:
```bash
redis-cli -u "your-REDIS_URL-here" PING
# Should respond: PONG
```

---

#### Worker not processing jobs

**Problem:** Background jobs aren't running (emails not sending, PDFs not watermarking).

**Solution:**
1. Make sure worker is running (`pnpm dev` in `apps/worker`)
2. Check worker logs for errors
3. Verify `REDIS_URL` is the same in both web and worker `.env.local` files
4. Restart worker: `Ctrl+C` then `pnpm dev` again

---

### ✅ **Checkpoint: Application Running Successfully**

Before continuing, verify:
- ✅ Web app accessible at http://localhost:3000
- ✅ Health endpoint returns `{"status":"ok"}`
- ✅ Worker running and connected to Redis
- ✅ No errors in terminal logs
- ✅ Successfully signed in with magic link email
- ✅ Logged in as Platform Admin
- ✅ Dashboard visible

🚀 **Amazing work!** Your DocuRoute development environment is fully operational. Let's set up your first company and project next!

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
