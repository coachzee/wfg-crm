import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

// Missing Licenses Modal Content
export function MissingLicensesContent() {
  const { data, isLoading } = trpc.dashboard.getMissingLicenses.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No unlicensed agents found</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Stage</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Exam Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((agent: any) => (
            <tr key={agent.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{agent.firstName} {agent.lastName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.email || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.phone || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={agent.currentStage === 'EXAM_PREP' ? 'secondary' : 'outline'}>
                  {agent.currentStage?.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{agent.examDate || 'Not scheduled'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// No Recurring Enrollment Modal Content
export function NoRecurringContent() {
  const { data, isLoading } = trpc.dashboard.getNoRecurring.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">All policies have recurring enrollment</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Premium</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.ownerName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgentName || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.productType || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.premium || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="outline">{policy.premiumFrequency || 'Unknown'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pending Issued Policies Modal Content
export function PendingIssuedContent() {
  const { data, isLoading } = trpc.dashboard.getPendingIssued.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No issued pending policies</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Insured</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Face Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.insuredName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgent || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.product || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.faceAmount || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="default" className="bg-blue-500">{policy.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// In Underwriting Policies Modal Content
export function InUnderwritingContent() {
  const { data, isLoading } = trpc.dashboard.getInUnderwriting.useQuery();
  
  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No policies in underwriting</div>;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Policy #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Insured</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Writing Agent</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Face Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((policy: any) => (
            <tr key={policy.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">{policy.policyNumber}</td>
              <td className="px-4 py-3 text-sm">{policy.insuredName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.writingAgent || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{policy.product || '-'}</td>
              <td className="px-4 py-3 text-sm text-right">${Number(policy.faceAmount || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">{policy.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
