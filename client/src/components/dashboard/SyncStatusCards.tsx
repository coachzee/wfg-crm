import { memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PlatformSyncInfo {
  lastSyncDate: string | Date | null;
  lastSyncStatus: string | null;
  lastSyncType: string | null;
  recordsProcessed: number;
  summary: string | null;
  recentSuccesses: number;
  recentFailures: number;
}

function SyncCard({
  platform,
  label,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientTo,
  borderColor,
  data,
  isLoading,
}: {
  platform: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  data: PlatformSyncInfo | null | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className={`card-hover border bg-gradient-to-br ${gradientFrom} ${gradientTo} ${borderColor}`}>
        <CardContent className="p-6">
          <div className="h-24 shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasSync = !!data?.lastSyncDate;
  const isSuccess = data?.lastSyncStatus === "SUCCESS";
  const isFailed = data?.lastSyncStatus === "FAILED";
  const isPartial = data?.lastSyncStatus === "PARTIAL";
  const isRunning = data?.lastSyncStatus === "RUNNING";

  const statusIcon = isSuccess ? (
    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
  ) : isFailed ? (
    <XCircle className="h-3.5 w-3.5 text-red-500" />
  ) : isPartial ? (
    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
  ) : isRunning ? (
    <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
  ) : (
    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
  );

  const statusLabel = isSuccess
    ? "Success"
    : isFailed
    ? "Failed"
    : isPartial
    ? "Partial"
    : isRunning
    ? "Running"
    : "Never";

  const statusColor = isSuccess
    ? "text-emerald-600"
    : isFailed
    ? "text-red-600"
    : isPartial
    ? "text-amber-600"
    : isRunning
    ? "text-blue-600"
    : "text-muted-foreground";

  const timeAgo = hasSync
    ? formatDistanceToNow(new Date(data.lastSyncDate!), { addSuffix: true })
    : "Never";

  const syncTypeLabel = data?.lastSyncType
    ? data.lastSyncType
        .replace(/_/g, " ")
        .replace(/TRANSAMERICA /g, "")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const totalRecent = (data?.recentSuccesses || 0) + (data?.recentFailures || 0);
  const successRate =
    totalRecent > 0
      ? Math.round(((data?.recentSuccesses || 0) / totalRecent) * 100)
      : null;

  return (
    <Card
      className={`card-hover border bg-gradient-to-br ${gradientFrom} ${gradientTo} ${borderColor}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold tracking-tight">{timeAgo}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}
                      className="gap-1 text-xs cursor-default"
                    >
                      {statusIcon}
                      {statusLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px]">
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">{platform} Sync Details</p>
                      {syncTypeLabel && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{syncTypeLabel}</span>
                        </div>
                      )}
                      {data?.recordsProcessed !== undefined && data.recordsProcessed > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium">{data.recordsProcessed}</span>
                        </div>
                      )}
                      {data?.summary && (
                        <div className="border-t pt-1">
                          <span className="text-muted-foreground">{data.summary}</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {successRate !== null && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`text-xs font-medium ${
                          successRate >= 80
                            ? "text-emerald-600"
                            : successRate >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {successRate}% (7d)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">Last 7 Days</p>
                        <p className="text-emerald-500">{data?.recentSuccesses || 0} successful</p>
                        <p className="text-red-500">{data?.recentFailures || 0} failed</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const SyncStatusCards = memo(function SyncStatusCards() {
  const { data: platformSync, isLoading } = trpc.dashboard.platformSyncStatus.useQuery(
    undefined,
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <>
      <SyncCard
        platform="MyWFG"
        label="MyWFG Sync"
        icon={RefreshCw}
        iconColor="bg-primary/10 text-primary"
        gradientFrom="from-primary/5"
        gradientTo="to-primary/10"
        borderColor="border-primary/20"
        data={platformSync?.mywfg ?? null}
        isLoading={isLoading}
      />
      <SyncCard
        platform="Transamerica"
        label="Transamerica Sync"
        icon={Shield}
        iconColor="bg-blue-500/10 text-blue-600"
        gradientFrom="from-blue-500/5"
        gradientTo="to-blue-500/10"
        borderColor="border-blue-500/20"
        data={platformSync?.transamerica ?? null}
        isLoading={isLoading}
      />
    </>
  );
});

export default SyncStatusCards;
