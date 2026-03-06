# DocuRoute Roadmap

## Phase 1 — Foundation (Current: March 2026)
Goal: Solid, trustworthy codebase that can attract early customers for a pilot

### ✅ Done
- Multi-tenant SaaS architecture (companyId isolation)
- PostgreSQL + Prisma schema (10 models)
- AWS S3 document storage with AES-256-GCM encryption
- JWT authentication (httpOnly cookies)
- RBAC (4 roles, 22 permissions)
- 2FA (TOTP via Speakeasy + QR code)
- Approval workflow (draft → pending → approved → rejected)
- Threaded commenting on documents
- Document versioning (schema + API)
- Full-text search (PostgreSQL ILIKE)
- Folder hierarchy (project-based)
- Audit logging (all mutations via Prisma middleware)
- Email system (Resend: invites, password reset, notifications)
- PDPA data export (JSON/CSV) + account deletion
- Analytics dashboard (storage usage, activity, contributors)
- Rate limiting (Upstash Redis + in-memory fallback)
- Security headers (CSP, HSTS, X-Frame-Options)
- Unit tests for core security modules
- GitHub Actions CI
- Zod input validation on all API routes
- Tenant isolation guards on all resource endpoints
- Prisma migrations (formal migration history)
- Honest documentation (SECURITY.md, ROADMAP.md)

### 🔄 In Progress
- Applying validation and tenant guards to remaining API routes
- Expanding test coverage to 80%+

## Phase 2 — Pilot-Ready (Target: Q2 2026)
Goal: First paying customer pilot (1–3 construction firms, $99–$299/mo)

- Live Vercel deployment with custom domain
- Onboarding flow (guided setup wizard for new companies)
- 2FA enforcement for admin roles
- Real-time notifications (SSE or Pusher)
- Bulk document upload (multiple files, progress indicator)
- PDF preview in-browser (no download required for review)
- Document watermarking for Client-role downloads
- E2E Playwright test suite
- Load testing (50 concurrent uploads, 10k document libraries)
- Privacy Policy + Terms of Service published
- PDPA Data Protection Officer contact page
- Support email / helpdesk

## Phase 3 — Scale (Target: Q3–Q4 2026)
Goal: 10+ paying companies, investor-ready metrics

- Mobile-responsive (tablet-first for site supervisors)
- BIM/IFC file preview
- WhatsApp notifications (popular in Singapore AEC)
- API for integration with AutoCAD, Revit, Aconex
- Custom approval workflows (parallel reviews, multi-approver)
- Multi-project dashboard / cross-project search
- SOC 2 Type I preparation
- 3rd-party penetration test
- Singapore MAS / BCA compliance documentation

## Future Considerations (Phase 4+)
- Zero-knowledge encryption (client-side key derivation)
- Mobile app (iOS/Android)
- Offline mode for field workers
- Advanced analytics (document heat maps, collaboration metrics)
- AI-powered document classification and tagging
- Integration with Singapore government systems (CorpPass, MyInfo)
