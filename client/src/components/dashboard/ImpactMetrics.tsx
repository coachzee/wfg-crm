import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Heart, DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MoMData } from "./MetricCard";

interface ImpactMetricsProps {
  totalFaceAmount: number;
  familiesProtected: number;
  superTeamCashFlow: number;
  mom?: {
    totalFaceAmount?: MoMData;
    familiesProtected?: MoMData;
    superTeamCashFlow?: MoMData;
  };
}

function MoMBadge({ data, label, formatValue }: { data: MoMData; label: string; formatValue?: (v: number) => string }) {
  const trend = data.changePercent > 0 ? "up" : data.changePercent < 0 ? "down" : "neutral";
  const color = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";
  const bgColor = trend === "up" ? "bg-emerald-500/10" : trend === "down" ? "bg-red-500/10" : "bg-muted/50";
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${bgColor} ${color} cursor-default mt-1`}>
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {data.changePercent > 0 ? "+" : ""}
              {data.changePercent}% MoM
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold">{label}</p>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">This month:</span>
              <span className="font-medium">{fmt(data.current)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Last month:</span>
              <span className="font-medium">{fmt(data.previous)}</span>
            </div>
            <div className="border-t pt-1 flex justify-between gap-4">
              <span className="text-muted-foreground">Change:</span>
              <span className={`font-medium ${color}`}>
                {data.change > 0 ? "+" : ""}{fmt(data.change)}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ImpactMetrics = memo(function ImpactMetrics({ 
  totalFaceAmount, 
  familiesProtected, 
  superTeamCashFlow,
  mom,
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
              {mom?.totalFaceAmount && (
                <MoMBadge 
                  data={mom.totalFaceAmount} 
                  label="Face Amount MoM"
                  formatValue={(v) => `$${(Math.abs(v) / 1000000).toFixed(2)}M`}
                />
              )}
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
              {mom?.familiesProtected && (
                <MoMBadge 
                  data={mom.familiesProtected} 
                  label="Families Protected MoM"
                />
              )}
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
              {mom?.superTeamCashFlow && (
                <MoMBadge 
                  data={mom.superTeamCashFlow} 
                  label="Cash Flow MoM"
                  formatValue={(v) => `$${(Math.abs(v) / 1000).toFixed(1)}K`}
                />
              )}
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
