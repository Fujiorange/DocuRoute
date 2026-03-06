"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Shield, Lock, Smartphone, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import type { Company } from "@/types";

const roleLabels: Record<string, string> = {
  it_admin: "IT Admin",
  project_admin: "Project Admin",
  engineer: "Engineer",
  client: "Client",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, setUser } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA state
  const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "setup" | "confirm" | "done">("idle");
  const [qrCode, setQrCode] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loadingQR, setLoadingQR] = useState(false);
  const [verifying2FA, setVerifying2FA] = useState(false);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompany(data.company);
          setCompanyName(data.company.name);
        }
        setLoading(false);
      });
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Company name updated" });
      setCompany(data.company);
      if (user) setUser({ ...user, companyName: data.company.name });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to change password", variant: "destructive" });
        return;
      }
      toast({ title: "Password changed successfully" });
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch {
      toast({ title: "Error", description: "Failed to change password", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSetup2FA = async () => {
    setLoadingQR(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setTwoFactorStep("setup");
    } catch {
      toast({ title: "Error", description: "Failed to start 2FA setup", variant: "destructive" });
    } finally {
      setLoadingQR(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying2FA(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setBackupCodes(data.backupCodes || []);
      setTwoFactorStep("done");
      if (user) setUser({ ...user, twoFactorEnabled: true } as typeof user);
      toast({ title: "2FA enabled", description: "Your account is now protected with two-factor authentication." });
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setVerifying2FA(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Settings</h1>
        <p className="text-neutral-700 mt-1">Manage your account and company settings</p>
      </div>

      {/* Account Info */}
      <Card className="border-neutral-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            <CardTitle className="text-base">Account Information</CardTitle>
          </div>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-neutral-700 uppercase tracking-wider">Name</Label>
              <p className="font-medium text-neutral-900 mt-1">{user?.name}</p>
            </div>
            <div>
              <Label className="text-xs text-neutral-700 uppercase tracking-wider">Email</Label>
              <p className="font-medium text-neutral-900 mt-1">{user?.email}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-neutral-700 uppercase tracking-wider">Role</Label>
            <div className="mt-1">
              <Badge className="bg-primary-50 text-primary-600 border-primary-100">
                <Shield className="w-3 h-3 mr-1" />
                {roleLabels[user?.role || "engineer"]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Change Password */}
      <Card className="border-neutral-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-500" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="bg-primary-500 hover:bg-primary-600 text-white"
              disabled={savingPassword}
            >
              {savingPassword ? "Saving..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* 2FA */}
      <Card className="border-neutral-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary-500" />
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {(user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled && twoFactorStep !== "done" ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">2FA is enabled</p>
                <p className="text-sm text-green-700">Your account is protected with an authenticator app.</p>
              </div>
            </div>
          ) : twoFactorStep === "idle" ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 leading-relaxed">
                Two-factor authentication adds an extra layer of security. After enabling, you&apos;ll need to enter a code from your authenticator app (Google Authenticator, Authy, etc.) each time you sign in.
              </p>
              <Button
                className="bg-primary-500 hover:bg-primary-600 text-white"
                onClick={handleSetup2FA}
                disabled={loadingQR}
              >
                {loadingQR ? "Setting up..." : "Enable 2FA"}
              </Button>
            </div>
          ) : twoFactorStep === "setup" ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.):
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-neutral-200 p-2" />
                </div>
              )}
              <form onSubmit={handleVerify2FA} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="totp">Enter the 6-digit code from your app</Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                    required
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setTwoFactorStep("idle"); setQrCode(""); setTotpToken(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary-500 hover:bg-primary-600 text-white"
                    disabled={verifying2FA || totpToken.length !== 6}
                  >
                    {verifying2FA ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </div>
              </form>
            </div>
          ) : twoFactorStep === "done" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">2FA successfully enabled!</p>
                  <p className="text-sm text-green-700">Save your backup codes in a safe place.</p>
                </div>
              </div>
              {backupCodes.length > 0 && (
                <div className="bg-neutral-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-neutral-700 mb-3">Backup Codes</p>
                  <p className="text-xs text-neutral-500 mb-3">
                    Store these codes securely. Each code can only be used once if you lose access to your authenticator app.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code) => (
                      <code key={code} className="text-sm font-mono bg-white border border-neutral-200 rounded px-3 py-1.5 text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      {/* Company Settings */}
      <Card className="border-neutral-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            <CardTitle className="text-base">Company Settings</CardTitle>
          </div>
          <CardDescription>Manage your company information</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 bg-neutral-100 rounded animate-pulse" />
              <div className="h-10 bg-neutral-100 rounded animate-pulse" />
            </div>
          ) : user?.role === "it_admin" ? (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cname">Company Name</Label>
                <Input
                  id="cname"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              {company && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {[
                    { label: "Members", value: company._count.users },
                    { label: "Projects", value: company._count.projects },
                    { label: "Documents", value: company._count.documents },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-neutral-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                      <p className="text-xs text-neutral-700">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-neutral-700 uppercase tracking-wider">Company Name</Label>
              <p className="font-medium text-neutral-900">{company?.name}</p>
              <p className="text-sm text-neutral-700 mt-2">Only IT Admins can modify company settings.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

