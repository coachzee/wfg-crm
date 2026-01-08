import { useMemo, useState, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  FileWarning,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Status badge colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "Issued":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "Incomplete":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "Post Approval Processing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Declined":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

// Requirement status badge
const getRequirementStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "outstanding":
    case "add":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "received":
    case "waived":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

// Stats card component
const StatsCard = memo(function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-5 ${color}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-80">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs opacity-70">{subtext}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-black/20 flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Requirements table component
const RequirementsTable = memo(function RequirementsTable({
  requirements,
  emptyMessage,
}: {
  requirements: any[];
  emptyMessage: string;
}) {
  if (!requirements || requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Date</TableHead>
          <TableHead>Requirement On</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead>Requirement</TableHead>
          <TableHead>Instruction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.map((req, index) => (
          <TableRow key={index}>
            <TableCell className="text-xs">{req.dateRequested || "-"}</TableCell>
            <TableCell className="font-medium">{req.requirementOn || "-"}</TableCell>
            <TableCell>
              <Badge className={`text-xs ${getRequirementStatusColor(req.status)}`}>
                {req.status || "Unknown"}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[200px] truncate">{req.requirement || "-"}</TableCell>
            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
              {req.instruction || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});

// Policy detail dialog
const PolicyDetailDialog = memo(function PolicyDetailDialog({
  policy,
}: {
  policy: any;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policy {policy.policyNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Policy Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Owner Name</p>
              <p className="font-medium">{policy.ownerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={getStatusColor(policy.status)}>{policy.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Product Type</p>
              <p className="font-medium">{policy.productType || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Face Amount</p>
              <p className="font-medium">{policy.faceAmount || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Premium</p>
              <p className="font-medium">{policy.premium || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issue Date</p>
              <p className="font-medium">{policy.issueDate || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Policy Closure Date</p>
              <p className="font-medium">{policy.policyClosureDate || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Underwriting Decision</p>
              <p className="font-medium">{policy.underwritingDecision || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Risk Class</p>
              <p className="font-medium">{policy.riskClass || "-"}</p>
            </div>
          </div>

          {/* Requirements Tabs */}
          <Tabs defaultValue="producer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="producer" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Producer ({policy.requirements?.pendingWithProducer?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="transamerica" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Transamerica ({policy.requirements?.pendingWithTransamerica?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed ({policy.requirements?.completed?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="producer" className="mt-4">
              <RequirementsTable
                requirements={policy.requirements?.pendingWithProducer || []}
                emptyMessage="No pending requirements with producer"
              />
            </TabsContent>
            <TabsContent value="transamerica" className="mt-4">
              <RequirementsTable
                requirements={policy.requirements?.pendingWithTransamerica || []}
                emptyMessage="No pending requirements with Transamerica"
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <RequirementsTable
                requirements={policy.requirements?.completed || []}
                emptyMessage="No completed requirements"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});

// Loading skeleton
function PendingPoliciesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="h-8 w-64 shimmer rounded-lg" />
        <div className="h-10 w-32 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 shimmer rounded-xl" />
        ))}
      </div>
      <div className="h-96 shimmer rounded-xl" />
    </div>
  );
}

export default function PendingPolicies() {
  const [syncing, setSyncing] = useState(false);

  const { data: policies, isLoading, refetch } = trpc.pendingPolicies.list.useQuery(undefined, {
    staleTime: 60000,
  });

  const { data: summary } = trpc.pendingPolicies.summary.useQuery(undefined, {
    staleTime: 60000,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!summary) {
      return {
        total: 0,
        pending: 0,
        incomplete: 0,
        postApproval: 0,
        pendingWithProducer: 0,
        pendingWithTransamerica: 0,
      };
    }

    return {
      total: summary.total,
      pending: (summary.byStatus as Record<string, number>)?.["Pending"] || 0,
      incomplete: (summary.byStatus as Record<string, number>)?.["Incomplete"] || 0,
      postApproval: (summary.byStatus as Record<string, number>)?.["Post Approval Processing"] || 0,
      pendingWithProducer: summary.pendingWithProducerCount || 0,
      pendingWithTransamerica: summary.pendingWithTransamericaCount || 0,
    };
  }, [summary]);

  // Filter policies by status
  const pendingPolicies = useMemo(() => {
    return policies?.filter((p: any) => p.status !== "Issued") || [];
  }, [policies]);

  // Handle manual sync
  const handleSync = async () => {
    setSyncing(true);
    toast.info("Fetching latest pending policy data from Transamerica...");

    try {
      // TODO: Call sync endpoint when implemented
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await refetch();
      toast.success("Pending policy data has been updated.");
    } catch (error) {
      toast.error("Failed to sync data from Transamerica. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return <PendingPoliciesSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Policies</h1>
          <p className="text-muted-foreground">
            Track pending policy requirements from Transamerica Life Access
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={FileText}
          label="Total Pending"
          value={stats.total - ((summary?.byStatus as Record<string, number>)?.["Issued"] || 0)}
          subtext="Policies requiring action"
          color="bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-700 dark:text-blue-400"
        />
        <StatsCard
          icon={User}
          label="Pending with Producer"
          value={stats.pendingWithProducer}
          subtext="Requirements you need to fulfill"
          color="bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-400"
        />
        <StatsCard
          icon={Building2}
          label="Pending with Transamerica"
          value={stats.pendingWithTransamerica}
          subtext="Requirements Transamerica is processing"
          color="bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-400"
        />
        <StatsCard
          icon={AlertCircle}
          label="Incomplete"
          value={stats.incomplete}
          subtext="Policies needing attention"
          color="bg-gradient-to-br from-red-500/10 to-red-500/5 text-red-700 dark:text-red-400"
        />
      </div>

      {/* Policies by Status */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({pendingPolicies.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="incomplete">
            Incomplete ({stats.incomplete})
          </TabsTrigger>
          <TabsTrigger value="postApproval">
            Post Approval ({stats.postApproval})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PolicyList policies={pendingPolicies} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <PolicyList policies={pendingPolicies.filter((p: any) => p.status === "Pending")} />
        </TabsContent>
        <TabsContent value="incomplete" className="mt-4">
          <PolicyList policies={pendingPolicies.filter((p: any) => p.status === "Incomplete")} />
        </TabsContent>
        <TabsContent value="postApproval" className="mt-4">
          <PolicyList
            policies={pendingPolicies.filter((p: any) => p.status === "Post Approval Processing")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Policy list component
function PolicyList({ policies }: { policies: any[] }) {
  if (!policies || policies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mb-2 opacity-20" />
          <p>No policies found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {policies.map((policy: any) => (
            <AccordionItem key={policy.policyNumber} value={policy.policyNumber}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{policy.ownerName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {policy.policyNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{policy.faceAmount || "-"}</p>
                      <p className="text-xs text-muted-foreground">{policy.productType || "-"}</p>
                    </div>
                    <Badge className={getStatusColor(policy.status)}>{policy.status}</Badge>
                    {(policy.requirements?.pendingWithProducer?.length > 0 ||
                      policy.requirements?.pendingWithTransamerica?.length > 0) && (
                      <Badge variant="outline" className="text-xs">
                        {(policy.requirements?.pendingWithProducer?.length || 0) +
                          (policy.requirements?.pendingWithTransamerica?.length || 0)}{" "}
                        pending
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Premium
                      </p>
                      <p className="font-medium">{policy.premium || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Submitted
                      </p>
                      <p className="font-medium">{policy.submittedDate || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Closure Date
                      </p>
                      <p className="font-medium">{policy.policyClosureDate || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileWarning className="h-3 w-3" /> Risk Class
                      </p>
                      <p className="font-medium">{policy.riskClass || "-"}</p>
                    </div>
                  </div>

                  {/* Requirements Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pending with Producer */}
                    <Card className="border-amber-200 dark:border-amber-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <User className="h-4 w-4" />
                          Pending with Producer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {policy.requirements?.pendingWithProducer?.length > 0 ? (
                          <ul className="space-y-1">
                            {policy.requirements.pendingWithProducer.map(
                              (req: any, idx: number) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <AlertCircle className="h-3 w-3 mt-1 text-amber-500 flex-shrink-0" />
                                  <span>{req.requirement || "Unknown requirement"}</span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            No pending requirements
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pending with Transamerica */}
                    <Card className="border-violet-200 dark:border-violet-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-violet-700 dark:text-violet-400">
                          <Building2 className="h-4 w-4" />
                          Pending with Transamerica
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {policy.requirements?.pendingWithTransamerica?.length > 0 ? (
                          <ul className="space-y-1">
                            {policy.requirements.pendingWithTransamerica.map(
                              (req: any, idx: number) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <Clock className="h-3 w-3 mt-1 text-violet-500 flex-shrink-0" />
                                  <span>{req.requirement || "Unknown requirement"}</span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            No pending requirements
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Completed */}
                    <Card className="border-emerald-200 dark:border-emerald-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {policy.requirements?.completed?.length > 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {policy.requirements.completed.length} requirement(s) completed
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No completed requirements</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* View Full Details Button */}
                  <div className="flex justify-end">
                    <PolicyDetailDialog policy={policy} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
