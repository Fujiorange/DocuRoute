import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  Users,
  Zap,
  CheckCircle,
  Building2,
  Lock,
  BarChart2,
  ArrowRight,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-neutral-900 text-lg">DocuRoute</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-neutral-600">
              <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
              <Link href="/pricing" className="hover:text-neutral-900 transition-colors">Pricing</Link>
              <a href="#security" className="hover:text-neutral-900 transition-colors">Security</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="mb-4 bg-primary-50 text-primary-500 border-primary-100 hover:bg-primary-50">
                  Built for Singapore Construction 🇸🇬
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-tight">
                  Document Management{" "}
                  <span className="text-primary-500">That Actually Works.</span>
                </h1>
              </div>
              <p className="text-xl text-neutral-700 leading-relaxed max-w-lg">
                DocuRoute helps construction and engineering companies organize, share, and manage project documents with ease. From tender drawings to as-builts — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-primary-500 hover:bg-primary-600 text-white px-8 w-full sm:w-auto">
                    Start Free Trial →
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-neutral-200">
                    View Pricing
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-700">
                {["No credit card required", "Free 14-day trial", "Cancel anytime"].map((text) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration — animated app mockup */}
            <div className="hidden lg:block">
              <div className="relative w-full max-w-lg mx-auto">
                {/* Main card */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
                  {/* Mockup header */}
                  <div className="bg-neutral-900 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-neutral-800 rounded-md h-5 mx-4 flex items-center px-2">
                      <span className="text-xs text-neutral-400">app.docuroute.com/dashboard</span>
                    </div>
                  </div>
                  {/* Mockup body */}
                  <div className="p-5 bg-neutral-50 space-y-3">
                    {/* Search bar */}
                    <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-neutral-200" />
                      <span className="text-xs text-neutral-400">Search documents…</span>
                    </div>
                    {/* Document rows */}
                    {[
                      { name: "Marina Bay Tower — Structural Drawings", status: "approved", type: "DWG" },
                      { name: "MEP Specifications v3.2", status: "pending", type: "PDF" },
                      { name: "Tender Submission Package", status: "approved", type: "PDF" },
                      { name: "As-Built Plans — Level 12-20", status: "draft", type: "DWG" },
                    ].map((doc, i) => (
                      <div key={i} className="bg-white border border-neutral-100 rounded-lg px-3 py-2.5 flex items-center gap-3">
                        <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          doc.type === "PDF" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        }`}>
                          {doc.type}
                        </div>
                        <span className="text-xs text-neutral-700 flex-1 truncate">{doc.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          doc.status === "approved" ? "bg-green-100 text-green-700" :
                          doc.status === "pending" ? "bg-amber-100 text-amber-700" :
                          "bg-neutral-100 text-neutral-600"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { label: "Projects", value: "12" },
                        { label: "Documents", value: "2,847" },
                        { label: "Team", value: "8" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-white border border-neutral-100 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-neutral-900">{stat.value}</p>
                          <p className="text-xs text-neutral-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -right-4 bg-green-500 text-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  AES-256 Encrypted
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 border-y border-neutral-100 bg-neutral-50 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-neutral-500 mb-6">
            Trusted by construction companies across Singapore
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {["Surbana Jurong", "CapitaLand Dev", "Boustead Projects", "Lendlease SG", "Keppel Land"].map((company) => (
              <div key={company} className="text-sm font-semibold text-neutral-400 tracking-wide uppercase">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
              Everything you need to manage construction documents
            </h2>
            <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
              Built specifically for Singapore&apos;s construction industry requirements.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: "Document Management",
                desc: "Upload, organize, and retrieve project documents instantly. Support for PDF, CAD files, DOCX, XLSX, and more.",
                color: "bg-primary-50 text-primary-500",
              },
              {
                icon: Building2,
                title: "Project Organization",
                desc: "Keep documents organized by project, folder, and phase. Create separate workspaces for each construction project.",
                color: "bg-blue-50 text-blue-500",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                desc: "Invite team members with role-based access (IT Admin, Project Admin, Engineer, Client). Share documents securely.",
                color: "bg-purple-50 text-purple-500",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "AES-256-GCM encryption, 2FA, JWT authentication, and PDPA-compliant data handling. Production-grade security.",
                color: "bg-green-50 text-green-500",
              },
              {
                icon: CheckCircle,
                title: "Approval Workflows",
                desc: "Built-in document approval with Draft → Pending → Approved/Rejected status tracking and email notifications.",
                color: "bg-amber-50 text-amber-500",
              },
              {
                icon: BarChart2,
                title: "Analytics & Audit Logs",
                desc: "Immutable audit logs, storage analytics, and activity feeds. Full visibility into every document action.",
                color: "bg-red-50 text-red-500",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-neutral-100 hover:shadow-lg transition-all duration-200"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 bg-neutral-900 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-green-400" />
            <Badge className="bg-green-900/50 text-green-400 border-green-700">Enterprise-Grade Security</Badge>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Your documents are safe with us</h2>
          <p className="text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            DocuRoute is built on the same security principles used by financial institutions. Every document is encrypted before storage, every action is logged, and your data never leaves Singapore.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "��", title: "AES-256-GCM", desc: "Military-grade encryption for every file" },
              { icon: "🛡️", title: "PDPA Compliant", desc: "Full Singapore data protection compliance" },
              { icon: "📋", title: "Immutable Audit Logs", desc: "Every action recorded and tamper-proof" },
              { icon: "🔑", title: "2FA Security", desc: "TOTP two-factor authentication" },
            ].map((item) => (
              <div key={item.title} className="bg-neutral-800 rounded-xl p-4 text-left">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 px-4 bg-neutral-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-neutral-700 mb-10">
            Start free. Scale as you grow.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { name: "Starter", price: "$0/mo", desc: "5 users · 10 GB", cta: "Get Started Free", href: "/register", highlight: false },
              { name: "Professional", price: "$99/mo", desc: "25 users · 100 GB", cta: "Start Free Trial", href: "/register", highlight: true },
              { name: "Enterprise", price: "Custom", desc: "Unlimited", cta: "Contact Sales", href: "mailto:sales@docuroute.com", highlight: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${plan.highlight ? "border-primary-500 bg-primary-50 shadow-lg" : "border-neutral-200 bg-white"}`}
              >
                <h3 className={`font-bold text-lg mb-1 ${plan.highlight ? "text-primary-700" : "text-neutral-900"}`}>{plan.name}</h3>
                <p className={`text-2xl font-bold mb-1 ${plan.highlight ? "text-primary-600" : "text-neutral-900"}`}>{plan.price}</p>
                <p className="text-sm text-neutral-500 mb-4">{plan.desc}</p>
                <Link href={plan.href}>
                  <Button
                    className={`w-full ${plan.highlight ? "bg-primary-500 hover:bg-primary-600 text-white" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    size="sm"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
            See full pricing and feature comparison →
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight text-center mb-12">
            What our customers say
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "DocuRoute transformed how we manage tender documents. Finding the latest drawing revision used to take 30 minutes — now it takes 30 seconds.",
                author: "Wei Ming Tan",
                role: "Project Director",
                company: "Pacific Builders",
              },
              {
                quote: "The approval workflow is exactly what we needed. Our QC process is now fully digital and every approval has a timestamp and audit trail.",
                author: "Priya Sharma",
                role: "QA/QC Manager",
                company: "Nexus Engineering",
              },
              {
                quote: "As a consultant, I can access drawings from my clients without endless email threads. The client portal feature is a game changer.",
                author: "Ahmad Farid",
                role: "Senior M&E Engineer",
                company: "TechBuild Consultancy",
              },
            ].map(({ quote, author, role, company }) => (
              <div key={author} className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-neutral-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm flex-shrink-0">
                    {author.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{author}</p>
                    <p className="text-xs text-neutral-500">{role}, {company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-blue-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to streamline your document management?
          </h2>
          <p className="text-primary-100 text-lg mb-8 leading-relaxed">
            Join construction companies across Singapore who trust DocuRoute to manage their project documents.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-primary-600 hover:bg-neutral-100 px-10 font-semibold">
              Start Your Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-primary-200 text-sm mt-4">
            No credit card required · Free 14-day trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-neutral-900">DocuRoute</span>
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Document management built for Singapore&apos;s construction industry.
              </p>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 text-sm mb-3">Product</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#features" className="hover:text-neutral-700">Features</a></li>
                <li><Link href="/pricing" className="hover:text-neutral-700">Pricing</Link></li>
                <li><a href="#security" className="hover:text-neutral-700">Security</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 text-sm mb-3">Company</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-neutral-700">About</a></li>
                <li><a href="#" className="hover:text-neutral-700">Blog</a></li>
                <li><a href="#" className="hover:text-neutral-700">Careers</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 text-sm mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li><a href="#" className="hover:text-neutral-700">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-neutral-700">Terms of Service</a></li>
                <li><a href="#" className="hover:text-neutral-700">PDPA Notice</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-neutral-500">© {new Date().getFullYear()} DocuRoute. All rights reserved.</p>
            <p className="text-xs text-neutral-500">Built for Singapore 🇸🇬</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
