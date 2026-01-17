import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  UserPlus, Award, Calendar, RefreshCw, DollarSign, Heart, Shield,
  AlertTriangle, AlertCircle, FileWarning, CreditCard, Bell, Send
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useMemo, useCallback, memo, useState } from "react";
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

// Weekly Sync Summary Component
const WeeklySyncSummary = memo(function WeeklySyncSummary() {
  const { data: summary, isLoading } = trpc.syncLogs.getWeeklySummary.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Card className="card-hover border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <CardContent className="p-6">
          <div className="h-32 shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const successRate = summary && summary.totalSyncs > 0 
    ? Math.round((summary.successfulSyncs / summary.totalSyncs) * 100) 
    : 0;

  return (
    <Card className="card-hover border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-500" />
              Weekly Sync Summary
            </CardTitle>
            <CardDescription>Automated MyWFG sync status (3:30 PM & 6:30 PM daily)</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/sync-history')}
            className="gap-2"
          >
            View Full History
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-indigo-600">{summary?.totalSyncs || 0}</div>
            <div className="text-xs text-muted-foreground">Total Syncs</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-emerald-600">{summary?.successfulSyncs || 0}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-red-600">{summary?.failedSyncs || 0}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
        </div>
        
        {summary?.syncsByTime && summary.syncsByTime.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {summary.syncsByTime.map((timeSlot) => (
              <div key={timeSlot.time} className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{timeSlot.time} Sync</span>
                  <Badge variant={timeSlot.failed === 0 ? "default" : "destructive"} className="text-xs">
                    {timeSlot.success}/{timeSlot.success + timeSlot.failed}
                  </Badge>
                </div>
                <Progress 
                  value={timeSlot.success + timeSlot.failed > 0 ? (timeSlot.success / (timeSlot.success + timeSlot.failed)) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span><Users className="w-3 h-3 inline mr-1" />{summary?.totalAgentsProcessed || 0} agents processed</span>
          <span><CheckCircle className="w-3 h-3 inline mr-1" />{summary?.totalContactsUpdated || 0} contacts updated</span>
          {summary?.totalErrors && summary.totalErrors > 0 && (
            <span className="text-red-500"><AlertTriangle className="w-3 h-3 inline mr-1" />{summary.totalErrors} errors</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Income Tracking Chart Component - Shows projected vs actual income over time
const IncomeTrackingChart = memo(function IncomeTrackingChart() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const { data: history, isLoading } = trpc.dashboard.getIncomeHistory.useQuery({ period });
  const { data: accuracyStats } = trpc.dashboard.getIncomeAccuracyStats.useQuery();
  const saveSnapshot = trpc.dashboard.saveIncomeSnapshot.useMutation();

  if (isLoading) {
    return (
      <Card className="card-hover border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
        <CardContent className="p-6">
          <div className="h-[300px] shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Format data for Recharts
  const chartData = (history || []).map(h => ({
    date: format(new Date(h.date), 'MMM d'),
    fullDate: format(new Date(h.date), 'MMM d, yyyy'),
    projected: h.projectedTotal,
    actual: h.actualIncome || 0,
    accuracy: h.accuracy,
  }));

  const hasData = chartData.length > 0;
  const hasActualData = chartData.some(d => d.actual > 0);

  return (
    <Card className="card-hover border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              Income Tracking
            </CardTitle>
            <CardDescription>Projected vs Actual income over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
                <TabsTrigger value="quarter" className="text-xs px-2">Quarter</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-2">Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveSnapshot.mutate()}
              disabled={saveSnapshot.isPending}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${saveSnapshot.isPending ? 'animate-spin' : ''}`} />
              Snapshot
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No income history data yet</p>
            <p className="text-xs mt-1">Click "Snapshot" to start tracking projected income</p>
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs" 
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass rounded-lg p-3 shadow-soft border bg-background">
                            <p className="text-sm font-medium mb-2">{payload[0]?.payload?.fullDate}</p>
                            <p className="text-sm text-cyan-600">
                              Projected: ${payload[0]?.value?.toLocaleString()}
                            </p>
                            {(payload[1]?.value as number) > 0 && (
                              <p className="text-sm text-emerald-600">
                                Actual: ${payload[1]?.value?.toLocaleString()}
                              </p>
                            )}
                            {payload[0]?.payload?.accuracy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Accuracy: {payload[0]?.payload?.accuracy}%
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    name="Projected"
                    stroke="#06b6d4"
                    fill="url(#projectedGradient)"
                    strokeWidth={2}
                  />
                  {hasActualData && (
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#10b981"
                      fill="url(#actualGradient)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Accuracy Stats */}
            {accuracyStats && accuracyStats.snapshotsWithActual > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-lg font-bold text-cyan-600">{accuracyStats.totalSnapshots}</div>
                  <div className="text-xs text-muted-foreground">Total Snapshots</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-lg font-bold text-emerald-600">{accuracyStats.snapshotsWithActual}</div>
                  <div className="text-xs text-muted-foreground">With Actual Data</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-lg font-bold">{accuracyStats.averageAccuracy}%</div>
                  <div className="text-xs text-muted-foreground">Avg Accuracy</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-lg font-bold text-blue-600">
                    ${(accuracyStats.totalActual / 1000).toFixed(1)}K
                  </div>
                  <div className="text-xs text-muted-foreground">Total Actual</div>
                </div>
              </div>
            )}
            
            {!hasActualData && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    <strong>No actual income data yet.</strong> Update actual income from MyWFG commission statements to track projection accuracy.
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

// Income Discrepancy Chart - Shows variance between projected and actual income over 90 days
const IncomeDiscrepancyChart = memo(function IncomeDiscrepancyChart() {
  const { data: history, isLoading } = trpc.dashboard.getIncomeHistory.useQuery({ period: 'quarter' });

  if (isLoading) {
    return (
      <Card className="card-hover border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5">
        <CardContent className="p-6">
          <div className="h-[300px] shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Calculate discrepancy data - only include entries with actual income
  const discrepancyData = (history || [])
    .filter(h => h.actualIncome > 0)
    .map(h => {
      const variance = h.actualIncome - h.projectedTotal;
      const variancePercent = h.projectedTotal > 0 
        ? Math.round((variance / h.projectedTotal) * 100) 
        : 0;
      return {
        date: format(new Date(h.date), 'MMM d'),
        fullDate: format(new Date(h.date), 'MMM d, yyyy'),
        projected: h.projectedTotal,
        actual: h.actualIncome,
        variance: variance,
        variancePercent: variancePercent,
        isPositive: variance >= 0,
      };
    });

  const hasData = discrepancyData.length > 0;

  // Calculate summary statistics
  const totalVariance = discrepancyData.reduce((sum, d) => sum + d.variance, 0);
  const avgVariancePercent = discrepancyData.length > 0
    ? Math.round(discrepancyData.reduce((sum, d) => sum + d.variancePercent, 0) / discrepancyData.length)
    : 0;
  const positiveCount = discrepancyData.filter(d => d.isPositive).length;
  const negativeCount = discrepancyData.filter(d => !d.isPositive).length;

  return (
    <Card className="card-hover border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Income Discrepancy Analysis
            </CardTitle>
            <CardDescription>Variance between projected and actual income (last 90 days)</CardDescription>
          </div>
          {hasData && (
            <Badge 
              variant="outline" 
              className={`font-mono ${totalVariance >= 0 ? 'text-emerald-600 border-emerald-500/50' : 'text-red-600 border-red-500/50'}`}
            >
              {totalVariance >= 0 ? '+' : ''}{totalVariance.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No discrepancy data available</p>
            <p className="text-xs mt-1">Add actual income data to see variance analysis</p>
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discrepancyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs" 
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => {
                      const absValue = Math.abs(value);
                      if (absValue >= 1000) {
                        return `${value >= 0 ? '' : '-'}$${(absValue / 1000).toFixed(0)}K`;
                      }
                      return `$${value}`;
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        return (
                          <div className="glass rounded-lg p-3 shadow-soft border bg-background">
                            <p className="text-sm font-medium mb-2">{data?.fullDate}</p>
                            <p className="text-sm text-muted-foreground">
                              Projected: ${data?.projected?.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Actual: ${data?.actual?.toLocaleString()}
                            </p>
                            <p className={`text-sm font-medium mt-1 ${data?.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                              Variance: {data?.isPositive ? '+' : ''}{data?.variance?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              <span className="text-xs ml-1">({data?.variancePercent}%)</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="variance" 
                    name="Variance"
                    radius={[4, 4, 0, 0]}
                  >
                    {discrepancyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isPositive ? '#10b981' : '#ef4444'}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                  {/* Reference line at zero */}
                  <CartesianGrid horizontal={false} vertical={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary Statistics */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className={`text-lg font-bold ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalVariance >= 0 ? '+' : ''}{(totalVariance / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-muted-foreground">Total Variance</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className={`text-lg font-bold ${avgVariancePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {avgVariancePercent >= 0 ? '+' : ''}{avgVariancePercent}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Variance</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-lg font-bold text-emerald-600">{positiveCount}</div>
                <div className="text-xs text-muted-foreground">Over Projected</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-lg font-bold text-red-600">{negativeCount}</div>
                <div className="text-xs text-muted-foreground">Under Projected</div>
              </div>
            </div>
            
            {/* Insight */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">
                <strong>Insight:</strong> {positiveCount > negativeCount 
                  ? `Your projections tend to be conservative. Actual income exceeded projections ${positiveCount} out of ${discrepancyData.length} times.`
                  : positiveCount < negativeCount
                  ? `Your projections tend to be optimistic. Actual income fell short ${negativeCount} out of ${discrepancyData.length} times. Consider adjusting probability factors.`
                  : `Your projections are balanced. Actual income matched or exceeded projections about half the time.`
                }
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// Policy Anniversaries Summary - Shows upcoming anniversaries on dashboard
const PolicyAnniversariesSummary = memo(function PolicyAnniversariesSummary() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = trpc.dashboard.getAnniversarySummary.useQuery(undefined, {
    staleTime: 60000,
  });
  const { data: anniversaries } = trpc.dashboard.getAnniversaries.useQuery({ daysAhead: 30 }, {
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="card-hover border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgentCount = summary?.thisWeek || 0;
  const upcomingCount = summary?.thisMonth || 0;
  const topAnniversaries = anniversaries?.slice(0, 5) || [];

  return (
    <Card className="card-hover border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Policy Anniversaries</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/anniversaries')}
            className="text-xs"
          >
            View All
          </Button>
        </div>
        <CardDescription>Upcoming client review opportunities</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <div className="text-xs text-muted-foreground">This Week (Urgent)</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-2xl font-bold text-amber-600">{upcomingCount}</div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </div>
        </div>

        {/* Top 5 Upcoming Anniversaries */}
        {topAnniversaries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Next Up:</p>
            {topAnniversaries.map((policy: any) => (
              <div 
                key={policy.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setLocation('/anniversaries')}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    policy.daysUntilAnniversary <= 7 
                      ? 'bg-red-100 text-red-700' 
                      : policy.daysUntilAnniversary <= 14 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {policy.daysUntilAnniversary}d
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[150px]">{policy.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{policy.policyAge} year anniversary</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">${(policy.faceAmount / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-muted-foreground">Face</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming anniversaries</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Email Tracking Widget - Shows anniversary email open/click statistics
const EmailTrackingWidget = memo(function EmailTrackingWidget() {
  const { data: stats, isLoading } = trpc.dashboard.getAnniversaryEmailStats.useQuery(undefined, {
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-purple-600" />
            Anniversary Email Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const { thisWeek, thisMonth, total, recentEmails } = stats;
  
  // Calculate rates
  const weekOpenRate = thisWeek.sent > 0 ? Math.round((thisWeek.opened / thisWeek.sent) * 100) : 0;
  const weekClickRate = thisWeek.sent > 0 ? Math.round((thisWeek.clicked / thisWeek.sent) * 100) : 0;
  const monthOpenRate = thisMonth.sent > 0 ? Math.round((thisMonth.opened / thisMonth.sent) * 100) : 0;
  const totalOpenRate = total.sent > 0 ? Math.round((total.opened / total.sent) * 100) : 0;
  const totalClickRate = total.sent > 0 ? Math.round((total.clicked / total.sent) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-purple-600" />
          Anniversary Email Tracking
        </CardTitle>
        <CardDescription>Track client engagement with anniversary greeting emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-xl font-bold text-purple-600">{thisWeek.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{weekOpenRate}% opened</span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-xl font-bold text-indigo-600">{thisMonth.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{monthOpenRate}% opened</span>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">All Time</p>
            <p className="text-xl font-bold text-gray-700">{total.sent}</p>
            <p className="text-xs text-muted-foreground">sent</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-green-600">{totalOpenRate}% opened</span>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-sm font-medium mb-2">Overall Engagement</p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Open Rate</span>
                <span className="font-medium">{totalOpenRate}%</span>
              </div>
              <Progress value={totalOpenRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Click Rate</span>
                <span className="font-medium">{totalClickRate}%</span>
              </div>
              <Progress value={totalClickRate} className="h-2" />
            </div>
          </div>
        </div>

        {/* Recent Emails */}
        {recentEmails && recentEmails.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recent Emails</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentEmails.slice(0, 5).map((email: { recipientName: string | null; recipientEmail: string; policyNumber: string | null; sentAt: Date | null; opened: boolean; clicked: boolean }, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${email.opened ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">
                        {email.recipientName || email.recipientEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {email.sentAt ? format(new Date(email.sentAt), 'MMM d, h:mm a') : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {email.opened && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Opened
                      </Badge>
                    )}
                    {email.clicked && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Clicked
                      </Badge>
                    )}
                    {!email.opened && !email.clicked && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                        Sent
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {total.sent === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No anniversary emails sent yet</p>
            <p className="text-xs">Emails are automatically sent on policy anniversaries</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
 const [notificationSent, setNotificationSent] = useState(false);
  const [showNetLicensedModal, setShowNetLicensedModal] = useState(false);
  const [showMissingLicensesModal, setShowMissingLicensesModal] = useState(false);
  const [showNoRecurringModal, setShowNoRecurringModal] = useState(false);
  const [showPendingIssuedModal, setShowPendingIssuedModal] = useState(false);
  const [showInUnderwritingModal, setShowInUnderwritingModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const { data: stats, isLoading, refetch, isRefetching } = trpc.dashboard.stats.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // Fetch face amount and families protected metrics
  const { data: metrics } = trpc.dashboard.metrics.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  // Chargeback notification mutation
  const sendNotification = trpc.dashboard.sendChargebackNotification.useMutation({
    onMutate: () => setNotificationStatus('sending'),
    onSuccess: (data) => {
      setNotificationStatus('success');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    },
    onError: () => {
      setNotificationStatus('error');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    },
  });

  // Auto sync status query
  const { data: autoSyncData, refetch: refetchSyncStatus } = trpc.dashboard.autoSyncStatus.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Trigger sync mutation
  const triggerSync = trpc.dashboard.triggerSync.useMutation({
    onMutate: () => setSyncStatus('syncing'),
    onSuccess: (data) => {
      setSyncStatus('success');
      refetchSyncStatus();
      setTimeout(() => setSyncStatus('idle'), 5000);
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <MetricCard
          title="Active Associates"
          value={metrics?.activeAssociates || 91}
          subtitle="Team members in your organization"
          icon={Users}
          trend="up"
          trendValue="MyWFG"
          onClick={navigateToAgents}
        />
        <MetricCard
          title="Licensed Agents"
          value={metrics?.licensedAgents || 27}
          subtitle="Life licensed associates"
          icon={Award}
          variant="success"
          trend="up"
          trendValue={`${Math.round(((metrics?.licensedAgents || 27) / (metrics?.activeAssociates || 91)) * 100)}% licensed`}
        />
        <MetricCard
          title="Net Licensed"
          value={metrics?.netLicensedData?.totalNetLicensed || netLicensed}
          subtitle="$1,000+ milestone achieved (TA/A only)"
          icon={Target}
          variant="success"
          trend={(metrics?.netLicensedData?.totalNetLicensed || netLicensed) > 0 ? "up" : "neutral"}
          trendValue={conversionRate > 0 ? `${conversionRate}% rate` : ""}
          onClick={() => setShowNetLicensedModal(true)}
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

      {/* Projected Income Card - Based on 65% SMD Commission Rate */}
      {metrics?.projectedIncome && (
        <Card className="card-hover border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Projected Income
                </CardTitle>
                <CardDescription>Based on 65% SMD commission rate (Target Premium × 125% × 65%)</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-green-600 border-green-500/50">
                {metrics.projectedIncome.pendingPoliciesCount + metrics.projectedIncome.inforcePoliciesCount} policies
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Projected Income */}
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Total Projected</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.projectedIncome.totalProjected >= 1000 
                    ? (metrics.projectedIncome.totalProjected / 1000).toFixed(1) + 'K'
                    : metrics.projectedIncome.totalProjected.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Combined pending + inforce</p>
              </div>
              
              {/* From Pending Policies (Issued) */}
              <div 
                className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors"
                onClick={() => setShowPendingIssuedModal(true)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">Pending (Issued)</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  ${metrics.projectedIncome.breakdown.pendingIssued >= 1000 
                    ? (metrics.projectedIncome.breakdown.pendingIssued / 1000).toFixed(1) + 'K'
                    : metrics.projectedIncome.breakdown.pendingIssued.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Click to view policies</p>
              </div>
              
              {/* From Pending Policies (Underwriting) */}
              <div 
                className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-colors"
                onClick={() => setShowInUnderwritingModal(true)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">In Underwriting</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  ${metrics.projectedIncome.breakdown.pendingUnderwriting >= 1000 
                    ? (metrics.projectedIncome.breakdown.pendingUnderwriting / 1000).toFixed(1) + 'K'
                    : metrics.projectedIncome.breakdown.pendingUnderwriting.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Click to view policies</p>
              </div>
              
              {/* From Inforce Policies */}
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Inforce Active</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  ${metrics.projectedIncome.breakdown.inforceActive >= 1000 
                    ? (metrics.projectedIncome.breakdown.inforceActive / 1000).toFixed(1) + 'K'
                    : metrics.projectedIncome.breakdown.inforceActive.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Calculated commission</p>
              </div>
            </div>
            
            {/* Commission Formula Explanation */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">
                <strong>Formula:</strong> Target Premium × 125% (Transamerica constant) × 65% (SMD agent level) = Commission.
                Pending policies in underwriting are weighted at 70% probability.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Tracking Chart - Projected vs Actual Over Time */}
      <IncomeTrackingChart />

      {/* Income Discrepancy Analysis - Variance Chart */}
      <IncomeDiscrepancyChart />

      {/* Policy Anniversaries Summary */}
      <PolicyAnniversariesSummary />

      {/* Email Tracking Widget */}
      <EmailTrackingWidget />

      {/* Compliance & Platform Fee Tracking */}
      <Card className="card-hover border-amber-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Compliance & Platform Fee Status
              </CardTitle>
              <CardDescription>Pending items requiring attention from MyWFG reports</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-amber-600 border-amber-500/50">
              {(metrics?.complianceFirstNotice || 3) + (metrics?.complianceFinalNotice || 3)} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Missing Licenses */}
            <div 
              className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors"
              onClick={() => setShowMissingLicensesModal(true)}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileWarning className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Missing Licenses</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{metrics?.missingLicenses || 11}</p>
              <p className="text-xs text-muted-foreground">Click to view agents</p>
            </div>
            
            {/* Not Enrolled in Recurring */}
            <div 
              className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 cursor-pointer hover:bg-purple-500/10 transition-colors"
              onClick={() => setShowNoRecurringModal(true)}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">No Recurring</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{metrics?.notEnrolledRecurring || 15}</p>
              <p className="text-xs text-muted-foreground">Click to view policies</p>
            </div>
            
            {/* First Notice */}
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600">First Notice</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{metrics?.complianceFirstNotice || 3}</p>
              <p className="text-xs text-muted-foreground">Platform fee warning</p>
            </div>
            
            {/* Final Notice - Commissions On Hold */}
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Final Notice</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{metrics?.complianceFinalNotice || 3}</p>
              <p className="text-xs text-muted-foreground">Commissions on hold</p>
            </div>
          </div>
          
          {/* Agents with Commissions On Hold - Detailed List */}
          {metrics?.commissionsOnHold && metrics.commissionsOnHold.length > 0 && (
            <div className="mt-6 pt-4 border-t border-red-500/20">
              <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Agents with Commissions On Hold
              </h4>
              <div className="space-y-2">
                {metrics.commissionsOnHold.map((agent: { agentCode: string; name: string; balance: number; email: string }) => (
                  <div key={agent.agentCode} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">{agent.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.agentCode} • {agent.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">${agent.balance.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Balance owed</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Agents with First Notice Warning */}
          {metrics?.firstNoticeAgents && metrics.firstNoticeAgents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Agents with First Notice Warning
              </h4>
              <div className="space-y-2">
                {metrics.firstNoticeAgents.map((agent: { agentCode: string; name: string; balance: number; email: string }) => (
                  <div key={agent.agentCode} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-600">{agent.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.agentCode} • {agent.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">${agent.balance.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Balance owed</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transamerica Chargeback Alerts */}
      {metrics?.transamericaAlerts && (
        <Card className="card-hover border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Transamerica Chargeback Alerts
                </CardTitle>
                <CardDescription>Critical policy alerts requiring immediate attention</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="font-mono">
                  {metrics.transamericaAlerts.reversedPremiumPayments?.length || 0} chargebacks
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Last sync: {metrics.transamericaAlerts.lastSyncDate ? format(new Date(metrics.transamericaAlerts.lastSyncDate), 'MMM d, h:mm a') : 'Never'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reversed Premium Payments */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Reversed Premium Payments ({metrics.transamericaAlerts.reversedPremiumPayments?.length || 0})
                </h4>
                <div className="space-y-2">
                  {metrics.transamericaAlerts.reversedPremiumPayments?.map((alert: { policyNumber: string; ownerName: string; alertDate: string; alertType: string }) => (
                    <div key={`${alert.policyNumber}-${alert.alertDate}`} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.ownerName}</p>
                          <p className="text-xs text-muted-foreground">Policy #{alert.policyNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-red-600">Reversed</p>
                        <p className="text-xs text-muted-foreground">{alert.alertDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* EFT Removals */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  Removed from EFT ({metrics.transamericaAlerts.eftRemovals?.length || 0})
                </h4>
                <div className="space-y-2">
                  {metrics.transamericaAlerts.eftRemovals?.map((alert: { policyNumber: string; ownerName: string; alertDate: string; alertType: string }) => (
                    <div key={`${alert.policyNumber}-eft-${alert.alertDate}`} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <FileWarning className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.ownerName}</p>
                          <p className="text-xs text-muted-foreground">Policy #{alert.policyNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-orange-600">EFT Removed</p>
                        <p className="text-xs text-muted-foreground">{alert.alertDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Action Required Notice */}
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <strong>Action Required:</strong> Contact these clients immediately to prevent policy lapse and commission chargebacks.
              </p>
            </div>
            
            {/* Send Notification Button */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Click to send a notification alert about these chargebacks
              </p>
              <Button
                variant={notificationStatus === 'success' ? 'outline' : 'destructive'}
                size="sm"
                onClick={() => sendNotification.mutate()}
                disabled={notificationStatus === 'sending'}
                className="gap-2"
              >
                {notificationStatus === 'sending' ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</>
                ) : notificationStatus === 'success' ? (
                  <><CheckCircle className="h-4 w-4 text-green-600" /> Notification Sent!</>
                ) : notificationStatus === 'error' ? (
                  <><AlertTriangle className="h-4 w-4" /> Failed - Try Again</>
                ) : (
                  <><Bell className="h-4 w-4" /> Send Alert Notification</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automated Sync Controls */}
      <Card className="card-hover border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                Automated Data Sync
              </CardTitle>
              <CardDescription>Sync data from MyWFG and Transamerica automatically</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {autoSyncData?.lastSyncTime && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(new Date(autoSyncData.lastSyncTime), { addSuffix: true })}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connection Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Connection Status
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${autoSyncData?.mywfgEmailConfigured && autoSyncData?.mywfgLoginConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">MyWFG</span>
                  </div>
                  <Badge variant={autoSyncData?.mywfgEmailConfigured && autoSyncData?.mywfgLoginConfigured ? 'default' : 'destructive'} className="text-xs">
                    {autoSyncData?.mywfgEmailConfigured && autoSyncData?.mywfgLoginConfigured ? 'Connected' : 'Not Configured'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${autoSyncData?.transamericaEmailConfigured && autoSyncData?.transamericaLoginConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">Transamerica</span>
                  </div>
                  <Badge variant={autoSyncData?.transamericaEmailConfigured && autoSyncData?.transamericaLoginConfigured ? 'default' : 'destructive'} className="text-xs">
                    {autoSyncData?.transamericaEmailConfigured && autoSyncData?.transamericaLoginConfigured ? 'Connected' : 'Not Configured'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Sync Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Sync Actions
              </h4>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Trigger a manual sync to pull the latest data from MyWFG and Transamerica. You'll receive email alerts during the process.
                </p>
                <Button
                  variant={syncStatus === 'success' ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => triggerSync.mutate()}
                  disabled={syncStatus === 'syncing'}
                  className="gap-2 w-full"
                >
                  {syncStatus === 'syncing' ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Syncing Data...</>
                  ) : syncStatus === 'success' ? (
                    <><CheckCircle className="h-4 w-4 text-green-600" /> Sync Complete!</>
                  ) : syncStatus === 'error' ? (
                    <><AlertTriangle className="h-4 w-4" /> Sync Failed - Try Again</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Trigger Manual Sync</>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Info Notice */}
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span><strong>Note:</strong> Automated sync uses your Gmail to read OTP codes. You'll receive email alerts for each login attempt and OTP fetch.</span>
            </p>
          </div>
        </CardContent>
      </Card>

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

      {/* Weekly Sync Summary */}
      <WeeklySyncSummary />

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

      {/* Net Licensed Detail Modal */}
      <Dialog open={showNetLicensedModal} onOpenChange={setShowNetLicensedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              Net Licensed Agents
            </DialogTitle>
            <DialogDescription>
              Agents who have earned $1,000+ in total cash flow (Training Associates and Associates only)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Net Licensed Agents */}
            <div>
              <h3 className="text-lg font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Net Licensed ({metrics?.netLicensedData?.netLicensedAgents?.length || 0})
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-emerald-50 dark:bg-emerald-950/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Agent Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Total Cash Flow</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Upline SMD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {metrics?.netLicensedData?.netLicensedAgents?.map((agent: any, index: number) => (
                      <tr key={agent.code} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            #{agent.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{agent.code}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary">{agent.titleLevel}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">
                          ${agent.totalCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{agent.uplineSMD}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Not Yet Net Licensed */}
            <div>
              <h3 className="text-lg font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Toward Net Licensed ({metrics?.netLicensedData?.notNetLicensedAgents?.length || 0})
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-amber-50 dark:bg-amber-950/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Agent Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Current Cash Flow</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Amount Needed</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {metrics?.netLicensedData?.notNetLicensedAgents?.map((agent: any) => {
                      const progress = (agent.totalCashFlow / 1000) * 100;
                      return (
                        <tr key={agent.code} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{agent.code}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="secondary">{agent.titleLevel}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            ${agent.totalCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-amber-600 font-medium">
                            ${agent.amountToNetLicensed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2 w-20" />
                              <span className="text-xs text-muted-foreground">{progress.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Info */}
            <div className="text-sm text-muted-foreground border-t pt-4">
              <p><strong>Report Period:</strong> {metrics?.netLicensedData?.reportPeriod || 'N/A'}</p>
              <p><strong>Last Sync:</strong> {metrics?.netLicensedData?.lastSyncDate ? format(new Date(metrics.netLicensedData.lastSyncDate), 'PPpp') : 'N/A'}</p>
              <p className="mt-2 text-xs">
                <strong>Note:</strong> Net Licensed status only applies to Training Associates (TA) and Associates (A). 
                Senior Associates (SA) and above are excluded from this metric.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Missing Licenses Modal */}
      <Dialog open={showMissingLicensesModal} onOpenChange={setShowMissingLicensesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-blue-600" />
              Missing Licenses
            </DialogTitle>
            <DialogDescription>
              Agents who are not yet licensed (in Recruitment or Exam Prep stages)
            </DialogDescription>
          </DialogHeader>
          <MissingLicensesContent />
        </DialogContent>
      </Dialog>

      {/* No Recurring Modal */}
      <Dialog open={showNoRecurringModal} onOpenChange={setShowNoRecurringModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Policies Without Recurring Enrollment
            </DialogTitle>
            <DialogDescription>
              Policies with Annual or Flexible payment frequency that could benefit from recurring enrollment
            </DialogDescription>
          </DialogHeader>
          <NoRecurringContent />
        </DialogContent>
      </Dialog>

      {/* Pending Issued Modal */}
      <Dialog open={showPendingIssuedModal} onOpenChange={setShowPendingIssuedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Pending Policies - Issued
            </DialogTitle>
            <DialogDescription>
              Policies that have been issued and are ready for delivery
            </DialogDescription>
          </DialogHeader>
          <PendingIssuedContent />
        </DialogContent>
      </Dialog>

      {/* In Underwriting Modal */}
      <Dialog open={showInUnderwritingModal} onOpenChange={setShowInUnderwritingModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Policies - In Underwriting
            </DialogTitle>
            <DialogDescription>
              Policies currently being reviewed by underwriting (70% probability factor applied)
            </DialogDescription>
          </DialogHeader>
          <InUnderwritingContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Modal content components
function MissingLicensesContent() {
  const { data, isLoading } = trpc.dashboard.getMissingLicenses.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No unlicensed agents found</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Stage</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Exam Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((agent: any) => (
            <tr key={agent.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{agent.firstName} {agent.lastName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.email || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.phone || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={agent.currentStage === 'EXAM_PREP' ? 'secondary' : 'outline'}>
                  {agent.currentStage?.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.examDate || 'Not scheduled'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoRecurringContent() {
  const { data, isLoading } = trpc.dashboard.getNoRecurring.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">All policies have recurring enrollment</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Premium</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.ownerName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgentName || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.productType || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.premium || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="outline">{policy.premiumFrequency || 'Unknown'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingIssuedContent() {
  const { data, isLoading } = trpc.dashboard.getPendingIssued.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No issued pending policies</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Insured</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Face Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.insuredName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgent || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.product || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.faceAmount || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="default" className="bg-blue-500">{policy.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InUnderwritingContent() {
  const { data, isLoading } = trpc.dashboard.getInUnderwriting.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No policies in underwriting</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Insured</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Face Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.insuredName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgent || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.product || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.faceAmount || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">{policy.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
