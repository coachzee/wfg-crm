/**
 * Pending Policies Router Module
 * 
 * Handles Transamerica Life Access pending policies:
 * - List all pending policies with requirements
 * - Get summary stats for dashboard
 * - Get single policy by number
 * - Upsert policy with requirements
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getPendingPoliciesWithRequirements,
  getPendingPolicySummary,
  getPendingPolicyByNumber,
  getPendingRequirementsByPolicyId,
  upsertPendingPolicy,
  clearPendingRequirements,
  bulkInsertPendingRequirements,
} from "../db";

const RequirementSchema = z.object({
  dateRequested: z.string().optional(),
  requirementOn: z.string().optional(),
  status: z.string().optional(),
  requirement: z.string().optional(),
  instruction: z.string().optional(),
  comments: z.string().optional(),
});

export const pendingPoliciesRouter = router({
  // Get all pending policies with requirements
  list: protectedProcedure.query(async () => {
    return getPendingPoliciesWithRequirements();
  }),
  
  // Get summary stats for dashboard
  summary: protectedProcedure.query(async () => {
    return getPendingPolicySummary();
  }),
  
  // Get single policy by policy number
  getByNumber: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const policy = await getPendingPolicyByNumber(input);
      if (!policy) return null;
      const requirements = await getPendingRequirementsByPolicyId(policy.id);
      return {
        ...policy,
        requirements: {
          pendingWithProducer: requirements.filter(r => r.category === "Pending with Producer"),
          pendingWithTransamerica: requirements.filter(r => r.category === "Pending with Transamerica"),
          completed: requirements.filter(r => r.category === "Completed"),
        },
      };
    }),
  
  // Upsert a pending policy with requirements
  upsert: protectedProcedure
    .input(z.object({
      policyNumber: z.string(),
      ownerName: z.string(),
      productType: z.string().optional(),
      faceAmount: z.string().optional(),
      deathBenefitOption: z.string().optional(),
      moneyReceived: z.string().optional(),
      premium: z.string().optional(),
      premiumFrequency: z.string().optional(),
      issueDate: z.string().optional(),
      submittedDate: z.string().optional(),
      policyClosureDate: z.string().optional(),
      policyDeliveryTrackingNumber: z.string().optional(),
      status: z.enum(["Pending", "Issued", "Incomplete", "Post Approval Processing", "Declined", "Withdrawn"]),
      statusAsOf: z.string().optional(),
      underwritingDecision: z.string().optional(),
      underwriter: z.string().optional(),
      riskClass: z.string().optional(),
      agentCode: z.string().optional(),
      agentName: z.string().optional(),
      requirements: z.object({
        pendingWithProducer: z.array(RequirementSchema),
        pendingWithTransamerica: z.array(RequirementSchema),
        completed: z.array(RequirementSchema),
      }),
    }))
    .mutation(async ({ input }) => {
      const { requirements, ...policyData } = input;
      
      // Upsert the policy
      const policy = await upsertPendingPolicy(policyData as any);
      if (!policy) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upsert policy" });
      
      // Clear existing requirements and insert new ones
      await clearPendingRequirements(policy.id);
      
      const allRequirements = [
        ...requirements.pendingWithProducer.map(r => ({ ...r, policyId: policy.id, category: "Pending with Producer" as const })),
        ...requirements.pendingWithTransamerica.map(r => ({ ...r, policyId: policy.id, category: "Pending with Transamerica" as const })),
        ...requirements.completed.map(r => ({ ...r, policyId: policy.id, category: "Completed" as const })),
      ];
      
      if (allRequirements.length > 0) {
        await bulkInsertPendingRequirements(allRequirements);
      }
      
      return policy;
    }),
});
