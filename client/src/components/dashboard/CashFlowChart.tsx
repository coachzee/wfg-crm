import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp } from "lucide-react";

interface CashFlowData {
  monthYear: string;
  superTeamCashFlow: number;
  personalCashFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

// Custom tooltip for cash flow chart
const CashFlowTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const [month, year] = label.split('/');
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium text-sm mb-2">{monthNames[parseInt(month)]} 20{year}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CashFlowChart = memo(function CashFlowChart({ data }: CashFlowChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="card-hover border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Monthly Cash Flow Breakdown
            </CardTitle>
            <CardDescription>Super Team vs Personal cash flow (Feb 2025 - Jan 2026)</CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Super Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Personal</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="monthYear" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const [month, year] = value.split('/');
                  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${monthNames[parseInt(month)]} '${year.slice(-2)}`;
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                content={<CashFlowTooltip />}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                position={{ y: -20 }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Legend />
              <Bar 
                dataKey="superTeamCashFlow" 
                name="Super Team" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="personalCashFlow" 
                name="Personal" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-muted-foreground">Super Team Total (YTD)</p>
            <p className="text-2xl font-bold text-blue-600">
              ${data.reduce((sum, m) => sum + m.superTeamCashFlow, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-muted-foreground">Personal Total (YTD)</p>
            <p className="text-2xl font-bold text-emerald-600">
              ${data.reduce((sum, m) => sum + m.personalCashFlow, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
