import { 
  UserPlus, Clock, Award, Activity, Zap, Target, Users, CheckCircle 
} from "lucide-react";

// Stage configuration with colors and labels
export const WORKFLOW_STAGES = {
  RECRUITMENT: { color: "#ef4444", label: "Recruitment", icon: UserPlus },
  EXAM_PREP: { color: "#f97316", label: "Exam Prep", icon: Clock },
  LICENSED: { color: "#eab308", label: "Licensed", icon: Award },
  PRODUCT_TRAINING: { color: "#3b82f6", label: "Product Training", icon: Activity },
  BUSINESS_LAUNCH: { color: "#8b5cf6", label: "Business Launch", icon: Zap },
  NET_LICENSED: { color: "#10b981", label: "Net Licensed", icon: Target },
  CLIENT_TRACKING: { color: "#06b6d4", label: "Client Tracking", icon: Users },
  CHARGEBACK_PROOF: { color: "#6366f1", label: "Chargeback Proof", icon: CheckCircle },
} as const;

export type WorkflowStage = keyof typeof WORKFLOW_STAGES;
