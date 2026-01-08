import { useMemo, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Trophy, TrendingUp, Target, Award, Users, DollarSign, ArrowUpRight, Crown } from "lucide-react";

// Color palette
const CHART_COLORS = {
  primary: "oklch(0.55 0.20 265)",
  success: "oklch(0.65 0.19 160)",
  warning: "oklch(0.75 0.18 85)",
  danger: "oklch(0.60 0.22 25)",
  purple: "oklch(0.55 0.20 300)",
  cyan: "oklch(0.65 0.15 200)",
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

// Stats card component
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color,
  trend
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext: string;
  color: string;
  trend?: number;
}) {
  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-5 ${color}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-80">{label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{value}</p>
                {trend !== undefined && trend > 0 && (
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                    <ArrowUpRight className="h-3 w-3" />
                    {trend}%
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70">{subtext}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-black/20 flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Leaderboard row component
const LeaderboardRow = memo(function LeaderboardRow({ 
  rank, 
  agent, 
  isTopThree 
}: { 
  rank: number; 
  agent: any; 
  isTopThree: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isTopThree ? 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20' : 'hover:bg-muted/50'}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
        rank === 1 ? 'bg-amber-500 text-white' :
        rank === 2 ? 'bg-slate-400 text-white' :
        rank === 3 ? 'bg-amber-700 text-white' :
        'bg-muted text-muted-foreground'
      }`}>
        {rank <= 3 ? <Crown className="h-4 w-4" /> : rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{agent.name}</p>
        <p className="text-xs text-muted-foreground">{agent.stage ? agent.stage.replace(/_/g, " ") : "Unknown"}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-emerald-600">${agent.production.toLocaleString()}</p>
        {agent.agentCode && (
          <p className="text-xs text-muted-foreground font-mono">{agent.agentCode}</p>
        )}
      </div>
    </div>
  );
});

// Loading skeleton
function ProductionSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 shimmer rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 shimmer rounded-xl" />
        <div className="h-96 shimmer rounded-xl" />
      </div>
    </div>
  );
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium">{label}</p>
        <p className="text-emerald-600 font-bold">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function Production() {
  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const { data: productionRecords, isLoading: productionLoading } = trpc.production.list.useQuery(undefined, {
    staleTime: 30000,
  });

  // Memoized calculations
  const { agentProduction, topProducers, stageBreakdown, stats } = useMemo(() => {
    if (!agents) return { agentProduction: [], topProducers: [], stageBreakdown: [], stats: { total: 0, netLicensed: 0, average: 0, activeAgents: 0 } };

    const agentProd = agents.map((agent: any) => {
      const agentRecords = productionRecords?.filter((r: any) => r.agentId === agent.id) || [];
      const totalProduction = agentRecords.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        production: totalProduction,
        stage: agent.workflowStage,
        agentCode: agent.agentCode,
      };
    });

    const sorted = [...agentProd].sort((a, b) => b.production - a.production);
    const top10 = sorted.slice(0, 10);

    const stages = agents.reduce((acc: any, agent: any) => {
      const stage = (agent.workflowStage || "unknown").replace(/_/g, " ");
      const existing = acc.find((s: any) => s.name === stage);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: stage, value: 1 });
      }
      return acc;
    }, []);

    const totalProd = agentProd.reduce((sum: number, a: any) => sum + a.production, 0);
    const netLicensedCount = agentProd.filter((a: any) => a.production >= 1000).length;

    return {
      agentProduction: agentProd,
      topProducers: top10,
      stageBreakdown: stages,
      stats: {
        total: totalProd,
        netLicensed: netLicensedCount,
        average: agentProd.length > 0 ? totalProd / agentProd.length : 0,
        activeAgents: agentProd.length,
      },
    };
  }, [agents, productionRecords]);

  if (agentsLoading || productionLoading) {
    return <ProductionSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Dashboard</h1>
          <p className="text-muted-foreground">Track agent production, milestones, and team performance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={DollarSign} 
          label="Total Production" 
          value={`$${stats.total.toLocaleString()}`}
          subtext="Across all agents"
          color="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
        />
        <StatsCard 
          icon={Trophy} 
          label="Net Licensed" 
          value={stats.netLicensed}
          subtext="$1,000+ in production"
          color="bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-400"
        />
        <StatsCard 
          icon={Target} 
          label="Average Production" 
          value={`$${stats.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="Per agent"
          color="bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400"
        />
        <StatsCard 
          icon={Users} 
          label="Active Agents" 
          value={stats.activeAgents}
          subtext="Total recruits"
          color="bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Producers Chart */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Top Producers</CardTitle>
                <p className="text-xs text-muted-foreground">Production by agent</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProducers.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducers} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="production" fill="url(#productionGradient)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="productionGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-2 opacity-20" />
                <p>No production data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Breakdown */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Award className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">Pipeline Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Agents by workflow stage</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stageBreakdown.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie
                      data={stageBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stageBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stageBreakdown.map((stage: any, index: number) => (
                    <div key={stage.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-sm flex-1 truncate">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs">{stage.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Award className="h-12 w-12 mb-2 opacity-20" />
                <p>No agent data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Production Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">All agents ranked by production</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {agentProduction.length} agents
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {agentProduction.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {[...agentProduction]
                .sort((a, b) => b.production - a.production)
                .map((agent, index) => (
                  <LeaderboardRow 
                    key={agent.id} 
                    rank={index + 1} 
                    agent={agent} 
                    isTopThree={index < 3}
                  />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-2 opacity-20" />
              <p>No agent production data available</p>
              <p className="text-sm">Add agents and record their production to see the leaderboard</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
