import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, Clock, FileWarning, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useCallback, useState } from "react";
import { useLocation } from "wouter";

// Import extracted dashboard components
import {
  MetricCard,
  DashboardSkeleton,
  WORKFLOW_STAGES,
  WeeklySyncSummary,
  PolicyAnniversariesSummary,
  EmailTrackingWidget,
  ComplianceCard,
  TransamericaAlertsCard,
  ImpactMetrics,
  CashFlowChart,
  NetLicensedModal,
  MissingLicensesContent,
  NoRecurringContent,
  PendingIssuedContent,
  InUnderwritingContent,
} from "@/components/dashboard";
import type { WorkflowStage } from "@/components/dashboard";
import { Users, Target, Award } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showNetLicensedModal, setShowNetLicensedModal] = useState(false);
  const [showMissingLicensesModal, setShowMissingLicensesModal] = useState(false);
  const [showNoRecurringModal, setShowNoRecurringModal] = useState(false);
  const [showPendingIssuedModal, setShowPendingIssuedModal] = useState(false);
  const [showInUnderwritingModal, setShowInUnderwritingModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const { data: stats, isLoading, refetch, isRefetching } = trpc.dashboard.stats.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  const { data: metrics } = trpc.dashboard.metrics.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  const sendNotification = trpc.dashboard.sendChargebackNotification.useMutation({
    onMutate: () => setNotificationStatus('sending'),
    onSuccess: () => {
      setNotificationStatus('success');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    },
    onError: () => {
      setNotificationStatus('error');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    },
  });

  const { data: monthlyCashFlow } = trpc.dashboard.monthlyCashFlow.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: transamericaAlerts } = trpc.dashboard.getTransamericaAlerts.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });


  const taskCompletionRate = useMemo(() => {
    if (!stats?.taskStats?.total) return 0;
    return Math.round((stats.taskStats.completed / stats.taskStats.total) * 100);
  }, [stats?.taskStats]);

  const navigateToAgents = useCallback(() => setLocation("/agents"), [setLocation]);
  const navigateToTasks = useCallback(() => setLocation("/tasks"), [setLocation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const totalAgents = stats?.totalAgents || 0;
  const netLicensed = stats?.agentsByStage?.NET_LICENSED || 0;
  const conversionRate = totalAgents > 0 ? Math.round((netLicensed / totalAgents) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground">
            Here's your team's performance overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary" className="gap-1.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-live" />
            Live
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <MetricCard
          title="Active Associates"
          value={metrics?.activeAssociates || 91}
          subtitle="Team members in your organization"
          icon={Users}
          trend="up"
          trendValue="MyWFG"
          onClick={navigateToAgents}
        />
        <MetricCard
          title="Licensed Agents"
          value={metrics?.licensedAgents || 27}
          subtitle="Life licensed associates"
          icon={Award}
          variant="success"
          trend="up"
          trendValue={`${Math.round(((metrics?.licensedAgents || 27) / (metrics?.activeAssociates || 91)) * 100)}% licensed`}
          onClick={() => setLocation('/agents?filter=lifeLicensed')}
        />
        <MetricCard
          title="Net Licensed"
          value={metrics?.netLicensedData?.totalNetLicensed || netLicensed}
          subtitle="$1,000+ milestone achieved (TA/A only)"
          icon={Target}
          variant="success"
          trend={(metrics?.netLicensedData?.totalNetLicensed || netLicensed) > 0 ? "up" : "neutral"}
          trendValue={conversionRate > 0 ? `${conversionRate}% rate` : ""}
          onClick={() => setShowNetLicensedModal(true)}
        />
        <MetricCard
          title="Task Completion"
          value={`${taskCompletionRate}%`}
          subtitle={`${stats?.taskStats?.completed || 0}/${stats?.taskStats?.total || 0} tasks done`}
          icon={CheckCircle}
          variant={taskCompletionRate >= 80 ? "success" : taskCompletionRate >= 50 ? "warning" : "danger"}
          onClick={navigateToTasks}
        />
        <MetricCard
          title="Last Sync"
          value={stats?.lastSyncDate ? formatDistanceToNow(new Date(stats.lastSyncDate), { addSuffix: true }) : "Never"}
          subtitle="MyWFG integration"
          icon={RefreshCw}
          variant={stats?.lastSyncDate ? "default" : "warning"}
        />
      </div>
      
      {/* Impact Metrics */}
      <ImpactMetrics
        totalFaceAmount={metrics?.totalFaceAmount || 0}
        familiesProtected={metrics?.familiesProtected || 0}
        superTeamCashFlow={metrics?.superTeamCashFlow || 0}
      />

      {/* Monthly Cash Flow Chart */}
      {monthlyCashFlow && monthlyCashFlow.length > 0 && (
        <CashFlowChart data={monthlyCashFlow} />
      )}

      {/* Weekly Sync Summary */}
      <WeeklySyncSummary />

      {/* Policy Anniversaries Summary */}
      <PolicyAnniversariesSummary />

      {/* Email Tracking Widget */}
      <EmailTrackingWidget />

      {/* Compliance Card */}
      <ComplianceCard
        metrics={metrics}
        onShowMissingLicenses={() => setShowMissingLicensesModal(true)}
        onShowNoRecurring={() => setShowNoRecurringModal(true)}
      />

      {/* Transamerica Alerts Card */}
      {transamericaAlerts && (transamericaAlerts.reversedPremiumPayments?.length > 0 || transamericaAlerts.eftRemovals?.length > 0) && (
        <TransamericaAlertsCard
          alerts={transamericaAlerts}
          notificationStatus={notificationStatus}
          onSendNotification={() => sendNotification.mutate()}
        />
      )}

      {/* Net Licensed Modal */}
      <NetLicensedModal
        open={showNetLicensedModal}
        onOpenChange={setShowNetLicensedModal}
      />

      {/* Missing Licenses Modal */}
      <Dialog open={showMissingLicensesModal} onOpenChange={setShowMissingLicensesModal}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-blue-600" />
              Missing Licenses
            </DialogTitle>
            <DialogDescription>
              Agents who are not yet licensed (in Recruitment or Exam Prep stages)
            </DialogDescription>
          </DialogHeader>
          <MissingLicensesContent />
        </DialogContent>
      </Dialog>

      {/* No Recurring Modal */}
      <Dialog open={showNoRecurringModal} onOpenChange={setShowNoRecurringModal}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Policies Without Recurring Enrollment
            </DialogTitle>
            <DialogDescription>
              Policies with Annual or Flexible payment frequency that could benefit from recurring enrollment
            </DialogDescription>
          </DialogHeader>
          <NoRecurringContent />
        </DialogContent>
      </Dialog>

      {/* Pending Issued Modal */}
      <Dialog open={showPendingIssuedModal} onOpenChange={setShowPendingIssuedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Pending Policies - Issued
            </DialogTitle>
            <DialogDescription>
              Policies that have been issued and are ready for delivery
            </DialogDescription>
          </DialogHeader>
          <PendingIssuedContent />
        </DialogContent>
      </Dialog>

      {/* In Underwriting Modal */}
      <Dialog open={showInUnderwritingModal} onOpenChange={setShowInUnderwritingModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Policies - In Underwriting
            </DialogTitle>
            <DialogDescription>
              Policies currently being reviewed by underwriting (70% probability factor applied)
            </DialogDescription>
          </DialogHeader>
          <InUnderwritingContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}
