import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STAGES, WorkflowStage } from "./constants";

export const StageBadge = memo(function StageBadge({ stage, count }: { stage: WorkflowStage; count: number }) {
  const config = WORKFLOW_STAGES[stage];
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
      <div className="flex items-center gap-3">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      <Badge variant="secondary" className="font-semibold">{count}</Badge>
    </div>
  );
});

export default StageBadge;
