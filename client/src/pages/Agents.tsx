import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";

const STAGES = [
  { value: "RECRUITMENT", label: "Recruitment", color: "bg-red-100 text-red-800" },
  { value: "EXAM_PREP", label: "Exam Prep", color: "bg-orange-100 text-orange-800" },
  { value: "LICENSED", label: "Licensed", color: "bg-yellow-100 text-yellow-800" },
  { value: "PRODUCT_TRAINING", label: "Product Training", color: "bg-blue-100 text-blue-800" },
  { value: "BUSINESS_LAUNCH", label: "Business Launch", color: "bg-purple-100 text-purple-800" },
  { value: "NET_LICENSED", label: "Net Licensed", color: "bg-green-100 text-green-800" },
  { value: "CLIENT_TRACKING", label: "Client Tracking", color: "bg-cyan-100 text-cyan-800" },
  { value: "CHARGEBACK_PROOF", label: "Chargeback Proof", color: "bg-indigo-100 text-indigo-800" },
];

export default function Agents() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    agentCode: "",
    notes: "",
  });

  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const createMutation = trpc.agents.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast.success("Agent created successfully");
      setFormData({ firstName: "", lastName: "", email: "", phone: "", agentCode: "", notes: "" });
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create agent");
    }
  };

  const getStageColor = (stage: string) => {
    return STAGES.find((s) => s.value === stage)?.color || "bg-gray-100 text-gray-800";
  };

  const getStageLabel = (stage: string) => {
    return STAGES.find((s) => s.value === stage)?.label || stage;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground mt-2">
            Manage your recruited agents and track their progress through the workflow.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentCode">Agent Code (Optional)</Label>
                <Input
                  id="agentCode"
                  value={formData.agentCode}
                  onChange={(e) => setFormData({ ...formData, agentCode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents Grid */}
      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
            <Card
              key={agent.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/agents/${agent.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {agent.firstName} {agent.lastName}
                    </CardTitle>
                    {agent.agentCode && (
                      <p className="text-sm text-muted-foreground mt-1">Code: {agent.agentCode}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.email && (
                  <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
                )}

                <Badge className={getStageColor(agent.currentStage)}>
                  {getStageLabel(agent.currentStage)}
                </Badge>

                {agent.licenseNumber && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">License:</span> {agent.licenseNumber}
                  </p>
                )}

                {agent.productionMilestoneDate && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Net Licensed:</span>{" "}
                    {format(new Date(agent.productionMilestoneDate), "MMM d, yyyy")}
                  </p>
                )}

                {agent.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No agents yet. Create your first recruit to get started.</p>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>Add First Agent</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
