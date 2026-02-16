import { memo, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp } from "lucide-react";
import { DateRangeFilter } from "./DateRangeFilter";

interface CashFlowData {
  monthYear: string;
  superTeamCashFlow: number;
  personalCashFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

// Parse "MM/YYYY" to a Date object (1st of that month)
function parseMonthYear(monthYear: string): Date {
  const [month, year] = monthYear.split("/");
  return new Date(parseInt(`20${year}`), parseInt(month) - 1, 1);
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
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!dateRange.from && !dateRange.to) return data;

    return data.filter((item) => {
      const itemDate = parseMonthYear(item.monthYear);
      if (dateRange.from && itemDate < dateRange.from) return false;
      if (dateRange.to && itemDate > dateRange.to) return false;
      return true;
    });
  }, [data, dateRange]);

  const { superTeamTotal, personalTotal } = useMemo(() => ({
    superTeamTotal: filteredData.reduce((sum, m) => sum + m.superTeamCashFlow, 0),
    personalTotal: filteredData.reduce((sum, m) => sum + m.personalCashFlow, 0),
  }), [filteredData]);

  // Determine the date range label for the description
  const rangeLabel = useMemo(() => {
    if (filteredData.length === 0) return "";
    const first = filteredData[0].monthYear;
    const last = filteredData[filteredData.length - 1].monthYear;
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [fm, fy] = first.split("/");
    const [lm, ly] = last.split("/");
    return `${monthNames[parseInt(fm)]} 20${fy} - ${monthNames[parseInt(lm)]} 20${ly}`;
  }, [filteredData]);

  if (!data || data.length === 0) return null;

  return (
    <Card className="card-hover border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Monthly Cash Flow Breakdown
            </CardTitle>
            <CardDescription>
              Super Team vs Personal cash flow {rangeLabel && `(${rangeLabel})`}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <DateRangeFilter onRangeChange={setDateRange} />
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
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No data available for the selected date range</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="personalCashFlow" 
                  name="Personal" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-muted-foreground">
              Super Team Total {dateRange.from ? "(Filtered)" : "(YTD)"}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              ${superTeamTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-muted-foreground">
              Personal Total {dateRange.from ? "(Filtered)" : "(YTD)"}
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              ${personalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
