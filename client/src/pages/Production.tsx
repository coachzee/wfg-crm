import { memo, useMemo, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Trophy, TrendingUp, Target, Award, Users, DollarSign, ArrowUpRight, Crown, FileText, RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";
import PolicyDetailDialog from "@/components/PolicyDetailDialog";
import BulkPolicyUpdateDialog from "@/components/BulkPolicyUpdateDialog";
import { Pencil, Settings2, Upload } from "lucide-react";

// Color palette
const CHART_COLORS = {
  primary: "oklch(0.55 0.20 265)",
  success: "oklch(0.65 0.19 160)",
  warning: "oklch(0.75 0.18 85)",
  danger: "oklch(0.60 0.22 25)",
  purple: "oklch(0.55 0.20 300)",
  cyan: "oklch(0.65 0.15 200)",
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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

// Policy row component
const PolicyRow = memo(function PolicyRow({ 
  policy, 
  rank,
  showRank = false,
  onClick
}: { 
  policy: any; 
  rank?: number;
  showRank?: boolean;
  onClick?: () => void;
}) {
  const premium = parseFloat(policy.targetPremium || policy.premium || '0');
  const commission = parseFloat(policy.calculatedCommission || '0');
  const faceAmount = parseFloat(policy.faceAmount || '0');
  const hasTargetPremium = policy.targetPremium && parseFloat(policy.targetPremium) > 0;
  
  return (
    <div 
      className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer group"
      onClick={onClick}
    >
      {showRank && rank && (
        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
          rank === 1 ? 'bg-amber-500 text-white' :
          rank === 2 ? 'bg-slate-400 text-white' :
          rank === 3 ? 'bg-amber-700 text-white' :
          'bg-muted text-muted-foreground'
        }`}>
          {rank <= 3 ? <Crown className="h-4 w-4" /> : rank}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{policy.ownerName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{policy.policyNumber}</span>
          <span>•</span>
          <span>{policy.productType}</span>
          {policy.writingAgentSplit && policy.writingAgentSplit < 100 && (
            <>
              <span>•</span>
              <span className="text-amber-600">Split: {policy.writingAgentSplit}%/{100 - policy.writingAgentSplit}%</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <p className="font-bold text-emerald-600">${premium.toLocaleString()}</p>
          {hasTargetPremium && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Target</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Commission: ${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
      <Badge 
        variant={policy.status === 'Active' ? 'default' : 'secondary'}
        className={policy.status === 'Active' ? 'bg-emerald-500' : ''}
      >
        {policy.status}
      </Badge>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePolicyClick = useCallback((policy: any) => {
    setSelectedPolicy(policy);
    setDialogOpen(true);
  }, []);
  
  // Bulk update dialog state
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  
  // Fetch inforce policies data
  const { data: inforcePolicies, isLoading: policiesLoading, refetch: refetchPolicies } = trpc.inforcePolicies.list.useQuery(undefined, {
    staleTime: 30000,
  });
  
  const { data: productionSummary, isLoading: summaryLoading } = trpc.inforcePolicies.getSummary.useQuery(undefined, {
    staleTime: 30000,
  });
  
  const { data: topProducers, isLoading: topLoading } = trpc.inforcePolicies.getTopProducers.useQuery(10, {
    staleTime: 30000,
  });
  
  const { data: topAgents, isLoading: agentsLoading } = trpc.inforcePolicies.getTopAgentsByCommission.useQuery(10, {
    staleTime: 30000,
  });

  // Memoized calculations
  const { statusBreakdown, sortedPolicies, stats } = useMemo(() => {
    if (!inforcePolicies || !productionSummary) {
      return { 
        statusBreakdown: [], 
        sortedPolicies: [], 
        stats: { 
          totalPolicies: 0, 
          activePolicies: 0, 
          totalPremium: 0, 
          totalCommission: 0,
          totalFaceAmount: 0,
        } 
      };
    }

    // Status breakdown for pie chart
    const statusMap: Record<string, number> = {};
    inforcePolicies.forEach((p: any) => {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });
    const breakdown = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Sort policies by target premium (or premium if no target)
    const sorted = [...inforcePolicies].sort((a: any, b: any) => {
      const premiumA = parseFloat(a.targetPremium || a.premium || '0');
      const premiumB = parseFloat(b.targetPremium || b.premium || '0');
      return premiumB - premiumA;
    });

    return {
      statusBreakdown: breakdown,
      sortedPolicies: sorted,
      stats: {
        totalPolicies: productionSummary.totalPolicies,
        activePolicies: productionSummary.activePolicies,
        totalPremium: productionSummary.totalPremium,
        totalCommission: productionSummary.totalCommission,
        totalFaceAmount: productionSummary.totalFaceAmount,
      },
    };
  }, [inforcePolicies, productionSummary]);

  // Chart data for top producers
  const chartData = useMemo(() => {
    if (!topProducers) return [];
    return topProducers.map((p: any) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      premium: p.totalPremium,
      commission: p.totalCommission,
      policies: p.policyCount,
    }));
  }, [topProducers]);

  const handleRefresh = async () => {
    toast.info("Refreshing production data...");
    await refetchPolicies();
    toast.success("Production data refreshed");
  };

  if (policiesLoading || summaryLoading) {
    return <ProductionSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Dashboard</h1>
          <p className="text-muted-foreground">Transamerica Life Access - Inforce Policies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkUpdateOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Bulk Update
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={DollarSign} 
          label="Total Premium" 
          value={`$${stats.totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="Target premium across all policies"
          color="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
        />
        <StatsCard 
          icon={Trophy} 
          label="Total Commission" 
          value={`$${stats.totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="At 55% agent level × 125%"
          color="bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-400"
        />
        <StatsCard 
          icon={FileText} 
          label="Active Policies" 
          value={stats.activePolicies}
          subtext={`${stats.totalPolicies} total policies`}
          color="bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400"
        />
        <StatsCard 
          icon={Building2} 
          label="Total Face Amount" 
          value={`$${(stats.totalFaceAmount / 1000000).toFixed(1)}M`}
          subtext="Life insurance coverage"
          color="bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-400"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">All Policies ({stats.totalPolicies})</TabsTrigger>
          <TabsTrigger value="top-clients">Top Clients</TabsTrigger>
          <TabsTrigger value="top-agents">Top Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients by Premium */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Top Clients by Premium</CardTitle>
                    <p className="text-xs text-muted-foreground">Highest premium policyholders</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="premium" fill="url(#productionGradient)" radius={[0, 4, 4, 0]} />
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

            {/* Policy Status Distribution */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Policy Status Distribution</CardTitle>
                    <p className="text-xs text-muted-foreground">Breakdown by policy status</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {statusBreakdown.map((status: any, index: number) => (
                        <div key={status.name} className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-sm flex-1 truncate">{status.name}</span>
                          <Badge variant="secondary" className="text-xs">{status.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Award className="h-12 w-12 mb-2 opacity-20" />
                    <p>No policy data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent High-Value Policies */}
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Top Premium Policies</CardTitle>
                    <p className="text-xs text-muted-foreground">Highest premium policies in your book</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Top 10
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sortedPolicies.length > 0 ? (
                <div className="space-y-1">
                  {sortedPolicies.slice(0, 10).map((policy: any, index: number) => (
                    <PolicyRow 
                      key={policy.id} 
                      policy={policy} 
                      rank={index + 1}
                      showRank={true}
                      onClick={() => handlePolicyClick(policy)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2 opacity-20" />
                  <p>No policies found</p>
                  <p className="text-sm">Sync with Transamerica to import policies</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">All Inforce Policies</CardTitle>
                    <p className="text-xs text-muted-foreground">Complete list of policies from Transamerica</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sortedPolicies.length > 0 ? (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {sortedPolicies.map((policy: any) => (
                    <PolicyRow 
                      key={policy.id} 
                      policy={policy} 
                      onClick={() => handlePolicyClick(policy)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2 opacity-20" />
                  <p>No policies found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-clients" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Top Clients Leaderboard</CardTitle>
                    <p className="text-xs text-muted-foreground">Clients ranked by total premium</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topProducers && topProducers.length > 0 ? (
                <div className="space-y-1">
                  {topProducers.map((client: any, index: number) => (
                    <div key={client.name} className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-slate-400 text-white' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? <Crown className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.policyCount} {client.policyCount === 1 ? 'policy' : 'policies'} • 
                          Face: ${(client.totalFaceAmount / 1000000).toFixed(2)}M
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">${client.totalPremium.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Commission: ${client.totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-2 opacity-20" />
                  <p>No client data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-agents" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Top Agents by Commission</CardTitle>
                    <p className="text-xs text-muted-foreground">Agents ranked by total commission earned</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topAgents && topAgents.length > 0 ? (
                <div className="space-y-1">
                  {topAgents.map((agent: any, index: number) => (
                    <div key={agent.name} className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg shadow-slate-400/30' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg shadow-amber-700/30' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? <Crown className="h-5 w-5" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{agent.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {agent.agentCode && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{agent.agentCode}</span>}
                          <span>{agent.policyCount} {agent.policyCount === 1 ? 'policy' : 'policies'}</span>
                          <span>•</span>
                          <span>Avg Level: {Math.round(agent.avgCommissionLevel)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">${agent.totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground">
                          Premium: ${agent.totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-2 opacity-20" />
                  <p>No agent data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Detail Dialog */}
      <PolicyDetailDialog
        policy={selectedPolicy}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={() => refetchPolicies()}
      />
      
      {/* Bulk Policy Update Dialog */}
      <BulkPolicyUpdateDialog
        policies={sortedPolicies || []}
        open={bulkUpdateOpen}
        onOpenChange={setBulkUpdateOpen}
        onUpdate={() => refetchPolicies()}
      />
    </div>
  );
}
