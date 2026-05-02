import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Users, Globe, Mail, Phone, CheckCircle, PlusCircle, BarChart3 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  region?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

const orgTypeColors: Record<string, string> = {
  ngo: "bg-green-100 text-green-800",
  government: "bg-blue-100 text-blue-800",
  private: "bg-purple-100 text-purple-800",
  military: "bg-red-100 text-red-800",
  un_agency: "bg-orange-100 text-orange-800",
};

export default function OrganizationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "ngo", description: "", contactEmail: "",
    contactPhone: "", website: "", region: "",
  });

  const { data, isLoading } = useQuery<{ organizations: Organization[]; total: number }>({
    queryKey: ["/api/organizations"],
  });

  const { data: myMemberships } = useQuery<{ memberships: any[] }>({
    queryKey: ["/api/organizations/me/memberships"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) =>
      apiRequest("/api/organizations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/me/memberships"] });
      setIsCreateOpen(false);
      setForm({ name: "", type: "ngo", description: "", contactEmail: "", contactPhone: "", website: "", region: "" });
      toast({ title: "Organization created successfully" });
    },
    onError: () => toast({ title: "Failed to create organization", variant: "destructive" }),
  });

  const orgs: Organization[] = data?.organizations || [];
  const memberships = myMemberships?.memberships || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <h1 className="text-2xl font-black">Organizations</h1>
            </div>
            <p className="text-sm text-muted-foreground">Multi-tenant organization management — NGOs, government agencies, private networks</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Red Cross District" />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="military">Military</SelectItem>
                      <SelectItem value="un_agency">UN Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Organization purpose and scope" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Email</Label>
                    <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Website</Label>
                    <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="South Asia" />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.name || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Memberships */}
        {memberships.length > 0 && (
          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3">My Memberships</h3>
            <div className="flex flex-wrap gap-2">
              {memberships.map((m) => (
                <span key={m.orgId} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 font-medium">
                  <Building2 className="w-3 h-3" />
                  {m.orgName}
                  <span className="opacity-70">({m.memberRole})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Organizations", value: orgs.length, icon: Building2, bg: "bg-blue-500/10", color: "text-blue-500" },
            { label: "Verified", value: orgs.filter(o => o.isVerified).length, icon: CheckCircle, bg: "bg-green-500/10", color: "text-green-500" },
            { label: "Active", value: orgs.filter(o => o.isActive).length, icon: Globe, bg: "bg-purple-500/10", color: "text-purple-500" },
            { label: "My Memberships", value: memberships.length, icon: Users, bg: "bg-orange-500/10", color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Organization list */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading organizations...</div>
        ) : orgs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No organizations yet</p>
            <p className="text-xs text-muted-foreground">Create the first one using the button above.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {orgs.map((org) => (
              <div key={org.id} className="rounded-2xl border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-1 bg-blue-600" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-bold text-sm">{org.name}</h3>
                        {org.isVerified && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orgTypeColors[org.type] || "bg-gray-100 text-gray-700"}`}>
                          {org.type.replace("_", " ").toUpperCase()}
                        </span>
                        {!org.isActive && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Inactive</span>}
                      </div>
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{org.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {org.region && <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> {org.region}</div>}
                    {org.contactEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {org.contactEmail}</div>}
                    {org.contactPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {org.contactPhone}</div>}
                    <div className="text-muted-foreground/50 pt-1">Created {new Date(org.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
