/**
 * Inforce Policies Router Module
 * 
 * Handles Transamerica Production Data:
 * - List all inforce policies
 * - Get policy by number
 * - Get production summary
 * - Get top producers
 * - Update policy with Target Premium and Split Agent data
 * - Bulk update policies
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { inforcePolicies } from "../../drizzle/schema";
import { 
  getDb,
  getInforcePolicies,
  getInforcePolicyByNumber,
  getProductionSummary,
  getTopProducersByPremium,
  getProductionByWritingAgent,
  getTopAgentsByCommission,
} from "../db";

export const inforcePoliciesRouter = router({
  // Get all inforce policies
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      agentId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getInforcePolicies(input);
    }),
  
  // Get inforce policy by policy number
  getByPolicyNumber: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return getInforcePolicyByNumber(input);
    }),
  
  // Get production summary for dashboard
  getSummary: protectedProcedure
    .query(async () => {
      return getProductionSummary();
    }),
  
  // Get top producers by premium
  getTopProducers: protectedProcedure
    .input(z.number().optional())
    .query(async ({ input }) => {
      return getTopProducersByPremium(input || 10);
    }),
  
  // Get production by writing agent
  getByWritingAgent: protectedProcedure
    .query(async () => {
      return getProductionByWritingAgent();
    }),
  
  // Get top agents by commission
  getTopAgentsByCommission: protectedProcedure
    .input(z.number().optional())
    .query(async ({ input }) => {
      return getTopAgentsByCommission(input || 10);
    }),
  
  // Update policy with Target Premium and Split Agent data
  updatePolicy: protectedProcedure
    .input(z.object({
      policyNumber: z.string(),
      targetPremium: z.number().optional(),
      writingAgentName: z.string().optional(),
      writingAgentCode: z.string().optional(),
      writingAgentSplit: z.number().min(0).max(100).optional(),
      writingAgentLevel: z.number().min(0).max(1).optional(),
      secondAgentName: z.string().optional().nullable(),
      secondAgentCode: z.string().optional().nullable(),
      secondAgentSplit: z.number().min(0).max(100).optional().nullable(),
      secondAgentLevel: z.number().min(0).max(1).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const existing = await getInforcePolicyByNumber(input.policyNumber);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy not found' });
      }
      
      // Calculate commissions based on Target Premium
      const targetPremium = input.targetPremium || parseFloat(existing.targetPremium?.toString() || existing.premium?.toString() || '0');
      const multiplier = 1.25; // 125% Transamerica multiplier
      
      const writingAgentSplit = input.writingAgentSplit ?? existing.writingAgentSplit ?? 100;
      const writingAgentLevel = input.writingAgentLevel ?? parseFloat(existing.writingAgentLevel?.toString() || '0.65');
      const writingAgentCommission = targetPremium * multiplier * writingAgentLevel * (writingAgentSplit / 100);
      
      let secondAgentCommission: number | null = null;
      const secondAgentSplit = input.secondAgentSplit ?? existing.secondAgentSplit ?? 0;
      const secondAgentLevel = input.secondAgentLevel ?? parseFloat(existing.secondAgentLevel?.toString() || '0.25');
      if (secondAgentSplit > 0) {
        secondAgentCommission = targetPremium * multiplier * secondAgentLevel * (secondAgentSplit / 100);
      }
      
      // Total commission (sum of both agents)
      const totalCommission = writingAgentCommission + (secondAgentCommission || 0);
      
      await db.update(inforcePolicies)
        .set({
          targetPremium: targetPremium.toString(),
          writingAgentName: input.writingAgentName ?? existing.writingAgentName,
          writingAgentCode: input.writingAgentCode ?? existing.writingAgentCode,
          writingAgentSplit: writingAgentSplit,
          writingAgentLevel: writingAgentLevel.toString(),
          writingAgentCommission: writingAgentCommission.toString(),
          secondAgentName: input.secondAgentName ?? existing.secondAgentName,
          secondAgentCode: input.secondAgentCode ?? existing.secondAgentCode,
          secondAgentSplit: secondAgentSplit,
          secondAgentLevel: secondAgentLevel.toString(),
          secondAgentCommission: secondAgentCommission?.toString() || null,
          calculatedCommission: totalCommission.toString(),
          updatedAt: new Date(),
        })
        .where(eq(inforcePolicies.policyNumber, input.policyNumber));
      
      return getInforcePolicyByNumber(input.policyNumber);
    }),
  
  // Bulk update policies with Target Premium data
  bulkUpdateTargetPremium: protectedProcedure
    .input(z.array(z.object({
      policyNumber: z.string(),
      targetPremium: z.number(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      let updated = 0;
      for (const policy of input) {
        const existing = await getInforcePolicyByNumber(policy.policyNumber);
        if (existing) {
          const multiplier = 1.25;
          const writingAgentLevel = parseFloat(existing.writingAgentLevel?.toString() || '0.65');
          const writingAgentSplit = existing.writingAgentSplit ?? 100;
          const writingAgentCommission = policy.targetPremium * multiplier * writingAgentLevel * (writingAgentSplit / 100);
          
          let secondAgentCommission: number | null = null;
          const secondAgentSplit = existing.secondAgentSplit ?? 0;
          const secondAgentLevel = parseFloat(existing.secondAgentLevel?.toString() || '0.25');
          if (secondAgentSplit > 0) {
            secondAgentCommission = policy.targetPremium * multiplier * secondAgentLevel * (secondAgentSplit / 100);
          }
          
          const totalCommission = writingAgentCommission + (secondAgentCommission || 0);
          
          await db.update(inforcePolicies)
            .set({
              targetPremium: policy.targetPremium.toString(),
              writingAgentCommission: writingAgentCommission.toString(),
              secondAgentCommission: secondAgentCommission?.toString() || null,
              calculatedCommission: totalCommission.toString(),
              updatedAt: new Date(),
            })
            .where(eq(inforcePolicies.policyNumber, policy.policyNumber));
          updated++;
        }
      }
      
      return { updated };
    }),
});
