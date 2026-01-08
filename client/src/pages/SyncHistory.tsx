import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Users,
  Phone,
  AlertTriangle,
  Timer,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function SyncHistory() {
  // Filters state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const pageSize = 20;

  // Build query input based on filters
  const queryInput = useMemo(() => ({
    page,
    pageSize,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    syncType: syncTypeFilter !== "all" ? syncTypeFilter as any : undefined,
    scheduledTime: timeFilter !== "all" ? timeFilter : undefined,
  }), [page, statusFilter, syncTypeFilter, timeFilter]);

  const { data: paginatedLogs, isLoading: logsLoading } = trpc.syncLogs.getPaginated.useQuery(queryInput);
  const { data: summary, isLoading: summaryLoading } = trpc.syncLogs.getWeeklySummary.useQuery();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Partial</Badge>;
      case "RUNNING":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSyncTypeFilter("all");
    setTimeFilter("all");
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || syncTypeFilter !== "all" || timeFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Sync History</h1>
          <p className="text-muted-foreground">Monitor scheduled MyWBH sync tasks (3:30 PM & 6:30 PM daily)</p>
        </div>

        {/* Weekly Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Total Syncs (7 days)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalSyncs || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.successfulSyncs || 0} successful, {summary?.failedSyncs || 0} failed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Agents Processed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalAgentsProcessed || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.totalAgentsUpdated || 0} updated
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contacts Updated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalContactsUpdated || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Emails & phone numbers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Avg Duration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(summary?.averageDuration || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.totalErrors || 0} total errors
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sync by Time Summary */}
        {summary && summary.syncsByTime && (
          <div className="grid gap-4 md:grid-cols-2">
            {summary.syncsByTime.map((timeSlot) => (
              <Card key={timeSlot.time}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{timeSlot.time} Sync</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-lg font-semibold">{timeSlot.success}</span>
                      <span className="text-sm text-muted-foreground">successful</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-lg font-semibold">{timeSlot.failed}</span>
                      <span className="text-sm text-muted-foreground">failed</span>
                    </div>
                  </div>
                  {timeSlot.success + timeSlot.failed > 0 && (
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ 
                          width: `${(timeSlot.success / (timeSlot.success + timeSlot.failed)) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <CardDescription>Filter sync logs by status, type, or scheduled time</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="RUNNING">Running</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Sync Type</label>
                <Select value={syncTypeFilter} onValueChange={(v) => { setSyncTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FULL_SYNC">Full Sync</SelectItem>
                    <SelectItem value="DOWNLINE_STATUS">Downline Status</SelectItem>
                    <SelectItem value="CONTACT_INFO">Contact Info</SelectItem>
                    <SelectItem value="CASH_FLOW">Cash Flow</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Scheduled Time</label>
                <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All times" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Times</SelectItem>
                    <SelectItem value="3:30 PM">3:30 PM</SelectItem>
                    <SelectItem value="6:30 PM">6:30 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sync Logs</CardTitle>
                <CardDescription>
                  {paginatedLogs ? (
                    <>Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, paginatedLogs.total)} of {paginatedLogs.total} logs</>
                  ) : (
                    "Detailed history of all sync operations"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedLogs && paginatedLogs.logs.length > 0 ? (
              <>
                <div className="space-y-4">
                  {paginatedLogs.logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {log.status === "SUCCESS" && <CheckCircle2 className="w-8 h-8 text-green-500" />}
                        {log.status === "FAILED" && <XCircle className="w-8 h-8 text-red-500" />}
                        {log.status === "PARTIAL" && <AlertCircle className="w-8 h-8 text-yellow-500" />}
                        {log.status === "RUNNING" && <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />}
                        {log.status === "PENDING" && <Clock className="w-8 h-8 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.syncType.replace(/_/g, ' ')}</span>
                          {getStatusBadge(log.status)}
                          {log.scheduledTime && (
                            <Badge variant="outline">{log.scheduledTime}</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {log.startedAt && (
                            <span>
                              {format(new Date(log.startedAt), "MMM d, yyyy 'at' h:mm a")}
                              {" · "}
                              {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {log.summary && (
                          <p className="mt-2 text-sm">{log.summary}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          {log.agentsProcessed !== null && (
                            <span><Users className="w-3 h-3 inline mr-1" />{log.agentsProcessed} agents</span>
                          )}
                          {log.contactsUpdated !== null && (
                            <span><Phone className="w-3 h-3 inline mr-1" />{log.contactsUpdated} contacts</span>
                          )}
                          {log.durationSeconds !== null && (
                            <span><Timer className="w-3 h-3 inline mr-1" />{formatDuration(log.durationSeconds)}</span>
                          )}
                          {log.errorsCount !== null && log.errorsCount > 0 && (
                            <span className="text-red-500"><AlertTriangle className="w-3 h-3 inline mr-1" />{log.errorsCount} errors</span>
                          )}
                        </div>
                        {(() => {
                          const errors = log.errorMessages as string[] | null;
                          if (!errors || !Array.isArray(errors) || errors.length === 0) return null;
                          return (
                            <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-500">
                              {errors.slice(0, 3).map((err, i) => (
                                <div key={i}>{String(err)}</div>
                              ))}
                              {errors.length > 3 && (
                                <div>...and {errors.length - 3} more</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {paginatedLogs.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {paginatedLogs.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(paginatedLogs.totalPages, p + 1))}
                        disabled={page === paginatedLogs.totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sync logs found</p>
                <p className="text-sm">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "Sync tasks will appear here after they run"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
