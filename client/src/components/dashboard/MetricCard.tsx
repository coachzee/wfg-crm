import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}

export const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  variant = "default",
  onClick
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

export default MetricCard;
