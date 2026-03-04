import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  HardHat,
  FileStack,
  Users,
  ShieldCheck,
  Building2,
} from 'lucide-react'

/* ─── Static data ─────────────────────────────────────────────── */
const features = [
  {
    icon: FileStack,
    title: 'Centralised Documents',
    description:
      'Every drawing, report, and permit in one place. No more hunting through email threads or shared drives.',
  },
  {
    icon: Building2,
    title: 'Project Workspaces',
    description:
      'Group documents by project. Subcontractors only see what they need — nothing more.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description:
      'IT Admin, Project Admin, Engineer, Client — granular permissions keep sensitive data safe.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Isolated',
    description:
      'Each company\'s data is completely isolated. Compliant with Singapore\'s PDPA requirements.',
  },
]

const trustedBy = [
  'Tiong Seng Group',
  'Woh Hup',
  'Sembcorp Design',
  'Penta-Ocean',
  'Kori Construction',
]

/* ─── Construction site SVG illustration ─────────────────────── */
function ConstructionIllustration() {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg mx-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="bldg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="bldg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="craneGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>

      <rect width="480" height="400" fill="url(#sky)" rx="16" />

      {[80, 160, 240, 320, 400].map((x) => (
        <line key={`vg-${x}`} x1={x} y1="0" x2={x} y2="400" stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4" />
      ))}
      {[80, 160, 240, 320].map((y) => (
        <line key={`hg-${y}`} x1="0" y1={y} x2="480" y2={y} stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.4" />
      ))}

      <rect x="0" y="320" width="480" height="80" fill="#dbeafe" opacity="0.5" />
      <line x1="0" y1="320" x2="480" y2="320" stroke="#93c5fd" strokeWidth="1.5" />

      <rect x="180" y="100" width="100" height="220" fill="url(#bldg1)" rx="2" />
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`b1-${row}-${col}`} x={192 + col * 28} y={116 + row * 38} width={18} height={24} fill="#bfdbfe" opacity={0.7} rx="2" />
        ))
      )}

      <rect x="60" y="170" width="80" height="150" fill="url(#bldg2)" rx="2" />
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <rect key={`b2-${row}-${col}`} x={73 + col * 28} y={185 + row * 42} width={18} height={26} fill="#93c5fd" opacity={0.6} rx="2" />
        ))
      )}

      <rect x="320" y="150" width="90" height="170" fill="#1d4ed8" opacity="0.85" rx="2" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`b3-${row}-${col}`} x={332 + col * 24} y={164 + row * 48} width={16} height={30} fill="#bfdbfe" opacity={0.65} rx="2" />
        ))
      )}

      <rect x="268" y="40" width="8" height="260" fill="url(#craneGrad)" />
      <rect x="180" y="40" width="200" height="8" fill="url(#craneGrad)" />
      <rect x="180" y="36" width="40" height="16" fill="#be123c" rx="3" />
      <line x1="356" y1="48" x2="356" y2="90" stroke="#be123c" strokeWidth="2" />
      <path d="M350 90 Q356 100 362 90" stroke="#be123c" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      <g transform="translate(20, 60)">
        <rect width="110" height="72" fill="white" rx="10" filter="drop-shadow(0 4px 12px rgba(37,99,235,0.18))" />
        <rect x="12" y="14" width="60" height="8" fill="#dbeafe" rx="4" />
        <rect x="12" y="28" width="86" height="5" fill="#eff6ff" rx="3" />
        <rect x="12" y="38" width="70" height="5" fill="#eff6ff" rx="3" />
        <rect x="12" y="48" width="50" height="5" fill="#eff6ff" rx="3" />
        <rect x="12" y="58" width="30" height="8" fill="#2563eb" rx="4" />
      </g>

      <g transform="translate(340, 260)">
        <rect width="120" height="52" fill="white" rx="10" filter="drop-shadow(0 4px 12px rgba(37,99,235,0.15))" />
        <circle cx="22" cy="26" r="12" fill="#eff6ff" />
        <text x="22" y="31" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2563eb">47</text>
        <rect x="42" y="14" width="64" height="7" fill="#dbeafe" rx="3" />
        <rect x="42" y="26" width="48" height="6" fill="#eff6ff" rx="3" />
        <rect x="42" y="37" width="38" height="6" fill="#eff6ff" rx="3" />
      </g>
    </svg>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight text-blue-900">DocuRoute</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link href="/pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
            <Link href="#features" className="hover:text-stone-900 transition-colors">Features</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-stone-700 hover:text-stone-900">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge
              className="mb-6 gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-50"
            >
              🇸🇬 Built for Singapore Construction
            </Badge>

            <h1 className="font-bold tracking-tight leading-tight mb-6 text-stone-900" style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)' }}>
              Document Management{' '}
              <span className="text-blue-600">That Gets the Job Done</span>
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-lg text-stone-600">
              DocuRoute helps Singapore construction and engineering firms organise, share, and
              control project documents — from drawings to permits — all in one secure platform.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-shadow">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-6 text-base border-stone-300 text-stone-700 hover:bg-stone-100">
                  See Pricing
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex gap-8">
              {[
                { num: '200+', label: 'Projects managed' },
                { num: '50+', label: 'Companies onboard' },
                { num: '99.9%', label: 'Uptime SLA' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-blue-900">{s.num}</p>
                  <p className="text-xs mt-0.5 text-stone-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl opacity-40" style={{ background: 'radial-gradient(ellipse at center, #dbeafe 0%, transparent 70%)' }} />
            <ConstructionIllustration />
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y border-stone-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400 mb-8">
            Trusted by Singapore&apos;s Leading Construction Firms
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {trustedBy.map((name) => (
              <div
                key={name}
                className="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-xs font-semibold tracking-wide text-stone-600"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-stone-900">
              Everything Your Project Team Needs
            </h2>
            <p className="text-base leading-relaxed max-w-xl mx-auto text-stone-500">
              Designed around the real-world workflows of Singapore construction professionals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-stone-200 bg-white p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                  <f.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2 text-base text-stone-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-800">
        <div className="mx-auto max-w-3xl text-center text-white">
          <div className="flex justify-center gap-1 mb-6">
            <span className="h-1 w-8 rounded-full bg-rose-500" />
            <span className="h-1 w-8 rounded-full bg-white opacity-60" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to Streamline Your Site Docs?
          </h2>
          <p className="text-blue-100 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Join construction companies across Singapore already using DocuRoute to cut document
            chaos and keep every stakeholder in sync.
          </p>
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 text-base font-semibold bg-white text-blue-900 hover:bg-stone-100 shadow-lg">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-base tracking-tight text-blue-900">DocuRoute</span>
          </div>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} DocuRoute. Built for Singapore construction companies.
          </p>
          <div className="flex items-center gap-5 text-xs text-stone-500">
            {[
              { href: '/pricing', label: 'Pricing' },
              { href: '/login', label: 'Sign In' },
              { href: '/register', label: 'Register' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-stone-900 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
