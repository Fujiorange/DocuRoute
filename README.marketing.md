# DocuRoute
### The Document Management Platform Built for Singapore's Construction Industry

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-green)](SECURITY.md)
[![PDPA Compliant](https://img.shields.io/badge/PDPA-Compliant-blue)](https://www.pdpc.gov.sg/)

---

> 📸 **[Add screenshot here: Landing Page Hero]**
> Suggested: A screenshot of the DocuRoute landing page showing the hero section with the app mockup illustration

> 📸 **[Add screenshot here: Dashboard Overview]**
> Suggested: A screenshot showing the main dashboard with document stats, recent projects, recent documents, and the sidebar navigation

---

## ✨ Why DocuRoute?

Construction teams in Singapore waste hours every week hunting for the right document. Drawings get lost in WhatsApp groups. The "latest revision" of a tender document is buried somewhere in a shared drive. Project managers spend their mornings chasing document approvals via email.

**DocuRoute fixes this.**

One secure, searchable workspace for all your project documents — with approvals, version control, team collaboration, and enterprise-grade security built in from day one.

---

## 🎯 Built For

- **General Contractors** managing complex multi-phase projects
- **Engineering Consultancies** (M&E, civil, structural, architectural)
- **Project Management Offices** coordinating across multiple contractors
- **Client / Developer Organisations** needing read-only access to project documents
- **Sub-contractors** collaborating on shared tender packages

---

## 🚀 Features at a Glance

| Feature | Description |
|---------|-------------|
| 📁 **Document Management** | Upload, organise, search, and version control any file type |
| 🔄 **Approval Workflows** | Draft → Pending → Approved/Rejected with full audit trail |
| 👥 **Team Collaboration** | Role-based access (IT Admin, Project Admin, Engineer, Client) |
| 🔐 **AES-256-GCM Encryption** | Every file encrypted before storage |
| 📋 **Immutable Audit Logs** | Every action recorded with timestamp and user |
| 🔍 **Full-Text Search** | Find documents by title, description, filename, tags |
| 💬 **Threaded Comments** | Collaborate on specific documents |
| 📊 **Analytics Dashboard** | Storage usage, document status breakdown, activity feed |
| 🔑 **Two-Factor Auth** | TOTP with QR code setup and backup codes |
| 🏢 **Multi-Tenant** | Complete company isolation — your data stays yours |

---

## 📊 How It Works

**3 steps to organised document management:**

1. **Register** → Create your company workspace. Takes 2 minutes.
2. **Upload** → Drag and drop your project documents. They're encrypted and searchable instantly.
3. **Collaborate** → Invite your team, assign roles, review and approve documents together.

---

## 🔐 Enterprise-Grade Security

DocuRoute is built with security as a first principle, not an afterthought:

- **AES-256-GCM encryption** — Every file encrypted with a unique key and IV before leaving your browser
- **PDPA compliant** — Data stored on AWS Singapore (ap-southeast-1). Full data export and deletion support
- **JWT httpOnly cookies** — Tokens stored in httpOnly cookies, not localStorage
- **Rate limiting** — Brute-force protection on all auth endpoints
- **Immutable audit logs** — Every action logged with user, timestamp, and context
- **2FA** — TOTP two-factor authentication with backup codes

See [SECURITY.md](SECURITY.md) for the full security documentation.

---

## 💰 Pricing

| Plan | Price | Users | Storage |
|------|-------|-------|---------|
| **Starter** | Free | 5 | 10 GB |
| **Professional** | $99/mo | 25 | 100 GB |
| **Enterprise** | Contact us | Unlimited | Unlimited |

[View full pricing →](https://docuroute.com/pricing)

---

## 🏗️ Tech Stack

![Next.js](https://img.shields.io/badge/Next.js_15-App_Router-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-teal?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![AWS S3](https://img.shields.io/badge/AWS_S3-Storage-orange?logo=amazon-aws)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwind-css)

**Full stack:** Next.js 15 (App Router) · TypeScript · Prisma v7 · PostgreSQL (Neon) · AWS S3 · Resend (email) · shadcn/ui · Zustand · Vitest

---

## 🌐 Live Demo

> 🔗 **[Add live demo URL here]**
> Deploy to Vercel and update this link

**Demo credentials (read-only):**
> 📝 **[Add demo credentials here after deploying]**

> 🎥 **[Add demo video here]**
> Suggested: A 60-90 second Loom or YouTube video showing: login → upload document → set approval → team collaboration
> Embed using: `[![Demo Video](thumbnail-url)](video-url)`

---

## 🖼️ Screenshots

> 📸 **[Add screenshot here: Document Detail Page]**
> Suggested: A screenshot showing the document detail page with tabs (Details, Versions, Comments, Audit Log), the file type icon, status badge, and action buttons

> 📸 **[Add screenshot here: Team Management]**
> Suggested: A screenshot of the team management page showing team members table with roles, status badges, and the Invite Member dialog

> 📸 **[Add screenshot here: Analytics Dashboard]**
> Suggested: A screenshot of the analytics page showing the storage usage bar, document status breakdown, and activity feed

> 📸 **[Add screenshot here: Onboarding Wizard]**
> Suggested: A screenshot of the onboarding flow showing the step-by-step wizard with progress indicator

---

## 🚀 Getting Started (Developers)

See the full [Developer Guide (README.md)](README.md) for complete setup instructions.

**Quick start:**
```bash
git clone https://github.com/your-org/docuroute
cd docuroute
npm install
cp .env.example .env
# Fill in your .env values
npx prisma migrate dev
npm run dev
```

---

## 📞 Get In Touch

- **Sales:** sales@docuroute.com
- **Support:** support@docuroute.com
- **LinkedIn:** [DocuRoute on LinkedIn](https://linkedin.com)
- **GitHub:** [github.com/Fujiorange/DocuRoute](https://github.com/Fujiorange/DocuRoute)

---

## 📄 License

MIT — Free for commercial use. See [LICENSE](LICENSE) for details.

---

*Built with ❤️ for Singapore 🇸🇬*
