import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MoMData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
  mom?: MoMData;
  momLabel?: string;
}

export const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  variant = "default",
  onClick,
  mom,
  momLabel,
}: MetricCardProps) {
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

  // Determine MoM trend direction
  const momTrend = mom ? (mom.changePercent > 0 ? "up" : mom.changePercent < 0 ? "down" : "neutral") : null;
  const momColor = momTrend === "up" ? "text-emerald-600" : momTrend === "down" ? "text-red-600" : "text-muted-foreground";
  const momBgColor = momTrend === "up" ? "bg-emerald-500/10" : momTrend === "down" ? "bg-red-500/10" : "bg-muted/50";

  return (
    <Card 
      className={`metric-card card-hover border bg-gradient-to-br ${variantStyles[variant]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
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
            
            {/* Month-over-Month Comparison Badge */}
            {mom && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${momBgColor} ${momColor} cursor-default mt-1`}>
                      {momTrend === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : momTrend === "down" ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      <span>
                        {mom.changePercent > 0 ? "+" : ""}
                        {mom.changePercent}% MoM
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">{momLabel || "Month-over-Month"}</p>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">This month:</span>
                        <span className="font-medium">{mom.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Last month:</span>
                        <span className="font-medium">{mom.previous.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between gap-4">
                        <span className="text-muted-foreground">Change:</span>
                        <span className={`font-medium ${momColor}`}>
                          {mom.change > 0 ? "+" : ""}{mom.change.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className={`icon-container ${iconStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default MetricCard;
