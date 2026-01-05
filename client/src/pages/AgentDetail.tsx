import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail, Phone, Code, Calendar, TrendingUp, Users, FileText, Award, Target, ChevronRight, Shield, Star, MapPin } from "lucide-react";
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

// WFG Rank display configuration
const RANK_CONFIG: Record<string, { label: string; color: string; level: number; icon: string }> = {
  TRAINING_ASSOCIATE: { label: "Training Associate", color: "bg-gray-100 text-gray-800 border-gray-300", level: 1, icon: "🎓" },
  ASSOCIATE: { label: "Associate", color: "bg-blue-100 text-blue-800 border-blue-300", level: 2, icon: "📋" },
  SENIOR_ASSOCIATE: { label: "Senior Associate", color: "bg-indigo-100 text-indigo-800 border-indigo-300", level: 3, icon: "📊" },
  MARKETING_DIRECTOR: { label: "Marketing Director", color: "bg-green-100 text-green-800 border-green-300", level: 10, icon: "🎯" },
  SENIOR_MARKETING_DIRECTOR: { label: "Senior Marketing Director", color: "bg-emerald-100 text-emerald-800 border-emerald-300", level: 20, icon: "⭐" },
  EXECUTIVE_MARKETING_DIRECTOR: { label: "Executive Marketing Director", color: "bg-purple-100 text-purple-800 border-purple-300", level: 65, icon: "💎" },
  CEO_MARKETING_DIRECTOR: { label: "CEO Marketing Director", color: "bg-pink-100 text-pink-800 border-pink-300", level: 75, icon: "👑" },
  EXECUTIVE_VICE_CHAIRMAN: { label: "Executive Vice Chairman", color: "bg-amber-100 text-amber-800 border-amber-300", level: 87, icon: "🏆" },
  SENIOR_EXECUTIVE_VICE_CHAIRMAN: { label: "Senior Executive Vice Chairman", color: "bg-orange-100 text-orange-800 border-orange-300", level: 90, icon: "🌟" },
  FIELD_CHAIRMAN: { label: "Field Chairman", color: "bg-red-100 text-red-800 border-red-300", level: 95, icon: "🔥" },
  EXECUTIVE_CHAIRMAN: { label: "Executive Chairman", color: "bg-gradient-to-r from-yellow-200 to-amber-200 text-amber-900 border-amber-400", level: 99, icon: "👔" },
};

