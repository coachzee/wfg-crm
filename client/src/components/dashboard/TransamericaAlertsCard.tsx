import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, FileWarning, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface TransamericaAlert {
  policyNumber: string;
  ownerName: string;
  alertDate: string;
  alertType: string;
}

interface TransamericaAlertsCardProps {
  alerts: {
    reversedPremiumPayments?: TransamericaAlert[];
    eftRemovals?: TransamericaAlert[];
    lastSyncDate?: string;
  } | undefined;
  notificationStatus: 'idle' | 'sending' | 'success' | 'error';
  onSendNotification: () => void;
}

export const TransamericaAlertsCard = memo(function TransamericaAlertsCard({ 
  alerts, 
  notificationStatus, 
  onSendNotification 
}: TransamericaAlertsCardProps) {
  if (!alerts) return null;

  return (
    <Card className="card-hover border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Transamerica Chargeback Alerts
            </CardTitle>
            <CardDescription>Critical policy alerts requiring immediate attention</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="font-mono">
              {alerts.reversedPremiumPayments?.length || 0} chargebacks
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Last sync: {alerts.lastSyncDate ? format(new Date(alerts.lastSyncDate), 'MMM d, h:mm a') : 'Never'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reversed Premium Payments */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Reversed Premium Payments ({alerts.reversedPremiumPayments?.length || 0})
            </h4>
            <div className="space-y-2">
              {alerts.reversedPremiumPayments?.map((alert) => (
                <div key={`${alert.policyNumber}-${alert.alertDate}`} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{alert.ownerName}</p>
                      <p className="text-xs text-muted-foreground">Policy #{alert.policyNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-600">Reversed</p>
                    <p className="text-xs text-muted-foreground">{alert.alertDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* EFT Removals */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Removed from EFT ({alerts.eftRemovals?.length || 0})
            </h4>
            <div className="space-y-2">
              {alerts.eftRemovals?.map((alert) => (
                <div key={`${alert.policyNumber}-eft-${alert.alertDate}`} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <FileWarning className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{alert.ownerName}</p>
                      <p className="text-xs text-muted-foreground">Policy #{alert.policyNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-orange-600">EFT Removed</p>
                    <p className="text-xs text-muted-foreground">{alert.alertDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Required Notice */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <strong>Action Required:</strong> Contact these clients immediately to prevent policy lapse and commission chargebacks.
          </p>
        </div>
        
        {/* Send Notification Button */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Send email/SMS alerts to team about these critical items
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onSendNotification}
            disabled={notificationStatus === 'sending'}
            className={`gap-2 ${
              notificationStatus === 'success' ? 'bg-green-50 text-green-700 border-green-300' :
              notificationStatus === 'error' ? 'bg-red-50 text-red-700 border-red-300' : ''
            }`}
          >
            <Bell className="h-4 w-4" />
            {notificationStatus === 'sending' ? 'Sending...' :
             notificationStatus === 'success' ? 'Sent!' :
             notificationStatus === 'error' ? 'Failed' : 'Send Alert'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
