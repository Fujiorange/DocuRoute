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
import { Users, Plus, Mail, Clock } from "lucide-react";
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

export default function TeamPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "engineer" });
  const [sending, setSending] = useState(false);

  const fetchInvitations = async () => {
    const res = await fetch("/api/invitations");
    const data = await res.json();
    setInvitations(data.invitations || []);
    setLoading(false);
  };

  useEffect(() => { fetchInvitations(); }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Team</h1>
          <p className="text-neutral-700 mt-1">Manage team members and invitations</p>
        </div>
        {(user?.role === "it_admin" || user?.role === "project_admin") ? (
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
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  <p className="font-medium mb-1">📧 Stubbed email</p>
                  <p>The invitation link will be logged to the server console (email sending is stubbed in Phase 1).</p>
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
        ) : null}
      </div>

      {/* Current user card */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Current Members</h2>
        <div className="bg-white rounded-xl border border-neutral-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary-100 text-primary-600 font-semibold">
                {user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-neutral-900">{user?.name} <span className="text-neutral-700 font-normal">(you)</span></p>
              <p className="text-sm text-neutral-700">{user?.email}</p>
            </div>
            <Badge className={`ml-auto ${roleBadgeColors[user?.role || "engineer"]}`}>
              {roleLabels[user?.role || "engineer"]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Pending Invitations</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-neutral-100">
            <Users className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-700">No pending invitations</p>
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
                  <TableRow key={inv.id}>
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
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-100 text-xs">
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
