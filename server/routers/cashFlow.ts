/**
 * Cash Flow Router Module
 * 
 * Handles cash flow management for Net Licensed tracking:
 * - Get all cash flow records
 * - Get Net Licensed agents
 * - Upsert/bulk upsert cash flow records
 * - Clear all records for full resync
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getAllCashFlowRecords,
  getNetLicensedAgents,
  upsertCashFlowRecord,
  bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords,
} from "../db";

export const cashFlowRouter = router({
  // Get all cash flow records
  getAll: protectedProcedure.query(async () => {
    return getAllCashFlowRecords();
  }),
  
  // Get Net Licensed agents (calculated from database)
  getNetLicensed: protectedProcedure.query(async () => {
    return getNetLicensedAgents();
  }),
  
  // Upsert a single cash flow record
  upsert: protectedProcedure.input(
    z.object({
      agentCode: z.string(),
      agentName: z.string(),
      titleLevel: z.string().optional(),
      uplineSMD: z.string().optional(),
      cashFlowAmount: z.string(),
      cumulativeCashFlow: z.string(),
      paymentDate: z.string().optional(),
      paymentCycle: z.string().optional(),
      reportPeriod: z.string().optional(),
    })
  ).mutation(async ({ input }) => {
    return upsertCashFlowRecord({
      agentCode: input.agentCode,
      agentName: input.agentName,
      titleLevel: input.titleLevel,
      uplineSMD: input.uplineSMD,
      cashFlowAmount: input.cashFlowAmount,
      cumulativeCashFlow: input.cumulativeCashFlow,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
      paymentCycle: input.paymentCycle,
      reportPeriod: input.reportPeriod,
    });
  }),
  
  // Bulk upsert cash flow records (from MyWFG sync)
  bulkUpsert: protectedProcedure.input(
    z.object({
      records: z.array(z.object({
        agentCode: z.string(),
        agentName: z.string(),
        titleLevel: z.string().optional(),
        uplineSMD: z.string().optional(),
        cashFlowAmount: z.string(),
        cumulativeCashFlow: z.string(),
        paymentDate: z.string().optional(),
        paymentCycle: z.string().optional(),
        reportPeriod: z.string().optional(),
      })),
    })
  ).mutation(async ({ input }) => {
    return bulkUpsertCashFlowRecords(input.records.map(r => ({
      agentCode: r.agentCode,
      agentName: r.agentName,
      titleLevel: r.titleLevel,
      uplineSMD: r.uplineSMD,
      cashFlowAmount: r.cashFlowAmount,
      cumulativeCashFlow: r.cumulativeCashFlow,
      paymentDate: r.paymentDate,
      paymentCycle: r.paymentCycle,
      reportPeriod: r.reportPeriod,
    })));
  }),
  
  // Clear all cash flow records (for full resync)
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return clearAllCashFlowRecords();
  }),
});
