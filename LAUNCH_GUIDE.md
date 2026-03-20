# DocuRoute Launch Guide for Beginners

Welcome! This guide will walk you through everything you need to launch DocuRoute both locally (on your computer) and live (on the internet using Render or Vercel).

## Table of Contents
1. [What is DocuRoute?](#what-is-docuroute)
2. [Prerequisites - What You Need Installed](#prerequisites---what-you-need-installed)
3. [Local Setup - Running on Your Computer](#local-setup---running-on-your-computer)
4. [Database Setup](#database-setup)
5. [Third-Party Services Setup](#third-party-services-setup)
6. [Live Deployment - Render](#live-deployment---render)
7. [Live Deployment - Vercel](#live-deployment---vercel)
8. [Post-Deployment Steps](#post-deployment-steps)
9. [Troubleshooting](#troubleshooting)

---

## What is DocuRoute?

DocuRoute is a document management system (SaaS) for regulated heavy industries. It helps companies manage documents with features like:
- User authentication with email magic links
- Role-based permissions
- Document upload with watermarking
- QR code verification
- Audit logging
- Search functionality

**Tech Stack:**
- **Frontend/Backend:** Next.js 15 (React framework)
- **Database:** PostgreSQL (via Supabase)
- **File Storage:** Cloudflare R2
- **Email:** Resend
- **Background Jobs:** BullMQ with Redis
- **Package Manager:** pnpm (monorepo with Turborepo)

---

## Prerequisites - What You Need Installed

Before you start, install these tools on your computer:

### 1. Node.js (v20 or higher)
- **Download:** https://nodejs.org/
- **Verify installation:** Open a terminal and run:
  ```bash
  node --version
  ```
  Should show `v20.x.x` or higher.

### 2. pnpm (Package Manager)
- **Install:** After installing Node.js, run:
  ```bash
  npm install -g pnpm@10.32.1
  ```
- **Verify installation:**
  ```bash
  pnpm --version
  ```
  Should show `10.32.1` or similar.

### 3. Git (Version Control)
- **Download:** https://git-scm.com/downloads
- **Verify installation:**
  ```bash
  git --version
  ```

### 4. Code Editor (Recommended)
- **VS Code:** https://code.visualstudio.com/
- Or any text editor you prefer (Sublime, Atom, etc.)

### 5. Terminal/Command Line
- **Windows:** Command Prompt, PowerShell, or Git Bash
- **Mac/Linux:** Built-in Terminal

---

## Local Setup - Running on Your Computer

### Step 1: Clone the Repository

Open your terminal and navigate to where you want to store the project:

```bash
# Clone the repository
git clone https://github.com/Fujiorange/DocuRoute.git

# Navigate into the folder
cd DocuRoute
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for all packages in the monorepo
pnpm install
```

This might take 2-5 minutes. You'll see lots of packages being downloaded.

### Step 3: Set Up Environment Variables

You need to create configuration files that tell DocuRoute how to connect to services.

#### For the Web Application:

```bash
# Copy the example file
cp apps/web/.env.example apps/web/.env.local
```

Now open `apps/web/.env.local` in your code editor and fill in the values (we'll get these in the next sections).

#### For the Worker Application:

```bash
# Copy the example file
cp apps/worker/.env.example apps/worker/.env.local
```

Open `apps/worker/.env.local` and fill in the values.

---

## Database Setup

DocuRoute uses PostgreSQL. We'll use **Supabase** (a free hosted PostgreSQL service).

### Step 1: Create a Supabase Account

1. Go to https://supabase.com/
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. Click "New Project"

### Step 2: Create a New Project

1. **Organization:** Create a new organization or use existing
2. **Project Name:** `docuroute` (or any name you like)
3. **Database Password:** Create a strong password and **SAVE IT SOMEWHERE SAFE**
4. **Region:** Choose the region closest to you
5. Click "Create new project"

Wait 2-3 minutes for the database to be provisioned.

### Step 3: Get Your Database Connection Strings

Once your project is ready:

1. In Supabase, click on **"Project Settings"** (gear icon in the sidebar)
2. Go to **"Database"** section
3. Scroll down to **"Connection string"**

You'll see two types of connections:

#### Connection Pooling URL (for DATABASE_URL):
- Select **"Connection pooling"**
- Select **"URI"** format
- Copy the string that looks like:
  ```
  postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```
- **Replace `[YOUR-PASSWORD]` with your actual database password**
- Paste this into `DATABASE_URL` in both `.env.local` files

#### Direct Connection URL (for DIRECT_URL):
- Select **"Session mode"**
- Select **"URI"** format
- Copy the string that looks like:
  ```
  postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
  ```
- **Replace `[YOUR-PASSWORD]` with your actual database password**
- Paste this into `DIRECT_URL` in both `.env.local` files

### Step 4: Run Database Migrations

Now we need to create all the tables in the database:

```bash
# From the project root directory
cd packages/db
npx prisma migrate deploy
```

You should see messages about migrations being applied successfully.

### Step 5: Execute Required SQL Commands

After migrations, you need to run some special SQL commands:

1. In Supabase, go to **"SQL Editor"** (in the sidebar)
2. Click **"New query"**
3. Copy and paste this entire block:

```sql
-- 1. Create GIN index for efficient permission queries
CREATE INDEX IF NOT EXISTS idx_role_permissions ON "Role" USING GIN (permissions);

-- 2. Create audit vault immutability trigger
CREATE OR REPLACE FUNCTION prevent_audit_vault_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditVaultEntry is INSERT ONLY. Tampering detected.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_vault_immutable
BEFORE UPDATE OR DELETE ON "AuditVaultEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_vault_mutation();

-- 3. Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

4. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. You should see "Success. No rows returned"

### Step 6: Verify Database Setup

Run this verification query in the SQL Editor:

```sql
-- Check that all required components exist
SELECT
  (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_role_permissions') as gin_index,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'audit_vault_immutable') as trigger_exists,
  (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm') as pg_trgm_exists;
```

You should see a result with `1` for each column.

---

## Third-Party Services Setup

DocuRoute requires several external services. Here's how to set each one up:

### 1. Cloudflare R2 (File Storage)

**Why:** Stores uploaded documents (like Amazon S3 but cheaper).

**Setup:**

1. Go to https://www.cloudflare.com/
2. Sign up for a free account
3. In the dashboard, go to **"R2 Object Storage"**
4. Click **"Create bucket"**
5. **Bucket name:** `docuroute-files` (or any unique name)
6. **Location:** Automatic
7. Click **"Create bucket"**

**Get Credentials:**

1. Go to **"R2" > "Manage R2 API Tokens"**
2. Click **"Create API token"**
3. **Token name:** `docuroute-access`
4. **Permissions:** Select "Object Read & Write"
5. **Bucket scope:** Select your bucket
6. Click **"Create API token"**
7. **IMPORTANT:** Copy these values immediately (you can't see them again):
   - **Access Key ID** → Put in `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → Put in `R2_SECRET_ACCESS_KEY`
8. Also note from the page:
   - **Account ID** → Put in `R2_ACCOUNT_ID`

**Get Bucket Public URL:**

1. Go back to your bucket
2. Click **"Settings"**
3. Under **"Public access"**, click **"Allow Access"**
4. Copy the **Public bucket URL** → Put in `R2_PUBLIC_URL`

**Set Bucket Name:**

- Put your bucket name in `R2_BUCKET_NAME`

### 2. AWS KMS (Encryption Keys)

**Why:** Encrypts sensitive data at rest.

**For Local Development (Simplified):**

In your `.env.local` files, set:
```
LOCAL_KMS_MODE=true
AWS_KMS_KEY_ARN=local-development
AWS_ACCESS_KEY_ID=not-needed-for-local
AWS_SECRET_ACCESS_KEY=not-needed-for-local
AWS_REGION=us-east-1
```

**For Production (Real AWS KMS):**

1. Go to https://aws.amazon.com/
2. Sign up for AWS account (requires credit card but has free tier)
3. In AWS Console, go to **"KMS"** (Key Management Service)
4. Click **"Create key"**
5. **Key type:** Symmetric
6. **Key usage:** Encrypt and decrypt
7. Click **"Next"**
8. **Alias:** `docuroute-encryption-key`
9. Follow prompts and create key
10. Copy the **Key ARN** → Put in `AWS_KMS_KEY_ARN`

**Get AWS Credentials:**

1. In AWS Console, go to **"IAM"** (Identity and Access Management)
2. Go to **"Users"** > **"Add users"**
3. **User name:** `docuroute-app`
4. **Access type:** Programmatic access
5. **Permissions:** Attach "AWSKeyManagementServicePowerUser" policy
6. Click through and **Create user**
7. Copy:
   - **Access key ID** → Put in `AWS_ACCESS_KEY_ID`
   - **Secret access key** → Put in `AWS_SECRET_ACCESS_KEY`
8. Set your region → `AWS_REGION` (e.g., `us-east-1`)

**IMPORTANT:** For production, set `LOCAL_KMS_MODE=false`

### 3. Resend (Email Service)

**Why:** Sends magic link emails for authentication.

**Setup:**

1. Go to https://resend.com/
2. Sign up for a free account (100 emails/day free)
3. In dashboard, click **"API Keys"**
4. Click **"Create API Key"**
5. **Name:** `docuroute`
6. **Permission:** Full Access
7. Click **"Add"**
8. Copy the API key → Put in `RESEND_API_KEY`

**Configure Sending Domain:**

1. Go to **"Domains"** in Resend
2. Click **"Add Domain"**
3. Add your domain (e.g., `yourdomain.com`) or use their test domain for dev
4. For development, you can use: `onboarding@resend.dev`
5. Put the sender email in `RESEND_FROM_EMAIL` (e.g., `noreply@yourdomain.com`)

### 4. Upstash Redis (Rate Limiting)

**Why:** Prevents abuse by limiting request rates.

**Setup:**

1. Go to https://upstash.com/
2. Sign up for free account
3. Click **"Create Database"**
4. **Name:** `docuroute-rate-limit`
5. **Type:** Regional
6. **Region:** Choose closest to you
7. Click **"Create"**

**Get Credentials:**

1. Click on your new database
2. Scroll to **"REST API"** section
3. Copy:
   - **UPSTASH_REDIS_REST_URL** → Put in `UPSTASH_REDIS_REST_URL`
   - **UPSTASH_REDIS_REST_TOKEN** → Put in `UPSTASH_REDIS_REST_TOKEN`

### 5. Redis (BullMQ for Background Jobs)

**For Local Development:**

**Option A - Use Upstash (easiest):**
- Use the same Redis instance from step 4
- Convert REST URL to standard Redis URL format:
  ```
  redis://default:[YOUR-TOKEN]@[HOST]:[PORT]
  ```
- Put in `REDIS_URL`

**Option B - Install Redis Locally:**

**Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL (Windows Subsystem for Linux)

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

Then set: `REDIS_URL=redis://localhost:6379`

**For Production:**
- Use Upstash (recommended) or Redis Cloud
- Put the Redis URL in `REDIS_URL`

### 6. VirusTotal (File Scanning)

**Why:** Scans uploaded files for malware.

**Setup:**

1. Go to https://www.virustotal.com/
2. Sign up for a free account
3. Go to your profile and click **"API Key"**
4. Copy the API key → Put in `VIRUSTOTAL_API_KEY`

**Note:** Free tier has rate limits. For production, consider upgrading.

### 7. Stripe (Payments) - Optional for Development

**Why:** Handles billing and subscriptions.

**Setup:**

1. Go to https://stripe.com/
2. Sign up for account
3. After signup, you're in **"Test mode"** automatically (good for development)
4. Click **"Developers"** in the top menu
5. Go to **"API Keys"**
6. Copy:
   - **Publishable key** → Put in both `STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → Put in `STRIPE_SECRET_KEY`

**Webhook Setup:**

1. In Stripe, go to **"Developers" > "Webhooks"**
2. Click **"Add endpoint"**
3. **Endpoint URL:** Will be `https://yourdomain.com/api/webhooks/stripe` (set later)
4. **Events to listen to:** Select all payment-related events
5. Copy **Signing secret** → Put in `STRIPE_WEBHOOK_SECRET`

For local development, you can skip webhooks initially.

### 8. NextAuth Configuration

**Setup:**

1. Generate a secret key:
   ```bash
   openssl rand -base64 32
   ```
   Or use: https://generate-secret.vercel.app/32

2. Copy the output → Put in `NEXTAUTH_SECRET`
3. Set `NEXTAUTH_URL`:
   - **Local:** `http://localhost:3000`
   - **Production:** `https://yourdomain.com`

### 9. Application Configuration

**Set these values:**

```bash
# Public app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Local
# or https://yourdomain.com                  # Production

# App version
NEXT_PUBLIC_VERSION=0.1.0

# Platform admin email (your email)
PLATFORM_ADMIN_EMAIL=your.email@example.com

# Cron secret (generate random string)
CRON_SECRET=your-random-secret-here

# QR verification URL (same as app URL)
QR_VERIFICATION_BASE_URL=http://localhost:3000  # Local
# or https://yourdomain.com                      # Production
```

---

## Running Locally

Once all environment variables are set:

### Step 1: Start the Development Server

```bash
# From the project root
pnpm dev
```

This starts:
- **Web app** on http://localhost:3000
- **Worker** for background jobs

### Step 2: Open in Browser

1. Open your browser
2. Go to http://localhost:3000
3. You should see the DocuRoute homepage!

### Step 3: Create Your First Account

1. Click "Sign In" or "Get Started"
2. Enter your email
3. Check your email for the magic link
4. Click the link to log in

**Troubleshooting:** If you don't receive an email, check:
- `RESEND_API_KEY` is correct
- `RESEND_FROM_EMAIL` is valid
- Check spam folder
- Check Resend dashboard for error logs

---

## Live Deployment - Render

Render is great for deploying both the web app and background workers.

### Prerequisites

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Create a Render account at https://render.com/

### Step 1: Create Environment Variable Group

To avoid repeating environment variables, create a group:

1. In Render dashboard, go to **"Environment Groups"**
2. Click **"New Environment Group"**
3. **Name:** `docuroute-env`
4. Add all your environment variables (copy from your `.env.local` files)
5. **Important changes for production:**
   - `NEXTAUTH_URL` → Your production domain (e.g., `https://docuroute.onrender.com`)
   - `NEXT_PUBLIC_APP_URL` → Same as above
   - `QR_VERIFICATION_BASE_URL` → Same as above
   - `LOCAL_KMS_MODE` → `false` (use real AWS KMS)
6. Click **"Save"**

### Step 2: Deploy Web Application

1. Click **"New +"** > **"Web Service"**
2. Connect your GitHub repository
3. **Name:** `docuroute-web`
4. **Environment:** Node
5. **Build Command:**
   ```
   pnpm install && pnpm --filter @docuroute/web build
   ```
6. **Start Command:**
   ```
   pnpm --filter @docuroute/web start
   ```
7. **Plan:** Free or paid (Free has limitations)
8. **Environment Variables:** Link to your environment group
9. Click **"Create Web Service"**

Wait 5-10 minutes for deployment.

### Step 3: Deploy Worker Service

The `render.yaml` file in the repo automates this, but here's the manual way:

1. Click **"New +"** > **"Background Worker"**
2. Connect your GitHub repository
3. **Name:** `docuroute-worker`
4. **Environment:** Node
5. **Build Command:**
   ```
   pnpm install && pnpm --filter @docuroute/worker build
   ```
6. **Start Command:**
   ```
   pnpm --filter @docuroute/worker start
   ```
7. **Plan:** Standard (2GB RAM minimum - required for PDF processing)
8. **Environment Variables:** Link to your environment group
9. **Advanced:** Add environment variable:
   ```
   NODE_OPTIONS=--max-old-space-size=1536
   ```
10. Click **"Create Background Worker"**

### Step 4: Deploy Using render.yaml (Alternative)

**Easier Method:**

1. In Render dashboard, click **"New +"** > **"Blueprint"**
2. Connect your GitHub repository
3. Select `render.yaml` from your repo
4. Render will automatically create:
   - Worker service
   - 2 Cron jobs (retention and vault integrity)
5. Link your environment group to all services
6. Click **"Apply"**

### Step 5: Set Up Custom Domain (Optional)

1. In your web service settings, go to **"Settings"** > **"Custom Domain"**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow the DNS configuration instructions
5. Update `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `QR_VERIFICATION_BASE_URL` to use your custom domain

### Step 6: Verify Deployment

1. Visit your Render URL (e.g., `https://docuroute-web.onrender.com`)
2. Try signing in
3. Check logs in Render dashboard if issues occur

---

## Live Deployment - Vercel

Vercel is optimized for Next.js but doesn't natively support background workers.

### Step 1: Deploy to Vercel

1. Go to https://vercel.com/ and sign up
2. Click **"Add New..."** > **"Project"**
3. Import your GitHub repository
4. **Framework:** Next.js (auto-detected)
5. **Root Directory:** `apps/web`
6. **Build Command:** Leave as default
7. **Output Directory:** Leave as default

### Step 2: Configure Environment Variables

1. In project settings, go to **"Environment Variables"**
2. Add all your environment variables (from `.env.local`)
3. **Important changes:**
   - `NEXTAUTH_URL` → Your Vercel domain (e.g., `https://docuroute.vercel.app`)
   - `NEXT_PUBLIC_APP_URL` → Same as above
   - `QR_VERIFICATION_BASE_URL` → Same as above
   - `LOCAL_KMS_MODE` → `false`

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Visit your Vercel URL

### Step 4: Deploy Worker (Use Render)

Since Vercel doesn't support background workers:

1. Follow the **Render Worker deployment** steps above
2. Deploy only the worker to Render
3. Ensure both services share the same:
   - `DATABASE_URL`
   - `REDIS_URL`
   - Other shared environment variables

### Step 5: Configure Cron Jobs

Vercel supports cron jobs through the `vercel.json` file (already configured in the repo):

- These will hit API endpoints on your Vercel deployment
- Make sure `CRON_SECRET` is set correctly

### Step 6: Custom Domain

1. In Vercel project settings, go to **"Domains"**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update environment variables with new domain

---

## Post-Deployment Steps

After deploying to either platform:

### 1. Run Database Migrations

If you created a fresh database for production:

```bash
# SSH into Render or use Vercel CLI
cd packages/db
npx prisma migrate deploy
```

### 2. Execute SQL Commands

Run the same SQL commands from the Database Setup section in your production Supabase database.

### 3. Create Platform Admin

1. Sign up using your `PLATFORM_ADMIN_EMAIL`
2. Your account will automatically have admin privileges

### 4. Verify All Features

Test checklist:
- [ ] User signup/login works
- [ ] Email magic links arrive
- [ ] File upload works
- [ ] Watermarking completes (check worker logs)
- [ ] QR code verification works
- [ ] Search functionality works
- [ ] Role management works

### 5. Monitor Logs

**Render:**
- Click on each service → "Logs" tab
- Watch for errors

**Vercel:**
- Go to deployment → "Functions" tab
- Check function logs

### 6. Set Up Monitoring (Recommended)

Consider using:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Uptime Robot** for uptime monitoring

---

## Environment Variables Quick Reference

Here's a complete list of all environment variables you need:

### Database
```bash
DATABASE_URL=                      # Supabase connection pooling URL
DIRECT_URL=                        # Supabase direct connection URL
```

### Authentication
```bash
NEXTAUTH_SECRET=                   # Random 32-character string
NEXTAUTH_URL=                      # http://localhost:3000 or https://yourdomain.com
```

### File Storage (Cloudflare R2)
```bash
R2_ACCOUNT_ID=                     # From Cloudflare R2
R2_ACCESS_KEY_ID=                  # From R2 API token
R2_SECRET_ACCESS_KEY=              # From R2 API token
R2_BUCKET_NAME=                    # Your bucket name
R2_PUBLIC_URL=                     # Public bucket URL
```

### Encryption (AWS KMS)
```bash
AWS_KMS_KEY_ARN=                   # From AWS KMS or "local-development"
AWS_ACCESS_KEY_ID=                 # AWS IAM credentials
AWS_SECRET_ACCESS_KEY=             # AWS IAM credentials
AWS_REGION=                        # e.g., us-east-1
LOCAL_KMS_MODE=                    # true for local, false for production
```

### Email (Resend)
```bash
RESEND_API_KEY=                    # From Resend
RESEND_FROM_EMAIL=                 # Verified sender email
```

### Rate Limiting (Upstash Redis)
```bash
UPSTASH_REDIS_REST_URL=            # From Upstash
UPSTASH_REDIS_REST_TOKEN=          # From Upstash
```

### Background Jobs (Redis)
```bash
REDIS_URL=                         # Redis connection string
```

### Payments (Stripe)
```bash
STRIPE_SECRET_KEY=                 # From Stripe
STRIPE_PUBLISHABLE_KEY=            # From Stripe
STRIPE_WEBHOOK_SECRET=             # From Stripe webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Same as STRIPE_PUBLISHABLE_KEY
```

### Security
```bash
VIRUSTOTAL_API_KEY=                # From VirusTotal
CRON_SECRET=                       # Random string for cron authentication
```

### Application
```bash
NEXT_PUBLIC_APP_URL=               # Your app URL
NEXT_PUBLIC_VERSION=0.1.0          # App version
PLATFORM_ADMIN_EMAIL=              # Your admin email
QR_VERIFICATION_BASE_URL=          # Same as NEXT_PUBLIC_APP_URL
```

### Optional (Pilot/Testing)
```bash
PILOT_OWNER_EMAIL=                 # Email for pilot test account
PILOT_PROJECT_NAME=                # Name for pilot project
PILOT_NAMING_MASK=                 # Document naming convention
```

---

## Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

#### "Database connection failed"
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check password is correct (no special URL encoding needed)
- Ensure Supabase project is running
- Check your IP isn't blocked (Supabase allows all by default)

#### "Redis connection failed"
- Verify `REDIS_URL` format is correct
- For Upstash, ensure you're using the Redis URL (not REST URL)
- Check if Redis service is running (local) or accessible (cloud)

#### Magic link emails not arriving
- Check `RESEND_API_KEY` is correct
- Verify `RESEND_FROM_EMAIL` is verified in Resend
- Check spam folder
- Look at Resend dashboard logs for errors
- Ensure `NEXTAUTH_URL` is correct

#### File upload fails
- Verify R2 credentials are correct
- Check bucket permissions (public access enabled)
- Ensure bucket name matches exactly
- Check R2_PUBLIC_URL is correct

#### Worker not processing jobs
- Check worker logs in Render/server
- Verify `REDIS_URL` is the same in web and worker
- Ensure worker has enough memory (2GB for Render)
- Check BullMQ dashboard (if configured)

#### Build fails on Render/Vercel
- Check Node.js version (should be 20+)
- Verify all dependencies are in `package.json`
- Look for TypeScript errors
- Check build logs for specific errors

#### Prisma errors after deployment
```bash
# Regenerate Prisma client
cd packages/db
npx prisma generate
```

### Getting Help

If you're stuck:

1. **Check logs:**
   - Render: Service → Logs
   - Vercel: Deployment → Functions → Logs
   - Local: Terminal output

2. **Verify environment variables:**
   - Double-check spelling and format
   - Ensure no trailing spaces
   - Check special characters are properly escaped

3. **Database inspection:**
   - Use Supabase Table Editor to see if data is being created
   - Check SQL Editor to run queries manually

4. **GitHub Issues:**
   - Check existing issues: https://github.com/Fujiorange/DocuRoute/issues
   - Create a new issue with:
     - Error message
     - Steps to reproduce
     - Environment (local/Render/Vercel)

5. **Documentation:**
   - Check `docs/` folder for additional guides
   - Review `DEPLOYMENT_CHECKLIST.md`
   - Read `DEPLOYMENT_PERFORMANCE_CHECKLIST.md`

---

## Summary Checklist

Before launching, make sure you have:

### Prerequisites
- [ ] Node.js v20+ installed
- [ ] pnpm 10.32.1 installed
- [ ] Git installed
- [ ] Code editor ready

### Local Setup
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env.local` files created and filled

### Database
- [ ] Supabase account created
- [ ] Database project created
- [ ] Connection strings added to env files
- [ ] Migrations run (`prisma migrate deploy`)
- [ ] SQL commands executed (GIN index, trigger, pg_trgm)
- [ ] Verification queries passed

### Services
- [ ] Cloudflare R2 bucket created and configured
- [ ] AWS KMS set up (or LOCAL_KMS_MODE=true for dev)
- [ ] Resend account and API key obtained
- [ ] Upstash Redis created for rate limiting
- [ ] Redis set up for BullMQ
- [ ] VirusTotal API key obtained
- [ ] Stripe configured (optional for dev)
- [ ] NextAuth secret generated

### Deployment (Choose One or Both)
- [ ] Render: Web service deployed
- [ ] Render: Worker service deployed
- [ ] Render: Cron jobs configured
- [ ] Vercel: Web app deployed
- [ ] Vercel: Cron jobs configured
- [ ] Custom domain configured (optional)

### Post-Deployment
- [ ] Production database migrated
- [ ] Production SQL commands executed
- [ ] Platform admin account created
- [ ] All features tested
- [ ] Logs monitored for errors

---

## Next Steps

After launching:

1. **Security Hardening:**
   - Review `docs/SECURITY_MANUAL_CHECKLIST.md`
   - Set up MFA for admin accounts
   - Configure security settings in company settings

2. **Performance Optimization:**
   - Review `docs/DEPLOYMENT_PERFORMANCE_CHECKLIST.md`
   - Set up caching strategies
   - Monitor database query performance

3. **User Onboarding:**
   - Create company accounts
   - Set up roles and permissions
   - Import initial documents

4. **Monitoring:**
   - Set up error tracking (Sentry)
   - Configure uptime monitoring
   - Set up alerts for critical failures

5. **Backup Strategy:**
   - Configure Supabase automatic backups
   - Set up R2 bucket versioning
   - Document restore procedures

---

## Additional Resources

- **Main README:** `/README.md`
- **Deployment Checklist:** `/docs/DEPLOYMENT_CHECKLIST.md`
- **Performance Guide:** `/docs/DEPLOYMENT_PERFORMANCE_CHECKLIST.md`
- **Architecture Docs:** `/docs/SYSTEM_ARCHITECTURE.md`
- **API Documentation:** Check `/apps/web/src/app/api/` for endpoint code

---

**Congratulations!** You now have DocuRoute running. If you followed all steps, you should have a fully functional document management system. Welcome to the DocuRoute community! 🎉
