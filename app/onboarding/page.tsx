"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, CheckCircle, ArrowRight, Users, Upload, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/document-upload";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { step: 1 as Step, label: "Welcome" },
  { step: 2 as Step, label: "First Project" },
  { step: 3 as Step, label: "Invite Team" },
  { step: 4 as Step, label: "Upload" },
  { step: 5 as Step, label: "Done" },
];

const INDUSTRY_TYPES = [
  { value: "commercial", label: "Commercial Development" },
  { value: "residential", label: "Residential Development" },
  { value: "infrastructure", label: "Infrastructure & Civil" },
  { value: "mep", label: "M&E (Mechanical & Electrical)" },
  { value: "general", label: "General Construction" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ projectName: string; invitesSent: number; docsUploaded: number }>({
    projectName: "",
    invitesSent: 0,
    docsUploaded: 0,
  });

  // Step 2: Project
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [industry, setIndustry] = useState("commercial");

  // Step 3: Invite
  const [invites, setInvites] = useState([
    { email: "", role: "engineer" },
    { email: "", role: "engineer" },
    { email: "", role: "engineer" },
  ]);

  const updateInvite = (i: number, field: "email" | "role", value: string) => {
    const updated = [...invites];
    updated[i] = { ...updated[i], [field]: value };
    setInvites(updated);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({ title: "Error", description: "Project name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDesc || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }
      setCreated((prev) => ({ ...prev, projectName }));
      setStep(3);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvites = async () => {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      setStep(4);
      return;
    }
    setLoading(true);
    let sent = 0;
    for (const inv of validInvites) {
      try {
        await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inv.email.trim(), role: inv.role }),
        });
        sent++;
      } catch {
        // Ignore individual failures
      }
    }
    setCreated((prev) => ({ ...prev, invitesSent: sent }));
    setLoading(false);
    setStep(4);
  };

  const handleFinish = async () => {
    // Mark onboarding as complete
    try {
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
    } catch {
      // Non-critical
    }
    router.push("/dashboard");
  };

  const progressWidth = `${((step - 1) / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-neutral-900 text-xl">DocuRoute</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step > s.step
                      ? "bg-green-500 text-white"
                      : step === s.step
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {step > s.step ? <CheckCircle className="w-4 h-4" /> : s.step}
                </div>
                <span className={`text-xs hidden sm:block ${step === s.step ? "text-primary-600 font-medium" : "text-neutral-400"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Your workspace is ready!</h1>
                <p className="text-neutral-600 mt-2 leading-relaxed">
                  Let&apos;s get you set up in just a few steps. We&apos;ll help you create your first project, invite your team, and upload your first document.
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4 text-left space-y-2">
                {[
                  "Create your first project",
                  "Invite your team members",
                  "Upload your first document",
                ].map((item, i) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-neutral-700">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-primary-500 hover:bg-primary-600 text-white gap-2 mt-2"
                onClick={() => setStep(2)}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Create Project */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">Create Your First Project</h2>
                  <p className="text-sm text-neutral-600">Organise your documents under a project</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proj-name">Project Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-name"
                    placeholder="e.g. Marina Bay Tower Phase 1"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-desc">Description (optional)</Label>
                  <Input
                    id="proj-desc"
                    placeholder="Brief description of the project"
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRY_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setIndustry(type.value)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          industry === type.value
                            ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white gap-2"
                  onClick={handleCreateProject}
                  disabled={loading || !projectName.trim()}
                >
                  {loading ? "Creating..." : "Create Project"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">Invite Your Team</h2>
                  <p className="text-sm text-neutral-600">Add up to 3 team members to get started</p>
                </div>
              </div>
              <div className="space-y-3">
                {invites.map((inv, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={`colleague${i + 1}@company.com`}
                      value={inv.email}
                      onChange={(e) => updateInvite(i, "email", e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={inv.role}
                      onChange={(e) => updateInvite(i, "role", e.target.value)}
                      className="border border-neutral-200 rounded-lg px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="project_admin">Admin</option>
                      <option value="engineer">Engineer</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                Invitations will be sent via email. Team members can join by clicking the link.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white gap-2"
                  onClick={handleSendInvites}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Invitations"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <button
                type="button"
                className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
                onClick={() => setStep(4)}
              >
                Skip this step →
              </button>
            </div>
          )}

          {/* Step 4: Upload */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">Upload Your First Document</h2>
                  <p className="text-sm text-neutral-600">PDF, DWG, DOCX, XLSX — up to 200 MB</p>
                </div>
              </div>
              <DocumentUpload
                onUploadSuccess={() => {
                  setCreated((prev) => ({ ...prev, docsUploaded: prev.docsUploaded + 1 }));
                  setTimeout(() => setStep(5), 1500);
                }}
              />
              <button
                type="button"
                className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
                onClick={() => setStep(5)}
              >
                Skip this step →
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">You&apos;re all set!</h2>
                <p className="text-neutral-600 mt-2 leading-relaxed">
                  Your DocuRoute workspace is ready. Here&apos;s what was set up:
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3 text-left">
                {[
                  { icon: CheckCircle, text: `Project created: "${created.projectName || "Your First Project"}"`, color: "text-green-500" },
                  { icon: CheckCircle, text: `${created.invitesSent} invitation${created.invitesSent !== 1 ? "s" : ""} sent`, color: "text-green-500" },
                  { icon: CheckCircle, text: `${created.docsUploaded} document${created.docsUploaded !== 1 ? "s" : ""} uploaded`, color: "text-green-500" },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-neutral-700">
                    <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                    {text}
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-primary-500 hover:bg-primary-600 text-white gap-2 py-3"
                onClick={handleFinish}
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          You can always change these settings later from your dashboard.
        </p>
      </div>
    </div>
  );
}
