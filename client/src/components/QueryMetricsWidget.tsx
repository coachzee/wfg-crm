import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, AlertTriangle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

export function QueryMetricsWidget() {
  const { data: metrics, isLoading, refetch, isRefetching } = trpc.dashboard.getQueryMetrics.useQuery(
    undefined,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const { stats, slowQueries, recentQueries } = metrics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>
              Real-time query metrics and performance monitoring
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Total Queries
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalQueries.toLocaleString()}</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Avg Duration
            </div>
            <div className="text-2xl font-bold mt-1">{stats.avgDuration.toFixed(1)}ms</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Slow Queries
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats.slowQueries}
              {stats.slowQueries > 0 && (
                <span className="text-sm font-normal text-yellow-500 ml-2">
                  ({((stats.slowQueries / stats.totalQueries) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Failed Queries
            </div>
            <div className="text-2xl font-bold mt-1">
              {stats.failedQueries}
              {stats.failedQueries > 0 && (
                <span className="text-sm font-normal text-red-500 ml-2">
                  ({((stats.failedQueries / stats.totalQueries) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Query Types Breakdown */}
        {Object.keys(stats.queriesByType).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Query Types</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.queriesByType).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count.toLocaleString()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Slow Queries */}
        {slowQueries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Recent Slow Queries ({'>'}1000ms)
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {slowQueries.slice(0, 5).map((query, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {query.duration}ms
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(query.timestamp), "MMM d, h:mm:ss a")}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground truncate">
                    {query.query}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Queries */}
        {recentQueries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Queries</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentQueries.slice(0, 10).map((query, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0"
                >
                  <span className="font-mono text-muted-foreground truncate max-w-[60%]">
                    {query.query}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={query.success ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {query.duration}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalQueries === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No query metrics recorded yet.</p>
            <p className="text-sm">Metrics will appear as database queries are executed.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
