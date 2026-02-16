import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Printer, Download, FileText, TrendingUp, TrendingDown, Minus,
  Users, Shield, DollarSign, BarChart3, CalendarDays, CheckCircle
} from "lucide-react";

type QuarterOption = { label: string; quarter: number; year: number; startMonth: number; endMonth: number };

function getQuarterOptions(): QuarterOption[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const options: QuarterOption[] = [];

  // Generate last 8 quarters
  let year = currentYear;
  let quarter = Math.ceil(currentMonth / 3);

  for (let i = 0; i < 8; i++) {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    options.push({
      label: `Q${quarter} ${year}`,
      quarter,
      year,
      startMonth,
      endMonth,
    });
    quarter--;
    if (quarter === 0) {
      quarter = 4;
      year--;
    }
  }
  return options;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function TrendBadge({ changePercent }: { changePercent: number }) {
  if (changePercent > 0) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <TrendingUp className="h-3 w-3" />
        +{changePercent}%
      </Badge>
    );
  }
  if (changePercent < 0) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
        <TrendingDown className="h-3 w-3" />
        {changePercent}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 gap-1">
      <Minus className="h-3 w-3" />
      0%
    </Badge>
  );
}

export default function QuarterlyReport() {
  const quarterOptions = useMemo(() => getQuarterOptions(), []);
  const [selectedQuarter, setSelectedQuarter] = useState(quarterOptions[0].label);
  const reportRef = useRef<HTMLDivElement>(null);

  const selected = quarterOptions.find(q => q.label === selectedQuarter) || quarterOptions[0];

  // Fetch all data
  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: mom, isLoading: momLoading } = trpc.dashboard.monthOverMonth.useQuery();
  const { data: cashFlow, isLoading: cashFlowLoading } = trpc.dashboard.monthlyCashFlow.useQuery();
  const { data: anniversarySummary } = trpc.dashboard.getAnniversarySummary.useQuery();
  const { data: syncStatus } = trpc.dashboard.syncStatus.useQuery();

  const isLoading = metricsLoading || statsLoading || momLoading || cashFlowLoading;

  // Filter cash flow data for selected quarter
  const quarterCashFlow = useMemo(() => {
    if (!cashFlow) return [];
    return cashFlow.filter(r => r.year === selected.year && r.month >= selected.startMonth && r.month <= selected.endMonth);
  }, [cashFlow, selected]);

  const quarterCashFlowTotal = useMemo(() => {
    return quarterCashFlow.reduce((sum, r) => sum + r.superTeamCashFlow, 0);
  }, [quarterCashFlow]);

  const quarterPersonalCashFlowTotal = useMemo(() => {
    return quarterCashFlow.reduce((sum, r) => sum + r.personalCashFlow, 0);
  }, [quarterCashFlow]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Use print dialog for PDF export
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ["Quarterly Performance Report", selected.label],
      ["Generated", new Date().toLocaleDateString()],
      [],
      ["Metric", "Value", "MoM Change"],
      ["Active Associates", metrics?.activeAssociates?.toString() || "0", mom ? `${mom.activeAssociates.changePercent}%` : "N/A"],
      ["Licensed Agents", metrics?.licensedAgents?.toString() || "0", mom ? `${mom.licensedAgents.changePercent}%` : "N/A"],
      ["Families Protected", metrics?.familiesProtected?.toString() || "0", mom ? `${mom.familiesProtected.changePercent}%` : "N/A"],
      ["Total Policies", metrics?.totalPolicies?.toString() || "0", mom ? `${mom.totalPolicies.changePercent}%` : "N/A"],
      ["Total Face Amount", formatCurrency(metrics?.totalFaceAmount || 0), mom ? `${mom.totalFaceAmount.changePercent}%` : "N/A"],
      [],
      ["Quarter Cash Flow Summary"],
      ["Month", "Super Team Cash Flow", "Personal Cash Flow"],
      ...quarterCashFlow.map(r => [r.monthYear, formatCurrency(r.superTeamCashFlow), formatCurrency(r.personalCashFlow)]),
      ["Total", formatCurrency(quarterCashFlowTotal), formatCurrency(quarterPersonalCashFlowTotal)],
      [],
      ["Task Summary"],
      ["Total Tasks", stats?.taskStats?.total?.toString() || "0"],
      ["Completed", stats?.taskStats?.completed?.toString() || "0"],
      ["Pending", stats?.taskStats?.pending?.toString() || "0"],
      ["Overdue", stats?.taskStats?.overdue?.toString() || "0"],
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell || ""}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quarterly-report-${selected.label.replace(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - hidden in print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quarterly Performance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive summary of team performance and business metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quarterOptions.map(q => (
                <SelectItem key={q.label} value={q.label}>{q.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block print:mb-8">
        <div className="flex items-center justify-between border-b-2 border-primary pb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Quarterly Performance Report</h1>
            <p className="text-lg text-muted-foreground mt-1">Wealth Builders Haven — {selected.label}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p>Report Period: {selected.label}</p>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Section 1: Key Metrics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Key Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Active Associates
                  </div>
                  {mom && <TrendBadge changePercent={mom.activeAssociates.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatNumber(metrics?.activeAssociates || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Licensed Agents
                  </div>
                  {mom && <TrendBadge changePercent={mom.licensedAgents.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatNumber(metrics?.licensedAgents || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Families Protected
                  </div>
                  {mom && <TrendBadge changePercent={mom.familiesProtected.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatNumber(metrics?.familiesProtected || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Total Policies
                  </div>
                  {mom && <TrendBadge changePercent={mom.totalPolicies.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatNumber(metrics?.totalPolicies || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total Face Amount
                  </div>
                  {mom && <TrendBadge changePercent={mom.totalFaceAmount.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatCurrency(metrics?.totalFaceAmount || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Super Team Cash Flow
                  </div>
                  {mom && <TrendBadge changePercent={mom.superTeamCashFlow.changePercent} />}
                </div>
                <p className="text-3xl font-bold mt-2">{formatCurrency(metrics?.superTeamCashFlow || 0)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 2: Quarter Cash Flow Breakdown */}
        <div className="print:break-before-page">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold">Cash Flow — {selected.label}</h2>
          </div>
          {quarterCashFlow.length > 0 ? (
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Month</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Super Team</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Personal</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterCashFlow.map((r, i) => (
                      <tr key={r.monthYear} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="p-4 text-sm font-medium">{r.monthYear}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(r.superTeamCashFlow)}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(r.personalCashFlow)}</td>
                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(r.superTeamCashFlow + r.personalCashFlow)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="p-4 text-sm font-bold">Quarter Total</td>
                      <td className="p-4 text-sm text-right font-bold">{formatCurrency(quarterCashFlowTotal)}</td>
                      <td className="p-4 text-sm text-right font-bold">{formatCurrency(quarterPersonalCashFlowTotal)}</td>
                      <td className="p-4 text-sm text-right font-bold text-primary">{formatCurrency(quarterCashFlowTotal + quarterPersonalCashFlowTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No cash flow data available for {selected.label}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Section 3: Agent Pipeline */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-700" />
            </div>
            <h2 className="text-lg font-semibold">Agent Pipeline</h2>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stage</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Count</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.agentsByStage && Object.entries(stats.agentsByStage)
                    .filter(([_, count]) => count > 0)
                    .map(([stage, count], i) => (
                      <tr key={stage} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="p-4 text-sm font-medium">
                          {stage.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="p-4 text-sm text-right">{count}</td>
                        <td className="p-4 text-sm text-right text-muted-foreground">
                          {stats.totalAgents > 0 ? Math.round((count / stats.totalAgents) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="p-4 text-sm font-bold">Total Agents</td>
                    <td className="p-4 text-sm text-right font-bold">{stats?.totalAgents || 0}</td>
                    <td className="p-4 text-sm text-right font-bold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Task Summary */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-amber-700" />
            </div>
            <h2 className="text-lg font-semibold">Task Summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold mt-1">{stats?.taskStats?.total || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{stats?.taskStats?.completed || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{stats?.taskStats?.pending || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats?.taskStats?.overdue || 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 5: Policy Anniversaries */}
        {anniversarySummary && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-purple-700" />
              </div>
              <h2 className="text-lg font-semibold">Policy Anniversary Summary</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold mt-1">{anniversarySummary.thisWeek || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Next 60 Days</p>
                  <p className="text-2xl font-bold mt-1">{anniversarySummary.next60Days || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Next 90 Days</p>
                  <p className="text-2xl font-bold mt-1">{anniversarySummary.next90Days || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold mt-1">{anniversarySummary.thisMonth || 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Section 6: Sync Status */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold">Data Sync Status</h2>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>{" "}
                  <span className="font-medium">
                    {stats?.lastSyncDate ? new Date(stats.lastSyncDate).toLocaleString() : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Payment Date:</span>{" "}
                  <span className="font-medium">{syncStatus?.paymentCycle?.nextPaymentDate ? new Date(syncStatus.paymentCycle.nextPaymentDate).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block print:mt-12 border-t pt-4 text-sm text-muted-foreground text-center">
          <p>Wealth Builders Haven — Confidential Performance Report</p>
          <p>Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
    </div>
  );
}
