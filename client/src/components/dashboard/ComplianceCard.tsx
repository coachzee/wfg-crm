import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, FileWarning, CreditCard } from "lucide-react";
import { SectionExport } from "./SectionExport";
import type { ExportColumn } from "./SectionExport";

interface ComplianceCardProps {
  metrics: {
    complianceFirstNotice?: number;
    complianceFinalNotice?: number;
    missingLicenses?: number;
    notEnrolledRecurring?: number;
    commissionsOnHold?: Array<{ agentCode: string; name: string; balance: number; email: string }>;
    firstNoticeAgents?: Array<{ agentCode: string; name: string; balance: number; email: string }>;
  } | undefined;
  onShowMissingLicenses: () => void;
  onShowNoRecurring: () => void;
}

export const ComplianceCard = memo(function ComplianceCard({ 
  metrics, 
  onShowMissingLicenses, 
  onShowNoRecurring 
}: ComplianceCardProps) {
  const exportColumns: ExportColumn[] = useMemo(() => [
    { key: "name", header: "Agent Name" },
    { key: "agentCode", header: "Agent Code" },
    { key: "email", header: "Email" },
    { key: "status", header: "Status" },
    { key: "balance", header: "Balance Owed", format: (v: number) => v !== undefined ? `$${v.toFixed(2)}` : "N/A" },
  ], []);

  const exportData = useMemo(() => {
    const rows: Record<string, any>[] = [];
    if (metrics?.commissionsOnHold) {
      for (const agent of metrics.commissionsOnHold) {
        rows.push({
          name: agent.name,
          agentCode: agent.agentCode,
          email: agent.email,
          status: "Final Notice - Commission On Hold",
          balance: agent.balance,
        });
      }
    }
    if (metrics?.firstNoticeAgents) {
      for (const agent of metrics.firstNoticeAgents) {
        rows.push({
          name: agent.name,
          agentCode: agent.agentCode,
          email: agent.email,
          status: "First Notice Warning",
          balance: agent.balance,
        });
      }
    }
    return rows;
  }, [metrics?.commissionsOnHold, metrics?.firstNoticeAgents]);

  const exportSummary = useMemo(() => [{
    label: "SUMMARY",
    values: {
      agentCode: `Missing Licenses: ${metrics?.missingLicenses || 11}`,
      email: `No Recurring: ${metrics?.notEnrolledRecurring || 15}`,
      status: `First Notice: ${metrics?.complianceFirstNotice || 3}`,
      balance: `Final Notice: ${metrics?.complianceFinalNotice || 3}`,
    },
  }], [metrics]);

  return (
    <Card className="card-hover border-amber-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Compliance & Platform Fee Status
            </CardTitle>
            <CardDescription>Pending items requiring attention from MyWFG reports</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <SectionExport
              title="Compliance & Platform Fee Status Report"
              subtitle="Agents with pending compliance items requiring attention"
              columns={exportColumns}
              data={exportData}
              summaryRows={exportSummary}
              accentColor="#f59e0b"
            />
            <Badge variant="outline" className="font-mono text-amber-600 border-amber-500/50">
              {(metrics?.complianceFirstNotice || 3) + (metrics?.complianceFinalNotice || 3)} pending
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Missing Licenses */}
          <div 
            className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors"
            onClick={onShowMissingLicenses}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Missing Licenses</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{metrics?.missingLicenses || 11}</p>
            <p className="text-xs text-muted-foreground">Click to view agents</p>
          </div>
          
          {/* Not Enrolled in Recurring */}
          <div 
            className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 cursor-pointer hover:bg-purple-500/10 transition-colors"
            onClick={onShowNoRecurring}
          >
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-600">No Recurring</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{metrics?.notEnrolledRecurring || 15}</p>
            <p className="text-xs text-muted-foreground">Click to view policies</p>
          </div>
          
          {/* First Notice */}
          <div 
            className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-colors"
            onClick={() => {
              const element = document.getElementById('first-notice-section');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">First Notice</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{metrics?.complianceFirstNotice || 3}</p>
            <p className="text-xs text-muted-foreground">Click to view agents</p>
          </div>
          
          {/* Final Notice - Commissions On Hold */}
          <div 
            className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors"
            onClick={() => {
              const element = document.getElementById('final-notice-section');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">Final Notice</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{metrics?.complianceFinalNotice || 3}</p>
            <p className="text-xs text-muted-foreground">Click to view agents</p>
          </div>
        </div>
        
        {/* Agents with Commissions On Hold - Detailed List */}
        {metrics?.commissionsOnHold && metrics.commissionsOnHold.length > 0 && (
          <div id="final-notice-section" className="mt-6 pt-4 border-t border-red-500/20">
            <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Agents with Commissions On Hold
            </h4>
            <div className="space-y-2">
              {metrics.commissionsOnHold.map((agent) => (
                <div key={agent.agentCode} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-red-600">{agent.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.agentCode} • {agent.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">${agent.balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Balance owed</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Agents with First Notice Warning */}
        {metrics?.firstNoticeAgents && metrics.firstNoticeAgents.length > 0 && (
          <div id="first-notice-section" className="mt-4 pt-4 border-t border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Agents with First Notice Warning
            </h4>
            <div className="space-y-2">
              {metrics.firstNoticeAgents.map((agent) => (
                <div key={agent.agentCode} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-600">{agent.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.agentCode} • {agent.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">${agent.balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Balance owed</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
