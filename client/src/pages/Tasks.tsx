import { useState, useMemo, useCallback, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, Search, Calendar, Clock, CheckCircle2, 
  Circle, AlertCircle, Trash2, ListTodo
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from "date-fns";

// Task type configuration
const TASK_TYPES = {
  EXAM_PREP_FOLLOW_UP: { label: "Exam Prep Follow-up", color: "bg-orange-500" },
  LICENSE_VERIFICATION: { label: "License Verification", color: "bg-yellow-500" },
  PRODUCT_TRAINING: { label: "Product Training", color: "bg-blue-500" },
  BUSINESS_LAUNCH_PREP: { label: "Business Launch Prep", color: "bg-violet-500" },
  RENEWAL_REMINDER: { label: "Renewal Reminder", color: "bg-cyan-500" },
  CHARGEBACK_MONITORING: { label: "Chargeback Monitoring", color: "bg-indigo-500" },
  GENERAL_FOLLOW_UP: { label: "General Follow-up", color: "bg-gray-500" },
} as const;

type TaskType = keyof typeof TASK_TYPES;

// Priority configuration
const PRIORITIES = {
  LOW: { label: "Low", color: "bg-slate-500", bgLight: "bg-slate-50 dark:bg-slate-950", text: "text-slate-700 dark:text-slate-300" },
  MEDIUM: { label: "Medium", color: "bg-amber-500", bgLight: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300" },
  HIGH: { label: "High", color: "bg-red-500", bgLight: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
} as const;

type Priority = keyof typeof PRIORITIES;

// Memoized priority badge
const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITIES[priority];
  if (!config) return null;
  return (
    <Badge variant="secondary" className={`${config.bgLight} ${config.text} border-0 font-medium text-xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} mr-1.5`} />
      {config.label}
    </Badge>
  );
});

// Due date display component
const DueDateDisplay = memo(function DueDateDisplay({ date, isCompleted }: { date: Date; isCompleted: boolean }) {
  const dueDate = new Date(date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && !isCompleted;
  const isDueToday = isToday(dueDate);
  const isDueTomorrow = isTomorrow(dueDate);

  let displayText = format(dueDate, "MMM d, yyyy");
  let colorClass = "text-muted-foreground";

  if (isCompleted) {
    colorClass = "text-emerald-600";
  } else if (isOverdue) {
    displayText = `Overdue (${formatDistanceToNow(dueDate, { addSuffix: true })})`;
    colorClass = "text-red-600";
  } else if (isDueToday) {
    displayText = "Due today";
    colorClass = "text-amber-600";
  } else if (isDueTomorrow) {
    displayText = "Due tomorrow";
    colorClass = "text-blue-600";
  }

  return (
    <span className={`text-sm flex items-center gap-1.5 ${colorClass}`}>
      <Calendar className="h-3.5 w-3.5" />
      {displayText}
    </span>
  );
});

// Memoized task card
const TaskCard = memo(function TaskCard({ 
  task, 
  onToggle,
  onDelete
}: { 
  task: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isCompleted = !!task.completedAt;
  const taskType = TASK_TYPES[task.taskType as TaskType];
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isCompleted;

  return (
    <Card className={`card-hover group transition-all ${isCompleted ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 dark:border-red-900' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="mt-0.5 flex-shrink-0"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {task.description || taskType?.label || task.taskType.replace(/_/g, " ")}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${taskType?.color || 'bg-gray-500'} mr-1.5`} />
                    {taskType?.label || task.taskType.replace(/_/g, " ")}
                  </Badge>
                  {task.priority && <PriorityBadge priority={task.priority as Priority} />}
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              {task.dueDate && (
                <DueDateDisplay date={task.dueDate} isCompleted={isCompleted} />
              )}
              {task.agentId && (
                <span className="text-xs text-muted-foreground">
                  Agent #{task.agentId}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Stats card
const StatsCard = memo(function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${color}`}>
      <div className="h-10 w-10 rounded-lg bg-white/80 dark:bg-black/20 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </div>
    </div>
  );
});

// Loading skeleton
function TasksSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 shimmer rounded-lg" />
        <div className="h-10 w-32 shimmer rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 shimmer rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 shimmer rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 shimmer rounded" />
                <div className="h-4 w-32 shimmer rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    taskType: "GENERAL_FOLLOW_UP" as TaskType,
    priority: "MEDIUM" as Priority,
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    agentId: "",
    clientId: "",
  });

  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery({
    completed: filter === "completed" ? true : filter === "pending" ? false : undefined,
  }, {
    staleTime: 30000,
  });
  
  const { data: agents } = trpc.agents.list.useQuery();
  
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully!");
      setIsDialogOpen(false);
      setFormData({ taskType: "GENERAL_FOLLOW_UP", priority: "MEDIUM", description: "", dueDate: new Date().toISOString().split("T")[0], agentId: "", clientId: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      toast.success("Task updated!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task: any) => {
      const matchesSearch = searchQuery === "" || 
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskType?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tasks, searchQuery]);

  // Memoized stats (from all tasks, not just filtered)
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, pending: 0, overdue: 0 };
    return {
      total: tasks.length,
      completed: tasks.filter((t: any) => t.completedAt).length,
      pending: tasks.filter((t: any) => !t.completedAt).length,
      overdue: tasks.filter((t: any) => !t.completedAt && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length,
    };
  }, [tasks]);

  // Callbacks
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate({
      taskType: formData.taskType as any,
      priority: formData.priority as any,
      description: formData.description || undefined,
      dueDate: new Date(formData.dueDate),
      agentId: formData.agentId ? parseInt(formData.agentId) : undefined,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
    });
  }, [formData, createTask]);

  const handleToggleTask = useCallback((taskId: number) => {
    completeTask.mutate(taskId);
  }, [completeTask]);

  const handleDeleteTask = useCallback((id: number) => {
    toast.info("Delete functionality coming soon");
  }, []);

  if (isLoading) {
    return <TasksSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Follow-ups</h1>
          <p className="text-muted-foreground">Manage your team's tasks and stay on top of follow-ups</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new follow-up task or reminder for your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <Select 
                  value={formData.taskType} 
                  onValueChange={(value) => setFormData({ ...formData, taskType: value as TaskType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITIES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${config.color}`} />
                            {config.label}
                          </div>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentId">Assign to Agent (Optional)</Label>
                <Select 
                  value={formData.agentId} 
                  onValueChange={(value) => setFormData({ ...formData, agentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={ListTodo} 
          label="Total Tasks" 
          value={stats.total} 
          color="bg-primary/10 text-primary"
        />
        <StatsCard 
          icon={CheckCircle2} 
          label="Completed" 
          value={stats.completed} 
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard 
          icon={Clock} 
          label="Pending" 
          value={stats.pending} 
          color="bg-amber-500/10 text-amber-600"
        />
        <StatsCard 
          icon={AlertCircle} 
          label="Overdue" 
          value={stats.overdue} 
          color="bg-red-500/10 text-red-600"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs & Task List */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <ListTodo className="h-4 w-4" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {filteredTasks.length > 0 ? (
            <div className="space-y-3 stagger-children">
              {filteredTasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task.id)}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="icon-container-lg bg-muted mb-4">
                  <ListTodo className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No tasks found</h3>
                <p className="text-muted-foreground text-center mt-1 max-w-sm">
                  {searchQuery 
                    ? "Try adjusting your search criteria"
                    : `No ${filter === "all" ? "" : filter} tasks yet. Create your first task to get started.`}
                </p>
                {!searchQuery && (
                  <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create Your First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
