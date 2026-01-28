import { memo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle, XCircle } from "lucide-react";

interface NetLicensedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NetLicensedModal = memo(function NetLicensedModal({ open, onOpenChange }: NetLicensedModalProps) {
  const { data: netLicensedData, isLoading } = trpc.dashboard.metrics.useQuery(undefined, {
    enabled: open,
    staleTime: 30000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            Net Licensed Agents
          </DialogTitle>
          <DialogDescription>
            Agents who have achieved $1,000+ in personal production (TA/A carriers only)
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading agent data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-600">{netLicensedData?.netLicensedData?.totalNetLicensed || 0}</p>
                <p className="text-sm text-muted-foreground">Net Licensed</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-600">{netLicensedData?.netLicensedData?.notNetLicensedAgents?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Not Yet Net Licensed</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-600">{netLicensedData?.licensedAgents || 0}</p>
                <p className="text-sm text-muted-foreground">Total Licensed</p>
              </div>
            </div>

            {/* Net Licensed Agents */}
            {netLicensedData?.netLicensedData?.netLicensedAgents && netLicensedData.netLicensedData.netLicensedAgents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Net Licensed Agents ({netLicensedData.netLicensedData.netLicensedAgents.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Agent Code</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">TA/A Production</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {netLicensedData.netLicensedData.netLicensedAgents.map((agent: any) => (
                        <tr key={agent.agentCode} className="hover:bg-emerald-50/50">
                          <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{agent.agentCode}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600">
                            ${(agent.taAProduction || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge className="bg-emerald-500">Net Licensed</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Not Yet Net Licensed Agents */}
            {netLicensedData?.netLicensedData?.notNetLicensedAgents && netLicensedData.netLicensedData.notNetLicensedAgents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Not Yet Net Licensed ({netLicensedData.netLicensedData.notNetLicensedAgents.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Agent Code</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">TA/A Production</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {netLicensedData.netLicensedData.notNetLicensedAgents.map((agent: any) => (
                        <tr key={agent.agentCode} className="hover:bg-amber-50/50">
                          <td className="px-4 py-3 text-sm font-medium">{agent.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{agent.agentCode}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            ${(agent.taAProduction || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-amber-600">
                            ${Math.max(0, 1000 - (agent.taAProduction || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
