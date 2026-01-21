import { useState, useMemo, useCallback, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  UserPlus, Search, Mail, Phone, Calendar, ChevronRight,
  Users, FileText, Clock, MoreHorizontal, Eye, Edit, Trash2
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Memoized client card component
const ClientCard = memo(function ClientCard({ 
  client, 
  onView,
  onEdit,
  onDelete
}: { 
  client: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasUpcomingRenewal = client.renewalDate && !isPast(new Date(client.renewalDate));
  const daysUntilRenewal = client.renewalDate ? differenceInDays(new Date(client.renewalDate), new Date()) : null;
  const isRenewalSoon = daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= 30;

  return (
    <Card className="card-hover group cursor-pointer" onClick={onView}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 flex items-center justify-center text-cyan-600 font-semibold text-lg">
              {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                {client.firstName} {client.lastName}
              </h3>
              {client.policyNumber && (
                <p className="text-xs text-muted-foreground font-mono">
                  Policy: {client.policyNumber}
                </p>
              )}
              {isRenewalSoon && (
                <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-0 font-medium text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Renewal in {daysUntilRenewal} days
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.renewalDate && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Renewal: {format(new Date(client.renewalDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
        
        {client.notes && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2 border-t pt-3">
            {client.notes}
          </p>
        )}
        
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Added {format(new Date(client.createdAt), "MMM d, yyyy")}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
  );
});

// Stats card component
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${color}`}>
      <div className="h-10 w-10 rounded-lg bg-white/80 dark:bg-black/20 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </div>
    </div>
  );
});

// Loading skeleton
function ClientsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 shimmer rounded-lg" />
        <div className="h-10 w-32 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 shimmer rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shimmer rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 shimmer rounded" />
                <div className="h-4 w-24 shimmer rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Clients() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agentId: "",
    notes: "",
  });
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { data: clients, isLoading, refetch } = trpc.clients.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const { data: agents } = trpc.agents.list.useQuery();
  
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client created successfully!");
      setIsDialogOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", agentId: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create client: ${error.message}`);
    },
  });

  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated successfully!");
      setIsEditDialogOpen(false);
      setEditingClient(null);
      setEditFormData({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update client: ${error.message}`);
    },
  });

  // Memoized filtered clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((client: any) => {
      const matchesSearch = searchQuery === "" || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery);
      return matchesSearch;
    });
  }, [clients, searchQuery]);

  // Memoized stats
  const stats = useMemo(() => {
    if (!clients) return { total: 0, withPolicies: 0, upcomingRenewals: 0, newThisMonth: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: clients.length,
      withPolicies: clients.filter((c: any) => c.policyNumber).length,
      upcomingRenewals: clients.filter((c: any) => {
        if (!c.renewalDate) return false;
        const renewalDate = new Date(c.renewalDate);
        return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
      }).length,
      newThisMonth: clients.filter((c: any) => new Date(c.createdAt) >= startOfMonth).length,
    };
  }, [clients]);

  // Callbacks
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
    };
    if (formData.email) payload.email = formData.email;
    if (formData.phone) payload.phone = formData.phone;
    if (formData.agentId) payload.agentId = parseInt(formData.agentId);
    if (formData.notes) payload.notes = formData.notes;
    
    createClient.mutate(payload);
  }, [formData, createClient]);

  const handleViewClient = useCallback((id: number) => {
    setLocation(`/clients/${id}`);
  }, [setLocation]);

  const handleEditClient = useCallback((client: any) => {
    setEditingClient(client);
    setEditFormData({
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    
    const payload: any = {};
    if (editFormData.firstName) payload.firstName = editFormData.firstName;
    if (editFormData.lastName) payload.lastName = editFormData.lastName;
    payload.email = editFormData.email || null;
    payload.phone = editFormData.phone || null;
    payload.notes = editFormData.notes || null;
    
    updateClient.mutate({ id: editingClient.id, data: payload });
  }, [editingClient, editFormData, updateClient]);

  const handleDeleteClient = useCallback((id: number) => {
    toast.info("Delete functionality coming soon");
  }, []);

  if (isLoading) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage client policies and contact information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
              <UserPlus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the client's contact information and assign them to an agent.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentId">Assigned Agent</Label>
                  <Select 
                    value={formData.agentId} 
                    onValueChange={(value) => setFormData({ ...formData, agentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending ? "Creating..." : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={Users} 
          label="Total Clients" 
          value={stats.total} 
          color="bg-cyan-500/10 text-cyan-600"
        />
        <StatsCard 
          icon={FileText} 
          label="With Policies" 
          value={stats.withPolicies} 
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard 
          icon={Calendar} 
          label="Upcoming Renewals" 
          value={stats.upcomingRenewals} 
          color="bg-amber-500/10 text-amber-600"
        />
        <StatsCard 
          icon={Clock} 
          label="New This Month" 
          value={stats.newThisMonth} 
          color="bg-blue-500/10 text-blue-600"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredClients.map((client: any) => (
            <ClientCard
              key={client.id}
              client={client}
              onView={() => handleViewClient(client.id)}
              onEdit={() => handleEditClient(client)}
              onDelete={() => handleDeleteClient(client.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="icon-container-lg bg-muted mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No clients found</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">
              {searchQuery 
                ? "Try adjusting your search criteria"
                : "Get started by adding your first client to the system"}
            </p>
            {!searchQuery && (
              <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client contact information for anniversary greetings and communications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="john@example.com"
              />
              <p className="text-xs text-muted-foreground">Used for sending anniversary greetings</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
