import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, X } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "Perfect for small teams getting started",
    badge: null,
    cta: "Get Started Free",
    ctaHref: "/register",
    variant: "outline" as const,
    features: [
      "Up to 5 users",
      "10 GB storage",
      "3 active projects",
      "Basic document management",
      "Email support",
      "PDPA-compliant storage",
    ],
    notIncluded: ["Approval workflows", "Analytics dashboard", "Custom branding", "Priority support"],
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing construction teams",
    badge: "Most Popular",
    cta: "Start Free Trial",
    ctaHref: "/register",
    variant: "default" as const,
    features: [
      "Up to 25 users",
      "100 GB storage",
      "Unlimited projects",
      "Full document management",
      "Approval workflows",
      "Analytics dashboard",
      "AES-256-GCM encryption",
      "2FA security",
      "Priority email support",
      "PDPA compliance tools",
    ],
    notIncluded: ["Custom branding", "Dedicated account manager"],
  },
  {
    name: "Enterprise",
    price: "Contact Us",
    period: "",
    description: "For large firms and complex deployments",
    badge: null,
    cta: "Contact Sales",
    ctaHref: "mailto:sales@docuroute.com",
    variant: "outline" as const,
    features: [
      "Unlimited users",
      "Unlimited storage",
      "Unlimited projects",
      "All Professional features",
      "Custom branding",
      "SSO / SAML integration",
      "Dedicated account manager",
      "SLA guarantees",
      "On-premise deployment option",
      "Custom integrations",
    ],
    notIncluded: [],
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! Our Starter plan is free forever. Professional and Enterprise plans come with a 14-day free trial — no credit card required.",
  },
  {
    q: "Can I change plans at any time?",
    a: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time. Changes take effect on the next billing cycle.",
  },
  {
    q: "Is my data stored in Singapore?",
    a: "Yes. All data is stored on AWS ap-southeast-1 (Singapore) servers, fully compliant with PDPA requirements.",
  },
  {
    q: "How does the encryption work?",
    a: "Every document is encrypted using AES-256-GCM before being stored on S3. Each file gets a unique encryption key and IV. Even our team cannot read your documents.",
  },
  {
    q: "Do you offer discounts for larger teams?",
    a: "Yes. Contact our sales team for volume discounts on Enterprise plans. We also offer special rates for non-profit organisations.",
  },
  {
    q: "What file types are supported?",
    a: "DocuRoute supports PDF, DWG, DXF, DOCX, XLSX, PNG, JPG, and many other common construction document formats.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-neutral-900 text-lg">DocuRoute</span>
            </Link>
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

      {/* Hero */}
      <section className="pt-20 pb-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Badge className="mb-4 bg-primary-50 text-primary-500 border-primary-100 hover:bg-primary-50">
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 tracking-tight mb-4">
            Plans for every team size
          </h1>
          <p className="text-xl text-neutral-600 leading-relaxed">
            Start free. Scale as you grow. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 relative ${
                  plan.badge
                    ? "border-primary-500 shadow-lg shadow-primary-100"
                    : "border-neutral-200"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary-500 text-white border-0 px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-neutral-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-neutral-500 mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                    {plan.period && (
                      <span className="text-neutral-500 mb-1">{plan.period}</span>
                    )}
                  </div>
                </div>

                <Link href={plan.ctaHref}>
                  <Button
                    className={`w-full mb-6 ${
                      plan.badge
                        ? "bg-primary-500 hover:bg-primary-600 text-white"
                        : ""
                    }`}
                    variant={plan.badge ? "default" : plan.variant}
                  >
                    {plan.cta}
                  </Button>
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                      <X className="w-4 h-4 text-neutral-300 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-8">
            Full feature comparison
          </h2>
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-6 py-4 font-semibold text-neutral-700 w-1/2">Feature</th>
                  <th className="text-center px-4 py-4 font-semibold text-neutral-700">Starter</th>
                  <th className="text-center px-4 py-4 font-semibold text-primary-500">Professional</th>
                  <th className="text-center px-4 py-4 font-semibold text-neutral-700">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Users", "5", "25", "Unlimited"],
                  ["Storage", "10 GB", "100 GB", "Unlimited"],
                  ["Projects", "3", "Unlimited", "Unlimited"],
                  ["AES-256-GCM encryption", "✓", "✓", "✓"],
                  ["PDPA compliance tools", "✓", "✓", "✓"],
                  ["2FA security", "✓", "✓", "✓"],
                  ["Approval workflows", "—", "✓", "✓"],
                  ["Analytics dashboard", "—", "✓", "✓"],
                  ["Audit logs", "—", "✓", "✓"],
                  ["Custom branding", "—", "—", "✓"],
                  ["SSO / SAML", "—", "—", "✓"],
                  ["SLA guarantee", "—", "—", "✓"],
                ].map(([feature, starter, pro, enterprise], i) => (
                  <tr key={feature} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                    <td className="px-6 py-3 text-neutral-700">{feature}</td>
                    <td className="px-4 py-3 text-center text-neutral-500">{starter}</td>
                    <td className="px-4 py-3 text-center font-medium text-primary-600">{pro}</td>
                    <td className="px-4 py-3 text-center text-neutral-700">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border border-neutral-200 rounded-xl p-6">
                <h3 className="font-semibold text-neutral-900 mb-2">{q}</h3>
                <p className="text-neutral-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-16 px-4 bg-neutral-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need a custom solution?
          </h2>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            Talk to our team about Enterprise plans with custom pricing, dedicated support, and on-premise deployment options.
          </p>
          <Link href="mailto:sales@docuroute.com">
            <Button size="lg" className="bg-white text-neutral-900 hover:bg-neutral-100">
              Contact Sales
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-900">DocuRoute</span>
          </div>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} DocuRoute. Built for Singapore 🇸🇬
          </p>
          <div className="flex gap-4 text-xs text-neutral-500">
            <Link href="/" className="hover:text-neutral-700">Home</Link>
            <Link href="/#features" className="hover:text-neutral-700">Features</Link>
            <Link href="/login" className="hover:text-neutral-700">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
