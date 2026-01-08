import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Users, DollarSign } from "lucide-react";

interface Policy {
  id: number;
  policyNumber: string;
  ownerName: string;
  premium: string;
  targetPremium?: string;
  faceAmount?: string;
  writingAgentName?: string;
  writingAgentCode?: string;
  writingAgentLevel?: number;
  writingAgentSplit?: number;
}

interface BulkPolicyUpdateDialogProps {
  policies: Policy[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const COMMISSION_LEVELS = [
  { value: "25", label: "25% - Training Associate" },
  { value: "35", label: "35% - Associate" },
  { value: "45", label: "45% - Senior Associate" },
  { value: "55", label: "55% - Marketing Director" },
  { value: "65", label: "65% - Senior MD" },
  { value: "70", label: "70% - Executive MD" },
  { value: "75", label: "75% - CEO MD" },
];

export default function BulkPolicyUpdateDialog({
  policies,
  open,
  onOpenChange,
  onUpdate,
}: BulkPolicyUpdateDialogProps) {
  const [selectedPolicies, setSelectedPolicies] = useState<number[]>([]);
  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [agentLevel, setAgentLevel] = useState("55");
  const [agentSplit, setAgentSplit] = useState("100");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState<{ success: number; failed: number } | null>(null);

  const updatePolicy = trpc.inforcePolicies.updatePolicy.useMutation();

  // Toggle all policies
  const toggleAll = () => {
    if (selectedPolicies.length === policies.length) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(policies.map((p) => p.id));
    }
  };

  // Toggle single policy
  const togglePolicy = (id: number) => {
    setSelectedPolicies((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Calculate preview commission for selected policies
  const previewCommission = useMemo(() => {
    const selected = policies.filter((p) => selectedPolicies.includes(p.id));
    const level = parseFloat(agentLevel) / 100;
    const split = parseFloat(agentSplit) / 100;

    return selected.reduce((total, policy) => {
      const premium = parseFloat(policy.targetPremium || policy.premium || "0");
      const commission = premium * 1.25 * level * split;
      return total + commission;
    }, 0);
  }, [selectedPolicies, policies, agentLevel, agentSplit]);

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedPolicies.length === 0) {
      toast.error("Please select at least one policy");
      return;
    }

    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    setIsUpdating(true);
    setUpdateResults(null);

    let success = 0;
    let failed = 0;

    for (const policyId of selectedPolicies) {
      try {
        const policy = policies.find(p => p.id === policyId);
        if (!policy) continue;
        
        await updatePolicy.mutateAsync({
          policyNumber: policy.policyNumber,
          writingAgentName: agentName.trim(),
          writingAgentCode: agentCode.trim() || undefined,
          writingAgentLevel: parseFloat(agentLevel) / 100, // Convert to decimal
          writingAgentSplit: parseFloat(agentSplit),
        });
        success++;
      } catch (error) {
        console.error(`Failed to update policy ${policyId}:`, error);
        failed++;
      }
    }

    setUpdateResults({ success, failed });
    setIsUpdating(false);

    if (success > 0) {
      toast.success(`Updated ${success} policies successfully`);
      onUpdate();
    }

    if (failed > 0) {
      toast.error(`Failed to update ${failed} policies`);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPolicies([]);
      setAgentName("");
      setAgentCode("");
      setAgentLevel("55");
      setAgentSplit("100");
      setUpdateResults(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Update Policies
          </DialogTitle>
          <DialogDescription>
            Select policies and set the writing agent information to update them all at once.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Policies</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedPolicies.length === policies.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-1">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPolicies.includes(policy.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => togglePolicy(policy.id)}
                  >
                    <Checkbox
                      checked={selectedPolicies.includes(policy.id)}
                      onCheckedChange={() => togglePolicy(policy.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{policy.ownerName}</p>
                      <p className="text-xs text-muted-foreground">
                        #{policy.policyNumber} • ${parseFloat(policy.targetPremium || policy.premium || "0").toLocaleString()}
                      </p>
                    </div>
                    {policy.writingAgentName && (
                      <Badge variant="outline" className="text-xs">
                        {policy.writingAgentName.split(" ")[0]}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedPolicies.length} of {policies.length} policies selected
            </div>
          </div>

          {/* Agent Information Form */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Agent Information</Label>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name *</Label>
                <Input
                  id="agentName"
                  placeholder="e.g., ZAID SHOPEJU"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentCode">Agent Code</Label>
                <Input
                  id="agentCode"
                  placeholder="e.g., 73DXR"
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentLevel">Commission Level</Label>
                <Select value={agentLevel} onValueChange={setAgentLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentSplit">Split Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="agentSplit"
                    type="number"
                    min="1"
                    max="100"
                    value={agentSplit}
                    onChange={(e) => setAgentSplit(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Commission Preview */}
            {selectedPolicies.length > 0 && (
              <div className="p-4 border rounded-lg bg-emerald-500/10 border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Commission Preview</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  ${previewCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on Target Premium × 125% × {agentLevel}% × {agentSplit}%
                </p>
              </div>
            )}

            {/* Update Results */}
            {updateResults && (
              <div className={`p-4 border rounded-lg ${
                updateResults.failed === 0 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <div className="flex items-center gap-2">
                  {updateResults.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="font-medium">
                    {updateResults.success} updated, {updateResults.failed} failed
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={isUpdating || selectedPolicies.length === 0 || !agentName.trim()}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              `Update ${selectedPolicies.length} Policies`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