// Advancement requirements by rank
const ADVANCEMENT_REQUIREMENTS: Record<string, { recruits?: number; directLegs?: number; licensedAgents?: number; baseShopPoints?: number; cashFlow?: number; smdLegs?: number; rollingMonths: number }> = {
  ASSOCIATE: { recruits: 3, rollingMonths: 1 },
  SENIOR_ASSOCIATE: { directLegs: 3, licensedAgents: 4, baseShopPoints: 30000, rollingMonths: 3 },
  MARKETING_DIRECTOR: { directLegs: 3, licensedAgents: 5, baseShopPoints: 40000, rollingMonths: 3 },
  SENIOR_MARKETING_DIRECTOR: { directLegs: 3, licensedAgents: 10, baseShopPoints: 75000, cashFlow: 30000, rollingMonths: 3 },
  EXECUTIVE_MARKETING_DIRECTOR: { smdLegs: 3, baseShopPoints: 500000, rollingMonths: 6 },
  CEO_MARKETING_DIRECTOR: { smdLegs: 6, baseShopPoints: 1000000, rollingMonths: 6 },
  EXECUTIVE_VICE_CHAIRMAN: { smdLegs: 9, baseShopPoints: 1500000, rollingMonths: 6 },
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

  // Get current rank config
  const currentRank = (agent as any).currentRank || "TRAINING_ASSOCIATE";
  const rankConfig = RANK_CONFIG[currentRank] || RANK_CONFIG.TRAINING_ASSOCIATE;
  
  // Calculate next rank and progress
  const rankOrder = Object.keys(RANK_CONFIG);
  const currentRankIndex = rankOrder.indexOf(currentRank);
  const nextRank = currentRankIndex < rankOrder.length - 1 ? rankOrder[currentRankIndex + 1] : null;
  const nextRankConfig = nextRank ? RANK_CONFIG[nextRank] : null;
  const nextRankRequirements = nextRank ? ADVANCEMENT_REQUIREMENTS[nextRank] : null;

  // Calculate advancement progress (mock data for now - will be populated from sync)
  const agentMetrics = {
    directRecruits: (agent as any).directRecruits || 0,
    licensedAgentsInOrg: (agent as any).licensedAgentsInOrg || 0,
    totalBaseShopPoints: parseFloat((agent as any).totalBaseShopPoints || "0"),
    totalCashFlow: parseFloat((agent as any).totalCashFlow || "0"),
    directSmdLegs: (agent as any).directSmdLegs || 0,
  };

  // Calculate overall progress percentage
  const calculateProgress = () => {
    if (!nextRankRequirements) return 100;
    
    let totalMetrics = 0;
    let metProgress = 0;
    
    if (nextRankRequirements.recruits) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.directRecruits / nextRankRequirements.recruits, 1);
    }
    if (nextRankRequirements.directLegs) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.directRecruits / nextRankRequirements.directLegs, 1);
    }
    if (nextRankRequirements.licensedAgents) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.licensedAgentsInOrg / nextRankRequirements.licensedAgents, 1);
    }
    if (nextRankRequirements.baseShopPoints) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.totalBaseShopPoints / nextRankRequirements.baseShopPoints, 1);
    }
    if (nextRankRequirements.cashFlow) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.totalCashFlow / nextRankRequirements.cashFlow, 1);
    }
    if (nextRankRequirements.smdLegs) {
      totalMetrics++;
      metProgress += Math.min(agentMetrics.directSmdLegs / nextRankRequirements.smdLegs, 1);
    }
    
    return totalMetrics > 0 ? Math.round((metProgress / totalMetrics) * 100) : 0;
  };

  const advancementProgress = calculateProgress();

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
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground">
                Agent Code: {agent.agentCode || "Not assigned"}
              </p>
              {(agent as any).mywfgAgentId && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  MyWFG: {(agent as any).mywfgAgentId}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${rankConfig.color} text-base px-3 py-1 border`}>
            <span className="mr-1">{rankConfig.icon}</span>
            {rankConfig.label}
          </Badge>
          <Badge className={`${STAGE_COLORS[agent.currentStage] || "bg-gray-100"} text-sm px-2 py-1`}>
            {agent.currentStage.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Rank Progression Card */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">WFG Rank Progression</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">Level {rankConfig.level}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rankConfig.icon}</span>
                  <span className="font-semibold">{rankConfig.label}</span>
                </div>
                {nextRankConfig && (
                  <>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{nextRankConfig.icon}</span>
                      <span className="font-semibold text-muted-foreground">{nextRankConfig.label}</span>
                    </div>
                  </>
                )}
              </div>
              {nextRank && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to {nextRankConfig?.label}</span>
                    <span className="font-medium">{advancementProgress}%</span>
                  </div>
                  <Progress value={advancementProgress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* Advancement Requirements */}
          {nextRankRequirements && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
              {nextRankRequirements.recruits && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">{agentMetrics.directRecruits}/{nextRankRequirements.recruits}</div>
                  <div className="text-xs text-muted-foreground">Recruits</div>
                </div>
              )}
              {nextRankRequirements.directLegs && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">{agentMetrics.directRecruits}/{nextRankRequirements.directLegs}</div>
                  <div className="text-xs text-muted-foreground">Direct Legs</div>
                </div>
              )}
              {nextRankRequirements.licensedAgents && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">{agentMetrics.licensedAgentsInOrg}/{nextRankRequirements.licensedAgents}</div>
                  <div className="text-xs text-muted-foreground">Licensed Agents</div>
                </div>
              )}
              {nextRankRequirements.baseShopPoints && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">{(agentMetrics.totalBaseShopPoints / 1000).toFixed(0)}K/{(nextRankRequirements.baseShopPoints / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-muted-foreground">Base Shop Points</div>
                </div>
              )}
              {nextRankRequirements.cashFlow && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">${(agentMetrics.totalCashFlow / 1000).toFixed(0)}K/${(nextRankRequirements.cashFlow / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-muted-foreground">Cash Flow</div>
                </div>
              )}
              {nextRankRequirements.smdLegs && (
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-lg font-bold">{agentMetrics.directSmdLegs}/{nextRankRequirements.smdLegs}</div>
                  <div className="text-xs text-muted-foreground">SMD Legs</div>
                </div>
              )}
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold">{nextRankRequirements.rollingMonths}mo</div>
                <div className="text-xs text-muted-foreground">Rolling Period</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">${totalProduction.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-1">
              {totalProduction >= 1000 ? "✓ Net Licensed" : `$${(1000 - totalProduction).toLocaleString()} to go`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</div>
            <p className="text-xs text-blue-600 mt-1">{completedTasks} of {totalTasks} tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {(agent as any).isLifeLicensed && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Life
                </Badge>
              )}
              {(agent as any).isSecuritiesLicensed && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                  <Star className="h-3 w-3 mr-1" />
                  Securities
                </Badge>
              )}
              {!(agent as any).isLifeLicensed && !(agent as any).isSecuritiesLicensed && (
                <span className="text-sm text-muted-foreground">Not yet licensed</span>
              )}
            </div>
            <p className="text-xs text-purple-600 mt-2">
              {agent.licenseNumber ? `License: ${agent.licenseNumber}` : "No license number"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Recruited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{format(new Date(agent.createdAt), "MMM d")}</div>
            <p className="text-xs text-amber-600 mt-1">
              {format(new Date(agent.createdAt), "yyyy")}
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

            {agent.homeAddress && (
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Home Address</p>
                  <p className="text-sm text-muted-foreground">{agent.homeAddress}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="production" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="advancement" className="gap-2">
            <Target className="h-4 w-4" />
            Advancement
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
              <CardDescription>Commission and policy history</CardDescription>
            </CardHeader>
            <CardContent>
              {production && production.length > 0 ? (
                <div className="space-y-4">
                  {agentProduction.map((record: any) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{record.policyType}</p>
                          {record.productCompany && (
                            <p className="text-xs text-muted-foreground">{record.productCompany}</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-green-600">${record.amount?.toLocaleString() || "0"}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Policy: {record.policyNumber}</span>
                        <span>{format(new Date(record.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      {record.basePoints && (
                        <div className="text-xs text-blue-600">
                          +{record.basePoints.toLocaleString()} base points
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No production records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advancement Tab */}
        <TabsContent value="advancement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WFG Rank History</CardTitle>
              <CardDescription>Career progression through WFG ranks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(RANK_CONFIG).map(([rank, config], index) => {
                  const isCurrentRank = rank === currentRank;
                  const isPastRank = config.level < rankConfig.level;
                  const isFutureRank = config.level > rankConfig.level;
                  
                  return (
                    <div 
                      key={rank} 
                      className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                        isCurrentRank ? "bg-amber-50 border border-amber-200" : 
                        isPastRank ? "bg-green-50 border border-green-200" : 
                        "bg-slate-50 border border-slate-200 opacity-60"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        isCurrentRank ? "bg-amber-100" : 
                        isPastRank ? "bg-green-100" : 
                        "bg-slate-100"
                      }`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">Level {config.level}</p>
                      </div>
                      {isCurrentRank && (
                        <Badge className="bg-amber-100 text-amber-800">Current</Badge>
                      )}
                      {isPastRank && (
                        <Badge className="bg-green-100 text-green-800">✓ Achieved</Badge>
                      )}
                      {isFutureRank && (
                        <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
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
          <CardDescription>Internal onboarding and development stages</CardDescription>
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
