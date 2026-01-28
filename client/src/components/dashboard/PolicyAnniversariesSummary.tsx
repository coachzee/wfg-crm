import { memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useLocation } from "wouter";

export const PolicyAnniversariesSummary = memo(function PolicyAnniversariesSummary() {
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
