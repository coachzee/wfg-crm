import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target, Plus, Pencil, Trash2, TrendingUp, CheckCircle2,
  AlertCircle, DollarSign, Users, FileText, Shield, BarChart3
} from "lucide-react";
import { toast } from "sonner";

const METRIC_OPTIONS = [
  { key: "new_agents", label: "New Agents Recruited", unit: "count", icon: "Users" },
  { key: "policies_written", label: "Policies Written", unit: "count", icon: "FileText" },
  { key: "cash_flow", label: "Cash Flow Target", unit: "currency", icon: "DollarSign" },
  { key: "families_protected", label: "Families Protected", unit: "count", icon: "Shield" },
  { key: "licensed_agents", label: "Licensed Agents", unit: "count", icon: "Shield" },
  { key: "face_amount", label: "Face Amount Written", unit: "currency", icon: "DollarSign" },
  { key: "tasks_completed", label: "Tasks Completed", unit: "count", icon: "CheckCircle2" },
  { key: "custom", label: "Custom Goal", unit: "count", icon: "Target" },
];

const PERIOD_TYPES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

function getIconComponent(iconName?: string | null) {
  switch (iconName) {
    case "Users": return <Users className="h-4 w-4" />;
    case "FileText": return <FileText className="h-4 w-4" />;
    case "DollarSign": return <DollarSign className="h-4 w-4" />;
    case "Shield": return <Shield className="h-4 w-4" />;
    case "CheckCircle2": return <CheckCircle2 className="h-4 w-4" />;
    case "BarChart3": return <BarChart3 className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
}

function formatValue(value: number, unit: string): string {
  if (unit === "currency") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
  if (unit === "percentage") {
    return `${value}%`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 75) return "bg-blue-500";
  if (percent >= 50) return "bg-amber-500";
  if (percent >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
    case "MISSED":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Missed</Badge>;
    case "ARCHIVED":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Archived</Badge>;
    default:
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Active</Badge>;
  }
}

interface GoalFormData {
  metricKey: string;
  title: string;
  description: string;
  targetValue: string;
  unit: string;
  periodType: string;
  periodMonth: number;
  periodQuarter: number;
  periodYear: number;
  color: string;
  icon: string;
}

function GoalForm({ onSubmit, initialData, isEditing = false }: {
  onSubmit: (data: GoalFormData) => void;
  initialData?: GoalFormData;
  isEditing?: boolean;
}) {
  const now = new Date();
  const [form, setForm] = useState<GoalFormData>(initialData || {
    metricKey: "new_agents",
    title: "",
    description: "",
    targetValue: "",
    unit: "count",
    periodType: "MONTHLY",
    periodMonth: now.getMonth() + 1,
    periodQuarter: Math.ceil((now.getMonth() + 1) / 3),
    periodYear: now.getFullYear(),
    color: "primary",
    icon: "Target",
  });

  const handleMetricChange = (key: string) => {
    const metric = METRIC_OPTIONS.find(m => m.key === key);
    setForm(prev => ({
      ...prev,
      metricKey: key,
      title: key === "custom" ? prev.title : (metric?.label || ""),
      unit: metric?.unit || "count",
      icon: metric?.icon || "Target",
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Metric Type</Label>
        <Select value={form.metricKey} onValueChange={handleMetricChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map(m => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.metricKey === "custom" && (
        <div>
          <Label>Goal Title</Label>
          <Input
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter goal title"
          />
        </div>
      )}

      <div>
        <Label>Description (optional)</Label>
        <Input
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this goal"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Target Value</Label>
          <Input
            type="number"
            value={form.targetValue}
            onChange={e => setForm(prev => ({ ...prev, targetValue: e.target.value }))}
            placeholder={form.unit === "currency" ? "50000" : "10"}
          />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={form.unit} onValueChange={v => setForm(prev => ({ ...prev, unit: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="currency">Currency ($)</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Period Type</Label>
          <Select value={form.periodType} onValueChange={v => setForm(prev => ({ ...prev, periodType: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Input
            type="number"
            value={form.periodYear}
            onChange={e => setForm(prev => ({ ...prev, periodYear: parseInt(e.target.value) || now.getFullYear() }))}
          />
        </div>
      </div>

      {form.periodType === "MONTHLY" && (
        <div>
          <Label>Month</Label>
          <Select value={String(form.periodMonth)} onValueChange={v => setForm(prev => ({ ...prev, periodMonth: parseInt(v) }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {new Date(2024, i).toLocaleString("en-US", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.periodType === "QUARTERLY" && (
        <div>
          <Label>Quarter</Label>
          <Select value={String(form.periodQuarter)} onValueChange={v => setForm(prev => ({ ...prev, periodQuarter: parseInt(v) }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
              <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
              <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
              <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={() => onSubmit(form)} className="w-full">
        {isEditing ? "Update Goal" : "Create Goal"}
      </Button>
    </div>
  );
}

export function GoalTracker() {

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [editProgressId, setEditProgressId] = useState<number | null>(null);
  const [progressValue, setProgressValue] = useState("");

  const utils = trpc.useUtils();
  const { data: activeGoals, isLoading } = trpc.goals.active.useQuery();

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.active.invalidate();
      utils.goals.list.invalidate();
      setShowCreateDialog(false);
      toast.success("Goal created", { description: "Your new goal has been added." });
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const updateProgressMutation = trpc.goals.updateProgress.useMutation({
    onSuccess: () => {
      utils.goals.active.invalidate();
      utils.goals.list.invalidate();
      setEditProgressId(null);
      setProgressValue("");
      toast.success("Progress updated");
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.active.invalidate();
      utils.goals.list.invalidate();
      toast.success("Goal deleted");
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    },
  });

  const handleCreate = (data: GoalFormData) => {
    createMutation.mutate({
      metricKey: data.metricKey,
      title: data.metricKey === "custom" ? data.title : (METRIC_OPTIONS.find(m => m.key === data.metricKey)?.label || data.title),
      description: data.description || undefined,
      targetValue: data.targetValue,
      unit: data.unit as "count" | "currency" | "percentage",
      periodType: data.periodType as "MONTHLY" | "QUARTERLY" | "YEARLY",
      periodMonth: data.periodType === "MONTHLY" ? data.periodMonth : undefined,
      periodQuarter: data.periodType === "QUARTERLY" ? data.periodQuarter : undefined,
      periodYear: data.periodYear,
      color: data.color,
      icon: data.icon,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold">Goal Tracking</CardTitle>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>
                  Set a target for a key metric to track your progress.
                </DialogDescription>
              </DialogHeader>
              <GoalForm onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {(!activeGoals || activeGoals.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No active goals</p>
            <p className="text-xs mt-1">Set monthly targets to track your team's progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const target = parseFloat(String(goal.targetValue));
              const current = parseFloat(String(goal.currentValue));
              const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
              const isEditing = editProgressId === goal.id;

              return (
                <div key={goal.id} className="group relative rounded-lg border border-border/50 p-4 hover:border-border transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        {getIconComponent(goal.icon)}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.periodType === "MONTHLY" && `${new Date(2024, (goal.periodMonth || 1) - 1).toLocaleString("en-US", { month: "short" })} ${goal.periodYear}`}
                          {goal.periodType === "QUARTERLY" && `Q${goal.periodQuarter} ${goal.periodYear}`}
                          {goal.periodType === "YEARLY" && `${goal.periodYear}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditProgressId(goal.id);
                            setProgressValue(String(current));
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this goal?")) {
                            deleteMutation.mutate({ id: goal.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">
                        {formatValue(current, goal.unit)} of {formatValue(target, goal.unit)}
                      </span>
                      <span className={`font-semibold ${percent >= 100 ? "text-emerald-600" : percent >= 50 ? "text-blue-600" : "text-amber-600"}`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline progress editor */}
                  {isEditing && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        type="number"
                        value={progressValue}
                        onChange={e => setProgressValue(e.target.value)}
                        placeholder="Current value"
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          updateProgressMutation.mutate({
                            id: goal.id,
                            currentValue: progressValue,
                          });
                        }}
                        disabled={updateProgressMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setEditProgressId(null);
                          setProgressValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Status indicator for completed */}
                  {percent >= 100 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Goal achieved!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
