import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Users, Zap, CheckCircle, Building2 } from "lucide-react";

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
                  Built for Singapore Construction
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
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-neutral-200">
                  View Pricing
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-neutral-700">
                {["No credit card required", "Free 14-day trial", "Cancel anytime"].map((text) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="w-full aspect-square max-w-lg mx-auto">
                  <div className="relative w-full h-full bg-gradient-to-br from-primary-50 to-blue-100 rounded-3xl overflow-hidden p-8">
                    <div className="absolute top-8 left-8 right-8 bottom-8 grid grid-cols-2 gap-4">
                      <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-500" />
                          </div>
                          <div>
                            <div className="h-3 bg-neutral-200 rounded w-32 mb-1"></div>
                            <div className="h-2 bg-neutral-100 rounded w-20"></div>
                          </div>
                          <div className="ml-auto">
                            <Badge className="bg-green-50 text-green-600 border-green-100 text-xs">Approved</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                        <Building2 className="w-8 h-8 text-primary-400 mb-2" />
                        <div className="h-2 bg-neutral-200 rounded w-full mb-1"></div>
                        <div className="h-2 bg-neutral-100 rounded w-3/4"></div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                        <Users className="w-8 h-8 text-accent-500 mb-2" />
                        <div className="h-2 bg-neutral-200 rounded w-full mb-1"></div>
                        <div className="h-2 bg-neutral-100 rounded w-2/3"></div>
                      </div>
                      <div className="col-span-2 bg-primary-500 rounded-xl p-4 text-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-primary-100">Documents Managed</p>
                            <p className="text-3xl font-bold">2,847</p>
                          </div>
                          <Zap className="w-8 h-8 text-primary-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-neutral-50 px-4">
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
                desc: "Upload, organize, and retrieve project documents instantly. Support for PDF, CAD files, and more.",
                color: "bg-primary-50 text-primary-500",
              },
              {
                icon: Building2,
                title: "Project Organization",
                desc: "Keep documents organized by project. Create separate workspaces for each construction project.",
                color: "bg-blue-50 text-blue-500",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                desc: "Invite team members with role-based access. Share documents securely across your organization.",
                color: "bg-purple-50 text-purple-500",
              },
              {
                icon: Shield,
                title: "Secure & Compliant",
                desc: "Enterprise-grade security. Your documents are protected with industry-standard encryption.",
                color: "bg-green-50 text-green-500",
              },
              {
                icon: Zap,
                title: "Fast & Reliable",
                desc: "Instant document access from anywhere. No more hunting through email threads or shared drives.",
                color: "bg-yellow-50 text-yellow-500",
              },
              {
                icon: CheckCircle,
                title: "Multi-Tenant",
                desc: "Each company has its own isolated workspace. Your data stays separate and secure.",
                color: "bg-accent-500/10 text-accent-500",
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

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4">
            Ready to streamline your document management?
          </h2>
          <p className="text-lg text-neutral-700 mb-8">
            Join construction companies across Singapore who trust DocuRoute to manage their project documents.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-primary-500 hover:bg-primary-600 text-white px-10">
              Get Started Free →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-neutral-900">DocuRoute</span>
          </div>
          <p className="text-sm text-neutral-700">© 2024 DocuRoute. Built for Singapore construction.</p>
        </div>
      </footer>
    </div>
  );
}
