/**
 * Dashboard Router
 * 
 * Handles all dashboard-related endpoints including:
 * - Stats and metrics
 * - Sync status
 * - Email tracking
 * - Policy anniversaries
 * - Compliance data
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";
import {
  getAgents,
  getWorkflowTasks,
  getLatestSyncLog,
  getDashboardMetrics,
  getAllProductionRecords,
  getMonthlyTeamCashFlow,
  getPendingPolicies,
  getInforcePolicies,
  getPolicyAnniversaries,
  getAnniversarySummary,
  createWorkflowTask,
  getMonthOverMonthComparison,
  type Agent,
  type WorkflowTask,
  type InforcePolicy,
} from "../db";
import {
  getEmailTrackingStats,
  getRecentEmailTracking,
  getAnniversaryEmailStats,
  getEmailsEligibleForResend,
  getEmailByTrackingId,
  markEmailResent,
  scheduleEmail,
  getScheduledEmails,
  cancelScheduledEmail,
  processScheduledEmails,
} from "../email-tracking";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    logger.info("Fetching dashboard stats");
    const allAgents = await getAgents();
    const allTasks = await getWorkflowTasks();
    
    const agentsByStage = {
      RECRUITMENT: allAgents.filter((a: Agent) => a.currentStage === "RECRUITMENT").length,
      EXAM_PREP: allAgents.filter((a: Agent) => a.currentStage === "EXAM_PREP").length,
      LICENSED: allAgents.filter((a: Agent) => a.currentStage === "LICENSED").length,
      PRODUCT_TRAINING: allAgents.filter((a: Agent) => a.currentStage === "PRODUCT_TRAINING").length,
      BUSINESS_LAUNCH: allAgents.filter((a: Agent) => a.currentStage === "BUSINESS_LAUNCH").length,
      NET_LICENSED: allAgents.filter((a: Agent) => a.currentStage === "NET_LICENSED").length,
      CLIENT_TRACKING: allAgents.filter((a: Agent) => a.currentStage === "CLIENT_TRACKING").length,
      CHARGEBACK_PROOF: allAgents.filter((a: Agent) => a.currentStage === "CHARGEBACK_PROOF").length,
    };
    
    const now = new Date();
    const overdueTasks = allTasks.filter((t: WorkflowTask) => !t.completedAt && t.dueDate && new Date(t.dueDate) < now);
    const taskStats = {
      total: allTasks.length,
      completed: allTasks.filter((t: WorkflowTask) => t.completedAt).length,
      pending: allTasks.filter((t: WorkflowTask) => !t.completedAt).length,
      overdue: overdueTasks.length,
    };
    
    const latestSync = await getLatestSyncLog();
    
    return {
      totalAgents: allAgents.length,
      agentsByStage,
      taskStats,
      lastSyncDate: latestSync?.syncDate,
      lastUpdated: Date.now(),
    };
  }),
  
  metrics: protectedProcedure.query(async () => {
    logger.info("Fetching dashboard metrics");
    return getDashboardMetrics();
  }),

  monthOverMonth: protectedProcedure.query(async () => {
    logger.info("Fetching month-over-month comparison");
    return getMonthOverMonthComparison();
  }),
  
  allProduction: protectedProcedure.query(async () => {
    logger.info("Fetching all production records");
    return getAllProductionRecords();
  }),
  
  syncStatus: protectedProcedure.query(async () => {
    logger.info("Fetching sync status");
    const { getSyncStatus, getPaymentCycleInfo } = await import("../mywfg-sync-data");
    return {
      ...getSyncStatus(),
      paymentCycle: getPaymentCycleInfo(),
    };
  }),
  
  monthlyCashFlow: protectedProcedure.query(async () => {
    logger.info("Fetching monthly cash flow data");
    const records = await getMonthlyTeamCashFlow("73DXR");
    return records.map(r => ({
      monthYear: r.monthYear,
      month: r.month,
      year: r.year,
      superTeamCashFlow: parseFloat(String(r.superTeamCashFlow)),
      personalCashFlow: parseFloat(String(r.personalCashFlow)),
    }));
  }),
  
  syncLogs: protectedProcedure.query(async () => {
    logger.info("Fetching recent sync logs");
    const { getRecentSyncLogs } = await import("../mywfg-sync-data");
    return getRecentSyncLogs(10);
  }),
  
  getTransamericaAlerts: protectedProcedure.query(async () => {
    logger.info("Fetching Transamerica alerts");
    const { getCurrentTransamericaAlerts } = await import("../chargeback-notification");
    return getCurrentTransamericaAlerts();
  }),

  sendChargebackNotification: protectedProcedure.mutation(async () => {
    logger.info("Sending chargeback notification");
    const { sendChargebackNotification, getCurrentTransamericaAlerts } = await import("../chargeback-notification");
    const alerts = getCurrentTransamericaAlerts();
    const success = await sendChargebackNotification(alerts);
    return { success, alertCount: alerts.reversedPremiumPayments.length + alerts.eftRemovals.length };
  }),
  
  triggerSync: protectedProcedure.mutation(async () => {
    logger.info("Triggering full sync");
    const { runFullSync, getLastSyncTime } = await import("../sync-service");
    const results = await runFullSync();
    return {
      results,
      lastSyncTime: getLastSyncTime(),
    };
  }),
  
  autoSyncStatus: protectedProcedure.query(async () => {
    logger.info("Fetching auto sync status");
    const { getLastSyncTime } = await import("../sync-service");
    const { getMyWFGCredentials, getTransamericaCredentials } = await import("../gmail-otp");
    
    const mywfgCreds = getMyWFGCredentials();
    const transamericaCreds = getTransamericaCredentials();
    
    return {
      lastSyncTime: getLastSyncTime(),
      mywfgEmailConfigured: !!mywfgCreds.email && !!mywfgCreds.appPassword,
      transamericaEmailConfigured: !!transamericaCreds.email && !!transamericaCreds.appPassword,
      mywfgLoginConfigured: !!process.env.MYWFG_USERNAME && !!process.env.MYWFG_PASSWORD,
      transamericaLoginConfigured: !!process.env.TRANSAMERICA_USERNAME && !!process.env.TRANSAMERICA_PASSWORD,
    };
  }),
  
  testGmailConnection: protectedProcedure.input(
    z.object({
      platform: z.enum(['mywfg', 'transamerica']),
    })
  ).mutation(async ({ input }) => {
    logger.info("Testing Gmail connection", { platform: input.platform });
    const { verifyGmailCredentials, getMyWFGCredentials, getTransamericaCredentials } = await import("../gmail-otp");
    
    const credentials = input.platform === 'mywfg' 
      ? getMyWFGCredentials() 
      : getTransamericaCredentials();
    
    const result = await verifyGmailCredentials(credentials);
    return result;
  }),
  
  getMissingLicenses: protectedProcedure.query(async () => {
    logger.info("Fetching agents with missing licenses");
    const allAgents = await getAgents();
    const missingLicenses = allAgents.filter((a: Agent) => 
      a.currentStage === 'RECRUITMENT' || a.currentStage === 'EXAM_PREP'
    );
    return missingLicenses.map((a: Agent) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      currentStage: a.currentStage,
      currentRank: a.currentRank,
      examDate: a.examDate,
      uplineAgentId: a.uplineAgentId,
    }));
  }),
  
  getNoRecurring: protectedProcedure.query(async () => {
    logger.info("Fetching policies without recurring premium");
    const policies = await getInforcePolicies();
    const noRecurring = policies.filter((p: InforcePolicy) => 
      !p.premiumFrequency || p.premiumFrequency === 'Annual' || p.premiumFrequency === 'Flexible'
    );
    return noRecurring.slice(0, 20).map((p: InforcePolicy) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      ownerName: p.ownerName,
      writingAgentName: p.writingAgentName,
      productType: p.productType,
      faceAmount: p.faceAmount,
      premium: p.premium,
      premiumFrequency: p.premiumFrequency,
      status: p.status,
    }));
  }),
  
  getPendingIssued: protectedProcedure.query(async () => {
    logger.info("Fetching pending issued policies");
    const pending = await getPendingPolicies();
    const issued = pending.filter((p: any) => 
      p.status?.toLowerCase() === 'issued' || 
      p.status?.toLowerCase() === 'policy issued'
    );
    return issued.map((p: any) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      insuredName: p.insuredName,
      writingAgent: p.writingAgent,
      product: p.product,
      faceAmount: p.faceAmount,
      premium: p.premium,
      status: p.status,
      submittedDate: p.submittedDate,
    }));
  }),
  
  getInUnderwriting: protectedProcedure.query(async () => {
    logger.info("Fetching policies in underwriting");
    const pending = await getPendingPolicies();
    const inUnderwriting = pending.filter((p: any) => 
      p.status?.toLowerCase() === 'pending' || 
      p.status?.toLowerCase() === 'in underwriting' ||
      p.status?.toLowerCase() === 'underwriting'
    );
    return inUnderwriting.map((p: any) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      insuredName: p.insuredName,
      writingAgent: p.writingAgent,
      product: p.product,
      faceAmount: p.faceAmount,
      premium: p.premium,
      status: p.status,
      submittedDate: p.submittedDate,
    }));
  }),
  
  getAnniversaries: protectedProcedure
    .input(z.object({ daysAhead: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      logger.info("Fetching policy anniversaries", { daysAhead: input?.daysAhead });
      return getPolicyAnniversaries(input?.daysAhead || 30);
    }),
  
  getAnniversarySummary: protectedProcedure.query(async () => {
    logger.info("Fetching anniversary summary");
    return getAnniversarySummary();
  }),
  
  createPolicyReviewTask: protectedProcedure
    .input(z.object({
      policyNumber: z.string(),
      ownerName: z.string(),
      anniversaryDate: z.string(),
      policyAge: z.number(),
      faceAmount: z.number(),
      premium: z.number(),
      productType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      logger.info("Creating policy review task", { policyNumber: input.policyNumber });
      const dueDate = new Date(input.anniversaryDate);
      dueDate.setDate(dueDate.getDate() - 7);
      
      const description = `Policy Review for ${input.ownerName}\n` +
        `Policy #: ${input.policyNumber}\n` +
        `Anniversary Date: ${input.anniversaryDate}\n` +
        `Policy Age: ${input.policyAge} year(s)\n` +
        `Face Amount: $${input.faceAmount.toLocaleString()}\n` +
        `Premium: $${input.premium.toLocaleString()}\n` +
        `Product Type: ${input.productType || 'N/A'}\n\n` +
        `Review Topics:\n` +
        `- Coverage adequacy\n` +
        `- Beneficiary updates\n` +
        `- Premium payment status\n` +
        `- Additional coverage needs`;
      
      await createWorkflowTask({
        taskType: 'POLICY_REVIEW',
        dueDate: dueDate,
        priority: 'MEDIUM',
        description: description,
        assignedToUserId: ctx.user.id,
      });
      
      return { success: true };
    }),

  // Email tracking endpoints
  getEmailTrackingStats: protectedProcedure
    .input(z.object({
      days: z.number().optional().default(30),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching email tracking stats", { days: input.days });
      return getEmailTrackingStats(input.days);
    }),

  getRecentEmailTracking: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching recent email tracking", { limit: input.limit });
      return getRecentEmailTracking(input.limit);
    }),

  getAnniversaryEmailStats: protectedProcedure
    .query(async () => {
      logger.info("Fetching anniversary email stats");
      return getAnniversaryEmailStats();
    }),

  getEmailsEligibleForResend: protectedProcedure
    .input(z.object({
      daysThreshold: z.number().optional().default(3),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching emails eligible for resend", { daysThreshold: input.daysThreshold });
      return getEmailsEligibleForResend(input.daysThreshold);
    }),

  resendAnniversaryEmail: protectedProcedure
    .input(z.object({
      trackingId: z.string(),
      customContent: z.object({
        greetingMessage: z.string().optional(),
        personalNote: z.string().optional(),
        closingMessage: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      logger.info("Resending anniversary email", { trackingId: input.trackingId });
      const { sendClientAnniversaryGreeting } = await import("../email-alert");
      
      const emailRecord = await getEmailByTrackingId(input.trackingId);
      if (!emailRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email record not found" });
      }
      
      if (emailRecord.emailType !== "ANNIVERSARY_GREETING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only anniversary greeting emails can be resent" });
      }
      
      const metadata = (emailRecord.metadata || {}) as Record<string, unknown>;
      const policyNumber = emailRecord.relatedEntityId || "";
      const clientName = emailRecord.recipientName || "Valued Client";
      const clientEmail = emailRecord.recipientEmail;
      
      const nameParts = clientName.split(" ");
      const firstName = nameParts[0] || "Valued";
      const lastName = nameParts.slice(1).join(" ") || "Client";
      
      const result = await sendClientAnniversaryGreeting({
        email: clientEmail,
        firstName,
        lastName,
        policyNumber,
        faceAmount: (metadata.faceAmount as string) || "N/A",
        policyAge: (metadata.policyAge as number) || 1,
        productType: (metadata.productType as string) || "Life Insurance",
        agentName: (metadata.agentName as string) || "Your WFG Agent",
        agentPhone: (metadata.agentPhone as string) || "",
        agentEmail: (metadata.agentEmail as string) || "",
      }, {
        customContent: input.customContent,
      });
      
      await markEmailResent(input.trackingId);
      
      return {
        success: result.success,
        message: result.success ? "Email resent successfully" : "Failed to resend email",
        newTrackingId: result.trackingId,
      };
    }),

  scheduleEmail: protectedProcedure
    .input(z.object({
      trackingId: z.string(),
      scheduledFor: z.number(),
      customContent: z.object({
        greetingMessage: z.string().optional(),
        personalNote: z.string().optional(),
        closingMessage: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info("Scheduling email", { trackingId: input.trackingId, scheduledFor: input.scheduledFor });
      const emailRecord = await getEmailByTrackingId(input.trackingId);
      if (!emailRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email record not found" });
      }
      
      if (emailRecord.emailType !== "ANNIVERSARY_GREETING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only anniversary greeting emails can be scheduled" });
      }
      
      const scheduled = await scheduleEmail({
        originalTrackingId: input.trackingId,
        emailType: emailRecord.emailType,
        recipientEmail: emailRecord.recipientEmail,
        recipientName: emailRecord.recipientName,
        relatedEntityType: emailRecord.relatedEntityType,
        relatedEntityId: emailRecord.relatedEntityId,
        scheduledFor: new Date(input.scheduledFor),
        customContent: input.customContent,
        metadata: emailRecord.metadata as Record<string, unknown>,
        createdBy: ctx.user.id,
      });
      
      return {
        success: true,
        scheduledId: scheduled.id,
        scheduledFor: input.scheduledFor,
      };
    }),

  getScheduledEmails: protectedProcedure
    .query(async () => {
      logger.info("Fetching scheduled emails");
      return getScheduledEmails();
    }),

  cancelScheduledEmail: protectedProcedure
    .input(z.object({
      scheduledId: z.number(),
    }))
    .mutation(async ({ input }) => {
      logger.info("Canceling scheduled email", { scheduledId: input.scheduledId });
      await cancelScheduledEmail(input.scheduledId);
      return { success: true };
    }),

  processScheduledEmails: protectedProcedure
    .mutation(async () => {
      logger.info("Processing scheduled emails");
      const result = await processScheduledEmails();
      return result;
    }),

  // Database query metrics endpoint
  getQueryMetrics: protectedProcedure.query(async () => {
    logger.info("Fetching database query metrics");
    const { getQueryMetrics } = await import("../db-logger");
    return getQueryMetrics();
  }),

  // Query metrics history endpoints
  getMetricsHistory: protectedProcedure
    .input(z.object({
      periodType: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      logger.info("Fetching query metrics history");
      const { getMetricsHistory } = await import("../repositories/queryMetrics");
      return getMetricsHistory({
        ...input,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
      });
    }),

  saveMetricsSnapshot: protectedProcedure
    .input(z.object({
      periodType: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      logger.info("Saving query metrics snapshot");
      const { saveMetricsSnapshot } = await import("../repositories/queryMetrics");
      return saveMetricsSnapshot(input?.periodType || "HOURLY");
    }),

  getAggregatedMetrics: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      logger.info("Fetching aggregated query metrics");
      const { getAggregatedMetrics } = await import("../repositories/queryMetrics");
      return getAggregatedMetrics(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
});

export default dashboardRouter;
