import { useState, useMemo, useCallback, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  UserPlus, Search, Filter, ChevronRight, Phone, Mail, 
  Calendar, Award, MoreHorizontal, Eye, Edit, Trash2,
  Users, TrendingUp, Clock, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Workflow stages configuration
const WORKFLOW_STAGES = {
  RECRUITMENT: { color: "bg-red-500", bgLight: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", label: "Recruitment" },
  EXAM_PREP: { color: "bg-orange-500", bgLight: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", label: "Exam Prep" },
  LICENSED: { color: "bg-yellow-500", bgLight: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", label: "Licensed" },
  PRODUCT_TRAINING: { color: "bg-blue-500", bgLight: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Product Training" },
  BUSINESS_LAUNCH: { color: "bg-violet-500", bgLight: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", label: "Business Launch" },
  NET_LICENSED: { color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", label: "Net Licensed" },
  CLIENT_TRACKING: { color: "bg-cyan-500", bgLight: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-300", label: "Client Tracking" },
  CHARGEBACK_PROOF: { color: "bg-indigo-500", bgLight: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", label: "Chargeback Proof" },
} as const;

type WorkflowStage = keyof typeof WORKFLOW_STAGES;

// Memoized stage badge component
const StageBadge = memo(function StageBadge({ stage }: { stage: WorkflowStage }) {
  const config = WORKFLOW_STAGES[stage];
  return (
    <Badge variant="secondary" className={`${config.bgLight} ${config.text} border-0 font-medium`}>
      <span className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
      {config.label}
    </Badge>
  );
});

// Memoized agent card component
const AgentCard = memo(function AgentCard({ 
  agent, 
  onView,
  onEdit,
  onDelete
}: { 
  agent: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="card-hover group cursor-pointer" onClick={onView}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
              {agent.firstName?.charAt(0)}{agent.lastName?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                {agent.firstName} {agent.lastName}
              </h3>
              {agent.agentCode && (
                <p className="text-xs text-muted-foreground font-mono">
                  Code: {agent.agentCode}
                </p>
              )}
              <StageBadge stage={agent.currentStage as WorkflowStage} />
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
                Edit Agent
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
          {agent.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{agent.email}</span>
            </div>
          )}
          {agent.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{agent.phone}</span>
            </div>
          )}
          {agent.examDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(agent.examDate), "MMM d, yyyy")}</span>
            </div>
          )}
          {agent.licenseNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-3.5 w-3.5" />
              <span>{agent.licenseNumber}</span>
            </div>
          )}
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Added {format(new Date(agent.createdAt), "MMM d, yyyy")}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
  );
});

// Loading skeleton
function AgentsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 shimmer rounded-lg" />
        <div className="h-10 w-32 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shimmer rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 shimmer rounded" />
                <div className="h-4 w-24 shimmer rounded" />
                <div className="h-6 w-28 shimmer rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

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

export default function Agents() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agentCode: "",
    notes: "",
  });

  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery(undefined, {
    staleTime: 30000,
  });
  
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Agent created successfully!");
      setIsDialogOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", agentCode: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });

  // Memoized filtered agents
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter((agent: any) => {
      const matchesSearch = searchQuery === "" || 
        `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.agentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "all" || agent.currentStage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [agents, searchQuery, stageFilter]);

  // Memoized stats
  const stats = useMemo(() => {
    if (!agents) return { total: 0, netLicensed: 0, inTraining: 0, newThisMonth: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: agents.length,
      netLicensed: agents.filter((a: any) => a.currentStage === "NET_LICENSED").length,
      inTraining: agents.filter((a: any) => ["EXAM_PREP", "PRODUCT_TRAINING"].includes(a.currentStage)).length,
      newThisMonth: agents.filter((a: any) => new Date(a.createdAt) >= startOfMonth).length,
    };
  }, [agents]);

  // Callbacks
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createAgent.mutate(formData);
  }, [formData, createAgent]);

  const handleViewAgent = useCallback((id: number) => {
    setLocation(`/agents/${id}`);
  }, [setLocation]);

  const handleEditAgent = useCallback((id: number) => {
    toast.info("Edit functionality coming soon");
  }, []);

  const handleDeleteAgent = useCallback((id: number) => {
    toast.info("Delete functionality coming soon");
  }, []);

  if (isLoading) {
    return <AgentsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage your team's recruits and track their progress</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
              <UserPlus className="h-4 w-4" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
              <DialogDescription>
                Enter the details for the new recruit. They'll start in the Recruitment stage.
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
                  <Label htmlFor="agentCode">Agent Code</Label>
                  <Input
                    id="agentCode"
                    value={formData.agentCode}
                    onChange={(e) => setFormData({ ...formData, agentCode: e.target.value })}
                    placeholder="ABC123"
                  />
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
                <Button type="submit" disabled={createAgent.isPending}>
                  {createAgent.isPending ? "Creating..." : "Create Agent"}
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
          label="Total Agents" 
          value={stats.total} 
          color="bg-primary/10 text-primary"
        />
        <StatsCard 
          icon={CheckCircle} 
          label="Net Licensed" 
          value={stats.netLicensed} 
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard 
          icon={Clock} 
          label="In Training" 
          value={stats.inTraining} 
          color="bg-amber-500/10 text-amber-600"
        />
        <StatsCard 
          icon={TrendingUp} 
          label="New This Month" 
          value={stats.newThisMonth} 
          color="bg-blue-500/10 text-blue-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(WORKFLOW_STAGES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredAgents.map((agent: any) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onView={() => handleViewAgent(agent.id)}
              onEdit={() => handleEditAgent(agent.id)}
              onDelete={() => handleDeleteAgent(agent.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="icon-container-lg bg-muted mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No agents found</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">
              {searchQuery || stageFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first agent to the system"}
            </p>
            {!searchQuery && stageFilter === "all" && (
              <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add Your First Agent
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
