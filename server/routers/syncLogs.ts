/**
 * Sync Logs Router Module
 * 
 * Handles sync log monitoring for scheduled sync tasks:
 * - Get recent sync logs
 * - Get paginated sync logs with filtering
 * - Get latest sync log
 * - Get today's sync logs
 * - Get weekly sync summary
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getRecentScheduledSyncLogs,
  getScheduledSyncLogs,
  getLatestScheduledSyncLog,
  getTodaySyncLogs,
  getWeeklySyncSummary,
} from "../db";

export const syncLogsRouter = router({
  // Get recent sync logs
  getRecent: protectedProcedure.input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
    }).optional()
  ).query(async ({ input }) => {
    return getRecentScheduledSyncLogs(input?.limit || 20);
  }),
  
  // Get paginated sync logs with filtering
  getPaginated: protectedProcedure.input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL']).optional(),
      syncType: z.enum(['FULL_SYNC', 'DOWNLINE_STATUS', 'CONTACT_INFO', 'CASH_FLOW', 'PRODUCTION']).optional(),
      scheduledTime: z.string().optional(),
    })
  ).query(async ({ input }) => {
    return getScheduledSyncLogs(input);
  }),
  
  // Get the latest sync log
  getLatest: protectedProcedure.query(async () => {
    return getLatestScheduledSyncLog();
  }),
  
  // Get today's sync logs
  getToday: protectedProcedure.query(async () => {
    return getTodaySyncLogs();
  }),
  
  // Get weekly sync summary for dashboard
  getWeeklySummary: protectedProcedure.query(async () => {
    return getWeeklySyncSummary();
  }),
});
