import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Code, Calendar, TrendingUp, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

const STAGE_COLORS: Record<string, string> = {
  RECRUITMENT: "bg-blue-100 text-blue-800",
  EXAM_PREP: "bg-yellow-100 text-yellow-800",
  LICENSED: "bg-green-100 text-green-800",
  PRODUCT_TRAINING: "bg-purple-100 text-purple-800",
  BUSINESS_LAUNCH: "bg-orange-100 text-orange-800",
  NET_LICENSED: "bg-emerald-100 text-emerald-800",
  CLIENT_TRACKING: "bg-cyan-100 text-cyan-800",
  CHARGEBACK_PROOF: "bg-red-100 text-red-800",
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const agentId = id ? parseInt(id) : 0;

  const { data: agent, isLoading } = trpc.agents.getById.useQuery(agentId, {
    enabled: agentId > 0,
  });

  const { data: production } = trpc.production.list.useQuery(undefined, {
    enabled: agentId > 0,
  });
  const agentProduction = production?.filter((p: any) => p.agentId === agentId) || [];

  const { data: tasks } = trpc.tasks.list.useQuery({ agentId }, {
    enabled: agentId > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/agents")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Agent not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProduction = agentProduction.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const completedTasks = tasks?.filter((t: any) => t.completedAt).length || 0;
  const totalTasks = tasks?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/agents")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {agent.firstName} {agent.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Agent Code: {agent.agentCode || "Not assigned"}
            </p>
          </div>
        </div>
        <Badge className={`${STAGE_COLORS[agent.currentStage] || "bg-gray-100"} text-base px-3 py-1`}>
          {agent.currentStage.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProduction.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProduction >= 1000 ? "✓ Net Licensed" : `$${(1000 - totalProduction).toLocaleString()} to go`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{completedTasks} of {totalTasks} tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recruited By</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">You</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(agent.createdAt), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(agent.updatedAt), "MMM d")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(agent.updatedAt), "yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agent.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href={`mailto:${agent.email}`} className="text-sm text-blue-600 hover:underline">
                    {agent.email}
                  </a>
                </div>
              </div>
            )}

            {agent.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <a href={`tel:${agent.phone}`} className="text-sm text-blue-600 hover:underline">
                    {agent.phone}
                  </a>
                </div>
              </div>
            )}

            {agent.agentCode && (
              <div className="flex items-start gap-3">
                <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Agent Code</p>
                  <p className="text-sm font-mono">{agent.agentCode}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Recruited</p>
                <p className="text-sm">{format(new Date(agent.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="production" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <FileText className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <Users className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Records</CardTitle>
            </CardHeader>
            <CardContent>
              {production && production.length > 0 ? (
                <div className="space-y-4">
                  {agentProduction.map((record: any) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{record.policyType}</p>
                        <p className="text-lg font-bold">${record.amount?.toLocaleString() || "0"}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Policy: {record.policyNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No production records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks && Array.isArray(tasks) && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{task.description || task.taskType}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={task.completedAt ? "default" : "outline"}>
                        {task.completedAt ? "Done" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No tasks assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.notes ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{agent.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No notes added yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { stage: "RECRUITMENT", date: agent.createdAt, completed: true },
              { stage: "EXAM_PREP", date: agent.updatedAt, completed: agent.currentStage !== "RECRUITMENT" },
              { stage: "LICENSED", date: agent.updatedAt, completed: ["LICENSED", "PRODUCT_TRAINING", "BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"].includes(agent.currentStage) },
              { stage: "PRODUCT_TRAINING", date: agent.updatedAt, completed: ["PRODUCT_TRAINING", "BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"].includes(agent.currentStage) },
              { stage: "BUSINESS_LAUNCH", date: agent.updatedAt, completed: ["BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"].includes(agent.currentStage) },
              { stage: "NET_LICENSED", date: agent.updatedAt, completed: ["NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"].includes(agent.currentStage) },
              { stage: "CLIENT_TRACKING", date: agent.updatedAt, completed: ["CLIENT_TRACKING", "CHARGEBACK_PROOF"].includes(agent.currentStage) },
              { stage: "CHARGEBACK_PROOF", date: agent.updatedAt, completed: agent.currentStage === "CHARGEBACK_PROOF" },
            ].map((item, index) => (
              <div key={item.stage} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${item.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {item.completed ? "✓" : index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.stage.replace(/_/g, " ")}</p>
                  {item.completed && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                {item.completed && <span className="text-green-600 text-sm font-medium">Completed</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
