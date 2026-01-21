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
  Users, TrendingUp, Clock, CheckCircle, UserX, GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// WFG Rank configuration
const RANK_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  TRAINING_ASSOCIATE: { label: "TA", icon: "🎓", color: "bg-gray-100 text-gray-700" },
  ASSOCIATE: { label: "A", icon: "📋", color: "bg-blue-100 text-blue-700" },
  SENIOR_ASSOCIATE: { label: "SA", icon: "📊", color: "bg-indigo-100 text-indigo-700" },
  MARKETING_DIRECTOR: { label: "MD", icon: "🎯", color: "bg-green-100 text-green-700" },
  SENIOR_MARKETING_DIRECTOR: { label: "SMD", icon: "⭐", color: "bg-emerald-100 text-emerald-700" },
  EXECUTIVE_MARKETING_DIRECTOR: { label: "EMD", icon: "💎", color: "bg-purple-100 text-purple-700" },
  CEO_MARKETING_DIRECTOR: { label: "CEO", icon: "👑", color: "bg-pink-100 text-pink-700" },
  EXECUTIVE_VICE_CHAIRMAN: { label: "EVC", icon: "🏆", color: "bg-amber-100 text-amber-700" },
  SENIOR_EXECUTIVE_VICE_CHAIRMAN: { label: "SEVC", icon: "🌟", color: "bg-orange-100 text-orange-700" },
  FIELD_CHAIRMAN: { label: "FC", icon: "🔥", color: "bg-red-100 text-red-700" },
  EXECUTIVE_CHAIRMAN: { label: "EC", icon: "👔", color: "bg-yellow-100 text-yellow-800" },
};

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
  onDelete,
  examPrepStatus
}: { 
  agent: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  examPrepStatus?: { isStudying: boolean; progress: number; course: string };
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
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors flex items-center gap-2">
                {agent.firstName} {agent.lastName}
                {agent.isActive === false && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 text-xs">
                    <UserX className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </h3>
              {agent.agentCode && (
                <p className="text-xs text-muted-foreground font-mono">
                  Code: {agent.agentCode}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <StageBadge stage={agent.currentStage as WorkflowStage} />
                {agent.currentRank && RANK_CONFIG[agent.currentRank] && (
                  <Badge variant="outline" className={`${RANK_CONFIG[agent.currentRank].color} border-0 text-xs`}>
                    <span className="mr-1">{RANK_CONFIG[agent.currentRank].icon}</span>
                    {RANK_CONFIG[agent.currentRank].label}
                  </Badge>
                )}
                {examPrepStatus?.isStudying && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Studying ({examPrepStatus.progress}%)
                  </Badge>
                )}
              </div>
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
  color,
  onClick,
  active = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-xl ${color} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''} ${active ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
    >
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
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string | null>(() => {
    // Check URL for filter parameter on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get('filter');
  });
  const [teamFilter, setTeamFilter] = useState<"BASE_SHOP" | "SUPER_TEAM">("BASE_SHOP");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active"); // Default to showing only active agents
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agentCode: "",
    notes: "",
  });
  
  // Edit contact dialog state
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<{ id: number; firstName: string; lastName: string; phone: string; email: string } | null>(null);
  const [editContactData, setEditContactData] = useState({ phone: "", email: "" });

  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery(undefined, {
    staleTime: 30000,
  });
  
  // Fetch exam prep data to show studying status on agent cards
  const { data: examPrepRecords } = trpc.mywfg.getExamPrepRecords.useQuery();
  
  // Create a map of agent IDs to their exam prep status
  const examPrepByAgentId = useMemo(() => {
    if (!examPrepRecords) return new Map();
    const map = new Map<number, { isStudying: boolean; progress: number; course: string }>(); 
    examPrepRecords.forEach(record => {
      if (record.agentId) {
        const existing = map.get(record.agentId);
        // If agent has multiple courses, show the one with lowest progress (most needs attention)
        if (!existing || (record.pleCompletePercent || 0) < existing.progress) {
          map.set(record.agentId, {
            isStudying: (record.pleCompletePercent || 0) < 100,
            progress: record.pleCompletePercent || 0,
            course: record.state || record.course || 'License Exam'
          });
        }
      }
    });
    return map;
  }, [examPrepRecords]);
  
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
  
  const updateAgent = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("Contact info updated successfully!");
      setIsEditContactOpen(false);
      setEditingAgent(null);
      setEditContactData({ phone: "", email: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update contact info: ${error.message}`);
    },
  });

  // Memoized filtered agents
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return agents.filter((agent: any) => {
      const matchesSearch = searchQuery === "" || 
        `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.agentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "all" || agent.currentStage === stageFilter;
      const matchesRank = rankFilter === "all" || agent.currentRank === rankFilter;
      const matchesTeam = agent.teamType === teamFilter;
      
      // Quick filter logic
      let matchesQuickFilter = true;
      if (quickFilter === "total") {
        matchesQuickFilter = true; // Show all
      } else if (quickFilter === "licensed") {
        matchesQuickFilter = agent.currentStage === "NET_LICENSED";
      } else if (quickFilter === "lifeLicensed") {
        matchesQuickFilter = agent.isLifeLicensed === true;
      } else if (quickFilter === "training") {
        matchesQuickFilter = ["EXAM_PREP", "PRODUCT_TRAINING"].includes(agent.currentStage);
      } else if (quickFilter === "newThisMonth") {
        matchesQuickFilter = new Date(agent.createdAt) >= startOfMonth;
      }
      
      // Active/Inactive filter
      let matchesActive = true;
      if (activeFilter === "active") {
        matchesActive = agent.isActive !== false; // Show active agents (isActive = true or undefined)
      } else if (activeFilter === "inactive") {
        matchesActive = agent.isActive === false; // Show only inactive agents
      }
      
      return matchesSearch && matchesStage && matchesRank && matchesQuickFilter && matchesTeam && matchesActive;
    });
  }, [agents, searchQuery, stageFilter, rankFilter, quickFilter, teamFilter, activeFilter]);

  // Memoized stats (based on current team filter)
  const stats = useMemo(() => {
    if (!agents) return { total: 0, netLicensed: 0, licensed: 0, inTraining: 0, newThisMonth: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const teamAgents = agents.filter((a: any) => a.teamType === teamFilter);
    return {
      total: teamAgents.length,
      netLicensed: teamAgents.filter((a: any) => a.currentStage === "NET_LICENSED").length,
      licensed: teamAgents.filter((a: any) => a.isLifeLicensed === true).length,
      inTraining: teamAgents.filter((a: any) => ["EXAM_PREP", "PRODUCT_TRAINING"].includes(a.currentStage)).length,
      newThisMonth: teamAgents.filter((a: any) => new Date(a.createdAt) >= startOfMonth).length,
    };
  }, [agents, teamFilter]);

  // Callbacks
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createAgent.mutate(formData);
  }, [formData, createAgent]);

  const handleViewAgent = useCallback((id: number) => {
    setLocation(`/agents/${id}`);
  }, [setLocation]);

  const handleEditAgent = useCallback((id: number) => {
    const agent = agents?.find((a: any) => a.id === id);
    if (agent) {
      setEditingAgent({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        phone: agent.phone || "",
        email: agent.email || "",
      });
      setEditContactData({
        phone: agent.phone || "",
        email: agent.email || "",
      });
      setIsEditContactOpen(true);
    }
  }, [agents]);
  
  const handleSaveContact = useCallback(() => {
    if (!editingAgent) return;
    updateAgent.mutate({
      id: editingAgent.id,
      data: {
        phone: editContactData.phone || undefined,
        email: editContactData.email || undefined,
      },
    });
  }, [editingAgent, editContactData, updateAgent]);

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setLocation("/exam-prep")}
          >
            <GraduationCap className="h-4 w-4" />
            Exam Prep Status
          </Button>
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
      </div>

      {/* Team Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTeamFilter("BASE_SHOP")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            teamFilter === "BASE_SHOP"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          Base Shop
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
            {agents?.filter((a: any) => a.teamType === "BASE_SHOP").length || 0}
          </span>
        </button>
        <button
          onClick={() => setTeamFilter("SUPER_TEAM")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            teamFilter === "SUPER_TEAM"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          Super Team
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
            {agents?.filter((a: any) => a.teamType === "SUPER_TEAM").length || 0}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={Users} 
          label="Total Agents" 
          value={stats.total} 
          color="bg-primary/10 text-primary"
          onClick={() => setQuickFilter(quickFilter === "total" ? null : "total")}
          active={quickFilter === "total"}
        />
        <StatsCard 
          icon={CheckCircle} 
          label="Net Licensed" 
          value={stats.netLicensed} 
          color="bg-emerald-500/10 text-emerald-600"
          onClick={() => setQuickFilter(quickFilter === "licensed" ? null : "licensed")}
          active={quickFilter === "licensed"}
        />
        <StatsCard 
          icon={Award} 
          label="Licensed" 
          value={stats.licensed} 
          color="bg-green-500/10 text-green-600"
          onClick={() => setQuickFilter(quickFilter === "lifeLicensed" ? null : "lifeLicensed")}
          active={quickFilter === "lifeLicensed"}
        />
        <StatsCard 
          icon={Clock} 
          label="In Training" 
          value={stats.inTraining} 
          color="bg-amber-500/10 text-amber-600"
          onClick={() => setQuickFilter(quickFilter === "training" ? null : "training")}
          active={quickFilter === "training"}
        />
        <StatsCard 
          icon={TrendingUp} 
          label="New This Month" 
          value={stats.newThisMonth} 
          color="bg-blue-500/10 text-blue-600"
          onClick={() => setQuickFilter(quickFilter === "newThisMonth" ? null : "newThisMonth")}
          active={quickFilter === "newThisMonth"}
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
            <Select value={rankFilter} onValueChange={setRankFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Award className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                {Object.entries(RANK_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as "all" | "active" | "inactive")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Active Only
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-gray-400" />
                    Inactive Only
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Agents
                  </div>
                </SelectItem>
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
              examPrepStatus={examPrepByAgentId.get(agent.id)}
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
              {searchQuery || stageFilter !== "all" || rankFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first agent to the system"}
            </p>
            {!searchQuery && stageFilter === "all" && rankFilter === "all" && (
              <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add Your First Agent
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactOpen} onOpenChange={setIsEditContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
            <DialogDescription>
              Update phone number and email for {editingAgent?.firstName} {editingAgent?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="editPhone"
                  value={editContactData.phone}
                  onChange={(e) => setEditContactData({ ...editContactData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="editEmail"
                  type="email"
                  value={editContactData.email}
                  onChange={(e) => setEditContactData({ ...editContactData, email: e.target.value })}
                  placeholder="agent@example.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditContactOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveContact} disabled={updateAgent.isPending}>
              {updateAgent.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
