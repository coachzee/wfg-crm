/**
 * MyWFG Router Module
 * 
 * Handles MyWFG sync operations including:
 * - Downline status sync
 * - Exam prep sync from XCEL emails
 * - Contact info sync
 * - Manual sync triggers
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getLatestSyncLog, 
  getCredentialsByUserId,
} from "../db";
import { syncExamPrepFromEmail, getExamPrepRecords } from '../xcel-exam-scraper';

export const mywfgRouter = router({
  getLatestSync: protectedProcedure.query(async () => {
    return getLatestSyncLog();
  }),

  testSync: protectedProcedure.input(
    z.object({
      validationCode: z.string().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { myWFGServiceV3 } = await import("../mywfg-service-v3");
    const creds = await getCredentialsByUserId(ctx.user.id);
    
    if (!creds) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials configured" });
    }

    try {
      const result = await myWFGServiceV3.extractData(
        creds.encryptedUsername,
        creds.encryptedPassword,
        input.validationCode
      );
      return {
        success: result.success,
        agentsExtracted: result.agentsExtracted,
        productionRecordsExtracted: result.productionRecordsExtracted,
        error: result.error,
        requiresValidation: result.requiresValidation,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Test sync failed" });
    }
  }),

  manualSync: protectedProcedure.input(
    z.object({
      validationCode: z.string().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { runMyWFGSync } = await import("../mywfg-sync-job");
    return runMyWFGSync(ctx.user.id, input.validationCode);
  }),

  // Sync agents from MyWFG Downline Status report
  syncDownlineStatus: protectedProcedure.mutation(async () => {
    const { fetchDownlineStatus, syncAgentsFromDownlineStatus } = await import("../mywfg-downline-scraper");
    const { getDb } = await import("../db");
    const schema = await import("../../drizzle/schema");
    
    console.log("[Manual Sync] Starting Downline Status sync...");
    
    const fetchResult = await fetchDownlineStatus();
    
    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error || "Failed to fetch downline status",
        agentsFetched: 0,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0,
      };
    }
    
    console.log(`[Manual Sync] Fetched ${fetchResult.agents.length} agents from MyWFG`);
    
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsFetched: fetchResult.agents.length,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0,
      };
    }
    
    const syncResult = await syncAgentsFromDownlineStatus(db, schema);
    
    console.log(`[Manual Sync] Sync completed - Added: ${syncResult.added}, Updated: ${syncResult.updated}, Deactivated: ${syncResult.deactivated}, Reactivated: ${syncResult.reactivated}`);
    
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsFetched: fetchResult.agents.length,
      agentsAdded: syncResult.added,
      agentsUpdated: syncResult.updated,
      agentsDeactivated: syncResult.deactivated,
      agentsReactivated: syncResult.reactivated,
    };
  }),
  
  // Sync exam prep status from XCEL Solutions emails
  syncExamPrep: protectedProcedure.mutation(async () => {
    console.log("[Manual Sync] Starting Exam Prep sync from XCEL emails...");
    
    const result = await syncExamPrepFromEmail();
    
    console.log(`[Manual Sync] Exam Prep sync completed - Found: ${result.recordsFound}, Matched: ${result.recordsMatched}, Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
    
    return result;
  }),
  
  // Get all exam prep records
  getExamPrepRecords: protectedProcedure.query(async () => {
    return getExamPrepRecords();
  }),
  
  // Sync contact info for agents with missing data
  syncContactInfo: protectedProcedure.mutation(async () => {
    const { syncContactInfoFromMyWFG } = await import("../mywfg-downline-scraper");
    const { getDb } = await import("../db");
    const schema = await import("../../drizzle/schema");
    
    console.log("[Manual Sync] Starting Contact Info sync...");
    
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsUpdated: 0,
      };
    }
    
    const syncResult = await syncContactInfoFromMyWFG(db, schema, 15);
    
    console.log(`[Manual Sync] Contact sync completed - Updated: ${syncResult.updated}`);
    
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsUpdated: syncResult.updated,
    };
  }),
});
