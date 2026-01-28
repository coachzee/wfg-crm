// Custom tooltip for charts
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 shadow-soft border">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} agents</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for cash flow chart with better positioning
export const CashFlowTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const [month, year] = (label || '').split('/');
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const formattedLabel = month && year ? `${monthNames[parseInt(month)]} ${year}` : label;
    
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg min-w-[200px]" style={{ zIndex: 9999 }}>
        <p className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{formattedLabel}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {entry.dataKey === 'superTeamCashFlow' ? 'Super Team' : 'Personal'}
                </span>
              </div>
              <span className="text-sm font-bold text-foreground">
                ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
