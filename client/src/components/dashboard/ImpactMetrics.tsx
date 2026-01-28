import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Heart, DollarSign } from "lucide-react";

interface ImpactMetricsProps {
  totalFaceAmount: number;
  familiesProtected: number;
  superTeamCashFlow: number;
}

export const ImpactMetrics = memo(function ImpactMetrics({ 
  totalFaceAmount, 
  familiesProtected, 
  superTeamCashFlow 
}: ImpactMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="card-hover border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Face Amount</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-emerald-600">
                  ${(totalFaceAmount / 1000000).toFixed(2)}M
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
                  {familiesProtected}
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
                  ${(superTeamCashFlow / 1000).toFixed(1)}K
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
  );
});
