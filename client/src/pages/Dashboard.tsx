import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  Users, Target, CheckCircle, Clock, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Activity, Zap,
  UserPlus, Award, Calendar, RefreshCw, DollarSign, Heart, Shield
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useMemo, useCallback, memo } from "react";
import { useLocation } from "wouter";

// Stage configuration with colors and labels
const WORKFLOW_STAGES = {
  RECRUITMENT: { color: "#ef4444", label: "Recruitment", icon: UserPlus },
  EXAM_PREP: { color: "#f97316", label: "Exam Prep", icon: Clock },
  LICENSED: { color: "#eab308", label: "Licensed", icon: Award },
  PRODUCT_TRAINING: { color: "#3b82f6", label: "Product Training", icon: Activity },
  BUSINESS_LAUNCH: { color: "#8b5cf6", label: "Business Launch", icon: Zap },
  NET_LICENSED: { color: "#10b981", label: "Net Licensed", icon: Target },
  CLIENT_TRACKING: { color: "#06b6d4", label: "Client Tracking", icon: Users },
  CHARGEBACK_PROOF: { color: "#6366f1", label: "Chargeback Proof", icon: CheckCircle },
} as const;

type WorkflowStage = keyof typeof WORKFLOW_STAGES;

// Memoized metric card component for performance
const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  variant = "default",
  onClick
}: { 
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}) {
  const variantStyles = {
    default: "from-primary/5 to-primary/10 border-primary/20",
    success: "from-emerald-500/5 to-emerald-500/10 border-emerald-500/20",
    warning: "from-amber-500/5 to-amber-500/10 border-amber-500/20",
    danger: "from-red-500/5 to-red-500/10 border-red-500/20",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
  };

  return (
    <Card 
      className={`metric-card card-hover border bg-gradient-to-br ${variantStyles[variant]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight counter">{value}</span>
              {trend && trendValue && (
                <span className={`flex items-center text-xs font-medium ${
                  trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : 
                   trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
                  {trendValue}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`icon-container ${iconStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Memoized stage badge component
const StageBadge = memo(function StageBadge({ stage, count }: { stage: WorkflowStage; count: number }) {
  const config = WORKFLOW_STAGES[stage];
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
      <div className="flex items-center gap-3">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      <Badge variant="secondary" className="font-semibold">{count}</Badge>
    </div>
  );
});

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-4 w-72 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <div className="h-4 w-24 shimmer rounded" />
              <div className="h-8 w-16 shimmer rounded" />
              <div className="h-3 w-32 shimmer rounded" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="h-[400px] shimmer rounded-lg" />
      </Card>
    </div>
  );
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 shadow-soft border">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} agents</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading, refetch, isRefetching } = trpc.dashboard.stats.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // Fetch face amount and families protected metrics
  const { data: metrics } = trpc.dashboard.metrics.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Memoized calculations
  const stageData = useMemo(() => {
    if (!stats?.agentsByStage) return [];
    return Object.entries(stats.agentsByStage)
      .map(([stage, count]) => ({
        name: WORKFLOW_STAGES[stage as WorkflowStage]?.label || stage.replace(/_/g, " "),
        value: count as number,
        fill: WORKFLOW_STAGES[stage as WorkflowStage]?.color || "#6b7280",
        stage: stage as WorkflowStage,
      }))
      .filter(item => item.value > 0 || true); // Show all stages
  }, [stats?.agentsByStage]);

  const taskCompletionRate = useMemo(() => {
    if (!stats?.taskStats?.total) return 0;
    return Math.round((stats.taskStats.completed / stats.taskStats.total) * 100);
  }, [stats?.taskStats]);

  const taskData = useMemo(() => {
    if (!stats?.taskStats) return [];
    return [
      { name: "Completed", value: stats.taskStats.completed, fill: "#10b981" },
      { name: "Pending", value: stats.taskStats.pending, fill: "#f59e0b" },
      { name: "Overdue", value: stats.taskStats.overdue || 0, fill: "#ef4444" },
    ].filter(item => item.value > 0);
  }, [stats?.taskStats]);

  // Callbacks for navigation
  const navigateToAgents = useCallback(() => setLocation("/agents"), [setLocation]);
  const navigateToTasks = useCallback(() => setLocation("/tasks"), [setLocation]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const totalAgents = stats?.totalAgents || 0;
  const netLicensed = stats?.agentsByStage?.NET_LICENSED || 0;
  const conversionRate = totalAgents > 0 ? Math.round((netLicensed / totalAgents) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground">
            Here's your team's performance overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary" className="gap-1.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-live" />
            Live
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          title="Total Agents"
          value={totalAgents}
          subtitle="Active recruits in pipeline"
          icon={Users}
          trend={totalAgents > 0 ? "up" : "neutral"}
          trendValue={totalAgents > 0 ? "Active" : ""}
          onClick={navigateToAgents}
        />
        <MetricCard
          title="Net Licensed"
          value={netLicensed}
          subtitle="$1,000+ milestone achieved"
          icon={Target}
          variant="success"
          trend={netLicensed > 0 ? "up" : "neutral"}
          trendValue={conversionRate > 0 ? `${conversionRate}% rate` : ""}
        />
        <MetricCard
          title="Task Completion"
          value={`${taskCompletionRate}%`}
          subtitle={`${stats?.taskStats?.completed || 0}/${stats?.taskStats?.total || 0} tasks done`}
          icon={CheckCircle}
          variant={taskCompletionRate >= 80 ? "success" : taskCompletionRate >= 50 ? "warning" : "danger"}
          onClick={navigateToTasks}
        />
        <MetricCard
          title="Last Sync"
          value={stats?.lastSyncDate ? formatDistanceToNow(new Date(stats.lastSyncDate), { addSuffix: true }) : "Never"}
          subtitle="MyWFG integration"
          icon={RefreshCw}
          variant={stats?.lastSyncDate ? "default" : "warning"}
        />
      </div>
      
      {/* Impact Metrics - Face Amount & Families Protected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="card-hover border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Face Amount</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-emerald-600">
                    ${((metrics?.totalFaceAmount || 0) / 1000000).toFixed(2)}M
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Life insurance coverage issued</p>
              </div>
              <div className="icon-container bg-emerald-500/10 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover border bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Families Protected</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-rose-600">
                    {metrics?.familiesProtected || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Households with coverage</p>
              </div>
              <div className="icon-container bg-rose-500/10 text-rose-600">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover border bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Super Team Cash Flow</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-blue-600">
                    ${((metrics?.superTeamCashFlow || 0) / 1000).toFixed(1)}K
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total team commission (YTD)</p>
              </div>
              <div className="icon-container bg-blue-500/10 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Progress */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pipeline Progress</CardTitle>
              <CardDescription>Agent conversion through workflow stages</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {conversionRate}% conversion
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.max(conversionRate, 5)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Recruitment</span>
              <span>Net Licensed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" />
            Agent Pipeline
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4" />
            Task Overview
          </TabsTrigger>
          <TabsTrigger value="stages" className="gap-2 data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4" />
            Stage Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4 animate-fade-in">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Agents by Workflow Stage
              </CardTitle>
              <CardDescription>
                Distribution of agents across the recruitment pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={stageData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.55 0.20 265)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.55 0.20 265)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 265)" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 12, fill: 'oklch(0.50 0.02 265)' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'oklch(0.50 0.02 265)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="oklch(0.55 0.20 265)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                    <Bar dataKey="value" fill="oklch(0.55 0.20 265)" radius={[4, 4, 0, 0]} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="icon-container-lg bg-muted mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No agents yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first agent to see pipeline data
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={navigateToAgents}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Agent
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 animate-fade-in">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Task Completion Status
              </CardTitle>
              <CardDescription>
                Overview of follow-up tasks and their completion status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taskData.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {taskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center space-y-4">
                    {taskData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-2xl font-bold">{item.value}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <span className="text-2xl font-bold text-primary">{taskCompletionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="icon-container-lg bg-muted mb-4">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No tasks yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create follow-up tasks to track your team's progress
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={navigateToTasks}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4 animate-fade-in">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Stage Breakdown
              </CardTitle>
              <CardDescription>
                Detailed view of agents in each workflow stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(WORKFLOW_STAGES).map(([stage, config]) => (
                  <StageBadge 
                    key={stage} 
                    stage={stage as WorkflowStage} 
                    count={(stats?.agentsByStage?.[stage as WorkflowStage] as number) || 0} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">
                Common tasks to manage your team
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={navigateToAgents} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Agent
              </Button>
              <Button size="sm" variant="outline" onClick={navigateToTasks} className="gap-2">
                <Calendar className="h-4 w-4" />
                New Task
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLocation("/clients")} className="gap-2">
                <Users className="h-4 w-4" />
                Add Client
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
