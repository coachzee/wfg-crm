import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calculator, Network } from "lucide-react";
import { useLocation } from "wouter";
import TeamHierarchy from "@/components/TeamHierarchy";
import CommissionCalculator from "@/components/CommissionCalculator";

// Loading skeleton
function TeamSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 shimmer rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 shimmer rounded-lg" />
        ))}
      </div>
      <div className="h-96 shimmer rounded-lg" />
    </div>
  );
}

export default function Team() {
  const [, navigate] = useLocation();
  
  const { data: agents, isLoading } = trpc.agents.list.useQuery(undefined, {
    staleTime: 30000,
  });

  const handleAgentClick = (agentId: number) => {
    navigate(`/agents/${agentId}`);
  };

  if (isLoading) {
    return <TeamSkeleton />;
  }

  // Transform agents data for hierarchy component
  const hierarchyAgents = (agents || []).map((agent: any) => ({
    id: agent.id,
    firstName: agent.firstName,
    lastName: agent.lastName,
    agentCode: agent.agentCode,
    currentRank: agent.currentRank || "TRAINING_ASSOCIATE",
    uplineAgentId: agent.uplineAgentId,
    totalBaseShopPoints: agent.totalBaseShopPoints || "0",
    directRecruits: agent.directRecruits || 0,
    isActive: agent.isActive !== false,
  }));

  // Calculate total points for commission calculator
  const totalPoints = hierarchyAgents.reduce((sum: number, agent: any) => {
    return sum + parseFloat(agent.totalBaseShopPoints || "0");
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          View your organizational hierarchy and calculate commissions
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hierarchy" className="gap-2">
            <Network className="h-4 w-4" />
            Team Hierarchy
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-2">
            <Calculator className="h-4 w-4" />
            Commission Calculator
          </TabsTrigger>
        </TabsList>

        {/* Hierarchy Tab */}
        <TabsContent value="hierarchy" className="space-y-4">
          <TeamHierarchy 
            agents={hierarchyAgents}
            onAgentClick={handleAgentClick}
          />
        </TabsContent>

        {/* Commission Calculator Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <CommissionCalculator 
            currentRank="SENIOR_MARKETING_DIRECTOR"
            totalBaseShopPoints={totalPoints}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
