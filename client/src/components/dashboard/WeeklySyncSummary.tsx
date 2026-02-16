import { memo, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { SectionExport } from "./SectionExport";
import type { ExportColumn } from "./SectionExport";

export const WeeklySyncSummary = memo(function WeeklySyncSummary() {
  const { data: summary, isLoading } = trpc.syncLogs.getWeeklySummary.useQuery();
  const [, setLocation] = useLocation();

  const exportColumns: ExportColumn[] = useMemo(() => [
    { key: "time", header: "Sync Time" },
    { key: "success", header: "Successful" },
    { key: "failed", header: "Failed" },
    { key: "total", header: "Total", format: (v: number) => String(v) },
    { key: "successRate", header: "Success Rate", format: (v: number) => `${v}%` },
  ], []);

  const exportData = useMemo(() => {
    if (!summary?.syncsByTime) return [];
    return summary.syncsByTime.map((ts: any) => ({
      time: ts.time,
      success: ts.success,
      failed: ts.failed,
      total: ts.success + ts.failed,
      successRate: ts.success + ts.failed > 0 ? Math.round((ts.success / (ts.success + ts.failed)) * 100) : 0,
    }));
  }, [summary?.syncsByTime]);

  const exportSummary = useMemo(() => {
    if (!summary) return [];
    return [{
      label: "TOTAL",
      values: {
        success: summary.successfulSyncs,
        failed: summary.failedSyncs,
        total: summary.totalSyncs,
        successRate: summary.totalSyncs > 0 ? `${Math.round((summary.successfulSyncs / summary.totalSyncs) * 100)}%` : "0%",
      },
    }];
  }, [summary]);

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
          <div className="flex items-center gap-2">
            <SectionExport
              title="Weekly Sync Summary"
              subtitle={`Automated MyWFG sync status — ${summary?.totalAgentsProcessed || 0} agents processed, ${summary?.totalContactsUpdated || 0} contacts updated`}
              columns={exportColumns}
              data={exportData}
              summaryRows={exportSummary}
              accentColor="#6366f1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/sync-history')}
              className="gap-2"
            >
              View Full History
            </Button>
          </div>
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
