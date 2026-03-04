"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Shield } from "lucide-react";
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
