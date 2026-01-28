/**
 * Production Router Module
 * 
 * Handles production records:
 * - List all production records
 * - Get production records by agent
 * - Create production record
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getProductionRecords, createProductionRecord, getDb } from "../db";
import { productionRecords } from "../../drizzle/schema";

const ProductionRecordSchema = z.object({
  agentId: z.number(),
  policyNumber: z.string(),
  policyType: z.string(),
  commissionAmount: z.string().optional(),
  premiumAmount: z.string().optional(),
  issueDate: z.date(),
});

export const productionRouter = router({
  // List all production records
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(productionRecords);
  }),

  // Get production records by agent
  getByAgent: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getProductionRecords(input);
    }),

  // Create a production record
  create: protectedProcedure.input(ProductionRecordSchema).mutation(async ({ input }) => {
    return createProductionRecord({
      ...input,
    });
  }),
});

export { ProductionRecordSchema };
