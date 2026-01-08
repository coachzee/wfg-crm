import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, Users, Calculator, Save, Loader2 } from "lucide-react";

interface PolicyDetailDialogProps {
  policy: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const AGENT_LEVELS = [
  { value: "0.25", label: "25% (Training Associate)" },
  { value: "0.35", label: "35% (Associate)" },
  { value: "0.45", label: "45% (Senior Associate)" },
  { value: "0.55", label: "55% (Marketing Director)" },
  { value: "0.65", label: "65% (SMD+)" },
];

export default function PolicyDetailDialog({ 
  policy, 
  open, 
  onOpenChange,
  onUpdate 
}: PolicyDetailDialogProps) {
  const [targetPremium, setTargetPremium] = useState("");
  const [writingAgentName, setWritingAgentName] = useState("");
  const [writingAgentCode, setWritingAgentCode] = useState("");
  const [writingAgentSplit, setWritingAgentSplit] = useState("");
  const [writingAgentLevel, setWritingAgentLevel] = useState("0.55");
  const [secondAgentName, setSecondAgentName] = useState("");
  const [secondAgentCode, setSecondAgentCode] = useState("");
  const [secondAgentSplit, setSecondAgentSplit] = useState("");
  const [secondAgentLevel, setSecondAgentLevel] = useState("0.25");

  const utils = trpc.useUtils();
  const updateMutation = trpc.inforcePolicies.updatePolicy.useMutation({
    onSuccess: () => {
      toast.success("Policy updated successfully");
      utils.inforcePolicies.list.invalidate();
      utils.inforcePolicies.getSummary.invalidate();
      utils.inforcePolicies.getTopProducers.invalidate();
      onUpdate?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });

  // Initialize form values when policy changes
  useEffect(() => {
    if (policy) {
      setTargetPremium(policy.targetPremium?.toString() || policy.premium?.toString() || "");
      setWritingAgentName(policy.writingAgentName || "");
      setWritingAgentCode(policy.writingAgentCode || "");
      setWritingAgentSplit(policy.writingAgentSplit?.toString() || "100");
      setWritingAgentLevel(policy.writingAgentLevel?.toString() || "0.55");
      setSecondAgentName(policy.secondAgentName || "");
      setSecondAgentCode(policy.secondAgentCode || "");
      setSecondAgentSplit(policy.secondAgentSplit?.toString() || "0");
      setSecondAgentLevel(policy.secondAgentLevel?.toString() || "0.25");
    }
  }, [policy]);

  // Calculate commissions
  const targetPremiumNum = parseFloat(targetPremium) || 0;
  const multiplier = 1.25;
  const agent1Split = parseFloat(writingAgentSplit) || 0;
  const agent1Level = parseFloat(writingAgentLevel) || 0.55;
  const agent2Split = parseFloat(secondAgentSplit) || 0;
  const agent2Level = parseFloat(secondAgentLevel) || 0.25;

  const agent1Commission = targetPremiumNum * multiplier * agent1Level * (agent1Split / 100);
  const agent2Commission = agent2Split > 0 ? targetPremiumNum * multiplier * agent2Level * (agent2Split / 100) : 0;
  const totalCommission = agent1Commission + agent2Commission;

  const handleSave = () => {
    updateMutation.mutate({
      policyNumber: policy.policyNumber,
      targetPremium: parseFloat(targetPremium) || undefined,
      writingAgentName: writingAgentName || undefined,
      writingAgentCode: writingAgentCode || undefined,
      writingAgentSplit: parseFloat(writingAgentSplit) || undefined,
      writingAgentLevel: parseFloat(writingAgentLevel) || undefined,
      secondAgentName: secondAgentName || null,
      secondAgentCode: secondAgentCode || null,
      secondAgentSplit: parseFloat(secondAgentSplit) || null,
      secondAgentLevel: parseFloat(secondAgentLevel) || null,
    });
  };

  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Edit Policy Details
          </DialogTitle>
          <DialogDescription>
            Update Target Premium and Split Agent information for accurate commission calculations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Policy Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Policy Number:</span>
                  <span className="ml-2 font-mono font-medium">{policy.policyNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="ml-2 font-medium">{policy.ownerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Face Amount:</span>
                  <span className="ml-2 font-medium">${parseFloat(policy.faceAmount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Billed Premium:</span>
                  <span className="ml-2 font-medium">${parseFloat(policy.premium || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Premium */}
          <div className="space-y-2">
            <Label htmlFor="targetPremium" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Target Premium (from Policy Guidelines)
            </Label>
            <Input
              id="targetPremium"
              type="number"
              value={targetPremium}
              onChange={(e) => setTargetPremium(e.target.value)}
              placeholder="Enter target premium amount"
              className="text-lg font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Transamerica: Policy Detail → Payment → Policy Guidelines → Target Premium
            </p>
          </div>

          <Separator />

          {/* Primary Writing Agent */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">Primary Writing Agent</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent1Name">Agent Name</Label>
                <Input
                  id="agent1Name"
                  value={writingAgentName}
                  onChange={(e) => setWritingAgentName(e.target.value)}
                  placeholder="e.g., ZAID SHOPEJU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent1Code">Agent Code</Label>
                <Input
                  id="agent1Code"
                  value={writingAgentCode}
                  onChange={(e) => setWritingAgentCode(e.target.value)}
                  placeholder="e.g., 73DXR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent1Split">Split %</Label>
                <Input
                  id="agent1Split"
                  type="number"
                  min="0"
                  max="100"
                  value={writingAgentSplit}
                  onChange={(e) => setWritingAgentSplit(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent1Level">Commission Level</Label>
                <Select value={writingAgentLevel} onValueChange={setWritingAgentLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Secondary Writing Agent (Split) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">Secondary Writing Agent (if split)</h4>
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent2Name">Agent Name</Label>
                <Input
                  id="agent2Name"
                  value={secondAgentName}
                  onChange={(e) => setSecondAgentName(e.target.value)}
                  placeholder="e.g., OLUSEYI OGUNLOLU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent2Code">Agent Code</Label>
                <Input
                  id="agent2Code"
                  value={secondAgentCode}
                  onChange={(e) => setSecondAgentCode(e.target.value)}
                  placeholder="e.g., 49AEA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent2Split">Split %</Label>
                <Input
                  id="agent2Split"
                  type="number"
                  min="0"
                  max="100"
                  value={secondAgentSplit}
                  onChange={(e) => setSecondAgentSplit(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent2Level">Commission Level</Label>
                <Select value={secondAgentLevel} onValueChange={setSecondAgentLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Commission Preview */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Commission Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Formula: Target Premium × 125% × Agent Level × Split %
              </div>
              <div className="space-y-2">
                {agent1Split > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {writingAgentName || "Primary Agent"} ({agent1Split}% × {(agent1Level * 100).toFixed(0)}%)
                    </span>
                    <span className="font-bold text-emerald-700">${agent1Commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {agent2Split > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {secondAgentName || "Secondary Agent"} ({agent2Split}% × {(agent2Level * 100).toFixed(0)}%)
                    </span>
                    <span className="font-bold text-emerald-700">${agent2Commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Commission</span>
                  <span className="text-xl font-bold text-emerald-700">${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
