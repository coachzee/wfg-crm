import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Trophy, TrendingUp, Target, Award } from "lucide-react";
import { format } from "date-fns";

export default function Production() {
  const { data: agents, isLoading } = trpc.agents.list.useQuery();
  const { data: productionRecords } = trpc.production.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading production data...</p>
        </div>
      </div>
    );
  }

  // Calculate production metrics
  const agentProduction = agents?.map((agent: any) => {
    const agentRecords = productionRecords?.filter((r: any) => r.agentId === agent.id) || [];
    const totalProduction = agentRecords.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    return {
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      production: totalProduction,
      stage: agent.workflowStage,
      agentCode: agent.agentCode,
    };
  }) || [];

  // Sort by production descending
  const topProducers = [...agentProduction].sort((a, b) => b.production - a.production).slice(0, 10);

  // Calculate stage breakdown
  const stageBreakdown = agents?.reduce((acc: any, agent: any) => {
    const stage = agent.workflowStage;
    const existing = acc.find((s: any) => s.stage === stage);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ stage, count: 1 });
    }
    return acc;
  }, []) || [];

  // Calculate net licensed agents (those who hit $1,000)
  const netLicensedCount = agentProduction.filter((a: any) => a.production >= 1000).length;
  const totalProduction = agentProduction.reduce((sum: number, a: any) => sum + a.production, 0);
  const averageProduction = agentProduction.length > 0 ? totalProduction / agentProduction.length : 0;

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Production Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track agent production, milestones, and team performance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProduction.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Licensed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netLicensedCount}</div>
            <p className="text-xs text-muted-foreground">${1000}+ in production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Production</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageProduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Per agent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentProduction.length}</div>
            <p className="text-xs text-muted-foreground">Total recruits</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Producers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Producers</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="production" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No production data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agents by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Agents by Workflow Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ stage, count }) => `${stage}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stageBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Production Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Production Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {agentProduction.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold">Agent</th>
                    <th className="text-left py-2 px-4 font-semibold">Code</th>
                    <th className="text-left py-2 px-4 font-semibold">Stage</th>
                    <th className="text-right py-2 px-4 font-semibold">Production</th>
                    <th className="text-center py-2 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agentProduction.map((agent: any) => (
                    <tr key={agent.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{agent.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{agent.agentCode || "-"}</td>
                      <td className="py-3 px-4 text-xs">{agent.stage}</td>
                      <td className="py-3 px-4 text-right font-semibold">${agent.production.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        {agent.production >= 1000 ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                            Net Licensed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No agent production data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
