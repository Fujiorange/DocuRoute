"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Mail, Clock, Shield, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import type { Invitation } from "@/types";

const roleLabels: Record<string, string> = {
  it_admin: "IT Admin",
  project_admin: "Project Admin",
  engineer: "Engineer",
  client: "Client",
};

const roleBadgeColors: Record<string, string> = {
  it_admin: "bg-purple-50 text-purple-600 border-purple-100",
  project_admin: "bg-blue-50 text-blue-600 border-blue-100",
  engineer: "bg-green-50 text-green-600 border-green-100",
  client: "bg-neutral-50 text-neutral-700 border-neutral-200",
};

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export default function TeamPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "engineer" });
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    try {
      const [teamRes, invRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/invitations"),
      ]);
      const [teamData, invData] = await Promise.all([
        teamRes.json(),
        invRes.json(),
      ]);
      setMembers(teamData.members || []);
      setTotalCount(teamData.totalCount || 0);
      setActiveCount(teamData.activeCount || 0);
      setInvitations(invData.invitations || []);
    } catch {
      toast({ title: "Error", description: "Failed to load team data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Invitation sent!", description: `Invitation sent to ${form.email}` });
      setInvitations([data.invitation, ...invitations]);
      setForm({ email: "", role: "engineer" });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const isAdmin = user?.role === "it_admin" || user?.role === "project_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Team</h1>
          <p className="text-neutral-700 mt-1">Manage team members and invitations</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary-500 hover:bg-primary-600 text-white gap-2">
                <Plus className="w-4 h-4" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new member to your team.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="iemail">Email Address</Label>
                  <Input
                    id="iemail"
                    type="email"
                    placeholder="colleague@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_admin">Project Admin</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary-500 hover:bg-primary-600 text-white"
                    disabled={sending}
                  >
                    {sending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: loading ? null : totalCount },
          { label: "Active", value: loading ? null : activeCount },
          { label: "Pending Invites", value: loading ? null : invitations.length },
          { label: "Admins", value: loading ? null : members.filter((m) => m.role === "it_admin" || m.role === "project_admin").length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-neutral-100 rounded-xl p-4 text-center">
            {stat.value === null ? (
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            )}
            <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Team Members</h2>
        {loading ? (
          <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-neutral-100">
            <Users className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-700">No team members found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  {isAdmin && <TableHead className="hidden lg:table-cell">2FA</TableHead>}
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className="even:bg-neutral-50 hover:bg-neutral-100">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarFallback className="bg-primary-100 text-primary-600 font-semibold text-sm">
                            {member.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {member.name}
                            {member.id === user?.id && (
                              <span className="text-neutral-500 font-normal"> (you)</span>
                            )}
                          </p>
                          {member.email && (
                            <p className="text-xs text-neutral-500">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${roleBadgeColors[member.role] || roleBadgeColors.engineer}`}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={member.isActive
                          ? "bg-green-50 text-green-600 border-green-100 text-xs"
                          : "bg-neutral-50 text-neutral-500 border-neutral-200 text-xs"
                        }
                      >
                        {member.isActive ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                        ) : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={member.twoFactorEnabled
                            ? "bg-green-50 text-green-600 border-green-100 text-xs"
                            : "bg-neutral-50 text-neutral-400 border-neutral-200 text-xs"
                          }
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {member.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell text-xs text-neutral-500">
                      {new Date(member.createdAt).toLocaleDateString("en-SG")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Pending Invitations</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-neutral-100">
            <Mail className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No pending invitations</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Invited by</TableHead>
                  <TableHead className="hidden md:table-cell">Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id} className="even:bg-neutral-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">{inv.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleBadgeColors[inv.role] || roleBadgeColors.engineer}>
                        {roleLabels[inv.role] || inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-neutral-700">
                      {inv.invitedBy.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-neutral-700">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inv.expiresAt).toLocaleDateString("en-SG")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 text-xs">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

