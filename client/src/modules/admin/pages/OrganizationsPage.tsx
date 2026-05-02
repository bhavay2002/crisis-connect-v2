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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              Organizations
            </h1>
            <p className="text-muted-foreground mt-1">
              Multi-tenant organization management — NGOs, government agencies, private networks
            </p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {memberships.map((m) => (
                  <Badge key={m.orgId} variant="secondary" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {m.orgName}
                    <span className="text-xs opacity-70">({m.memberRole})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Organizations", value: orgs.length, icon: Building2, color: "text-blue-600" },
            { label: "Verified", value: orgs.filter(o => o.isVerified).length, icon: CheckCircle, color: "text-green-600" },
            { label: "Active", value: orgs.filter(o => o.isActive).length, icon: Globe, color: "text-purple-600" },
            { label: "My Memberships", value: memberships.length, icon: Users, color: "text-orange-600" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Organization list */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading organizations...</div>
        ) : orgs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No organizations yet. Create the first one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orgs.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {org.name}
                        {org.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </CardTitle>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orgTypeColors[org.type] || "bg-gray-100 text-gray-700"}`}>
                          {org.type.replace("_", " ").toUpperCase()}
                        </span>
                        {!org.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                    </div>
                  </div>
                  {org.description && (
                    <CardDescription className="text-xs mt-1 line-clamp-2">{org.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  {org.region && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {org.region}
                    </div>
                  )}
                  {org.contactEmail && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {org.contactEmail}
                    </div>
                  )}
                  {org.contactPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {org.contactPhone}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground/60 pt-1">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
