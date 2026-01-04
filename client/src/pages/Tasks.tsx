import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TASK_TYPES = [
  "EXAM_PREP_FOLLOW_UP",
  "LICENSE_VERIFICATION",
  "PRODUCT_TRAINING",
  "BUSINESS_LAUNCH_PREP",
  "RENEWAL_REMINDER",
  "CHARGEBACK_MONITORING",
  "GENERAL_FOLLOW_UP",
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-blue-100 text-blue-800" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "HIGH", label: "High", color: "bg-red-100 text-red-800" },
];

export default function Tasks() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [formData, setFormData] = useState({
    taskType: "GENERAL_FOLLOW_UP",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "MEDIUM",
    description: "",
    agentId: "",
    clientId: "",
  });

  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery({
    completed: filter === "completed" ? true : filter === "pending" ? false : undefined,
  });

  const createMutation = trpc.tasks.create.useMutation();
  const completeMutation = trpc.tasks.complete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        taskType: formData.taskType as any,
        dueDate: new Date(formData.dueDate),
        priority: formData.priority as any,
        description: formData.description || undefined,
        agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      });
      toast.success("Task created successfully");
      setFormData({
        taskType: "GENERAL_FOLLOW_UP",
        dueDate: new Date().toISOString().split("T")[0],
        priority: "MEDIUM",
        description: "",
        agentId: "",
        clientId: "",
      });
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeMutation.mutateAsync(taskId);
      toast.success("Task marked as complete");
      refetch();
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.color || "bg-gray-100 text-gray-800";
  };

  const isTaskOverdue = (dueDate: Date) => {
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups & Tasks</h1>
          <p className="text-muted-foreground mt-2">
            Manage follow-up tasks across all workflow stages.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <Select value={formData.taskType} onValueChange={(value) => setFormData({ ...formData, taskType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID (Optional)</Label>
                <Input
                  id="agentId"
                  type="number"
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID (Optional)</Label>
                <Input
                  id="clientId"
                  type="number"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <Card key={task.id} className={isTaskOverdue(task.dueDate) ? "border-red-300 bg-red-50" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="mt-1 flex-shrink-0"
                        disabled={completeMutation.isPending}
                      >
                        {task.completedAt ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{task.taskType.replace(/_/g, " ")}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {isTaskOverdue(task.dueDate) && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                          {task.completedAt && (
                            <span>Completed: {format(new Date(task.completedAt), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No {filter === "all" ? "" : filter} tasks found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
