import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { 
  getAgents, 
  getAgentById, 
  createAgent, 
  updateAgent,
  getClients,
  getClientById,
  createClient,
  updateClient,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
  getProductionRecords,
  createProductionRecord,
  getCredentialsByUserId,
  createOrUpdateCredential,
  getLatestSyncLog,
  getAllUsers,
  getDb,
  getDashboardMetrics,
  getAllProductionRecords,
  getAllCashFlowRecords,
  getNetLicensedAgents,
  upsertCashFlowRecord,
  bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords,
  getRecentScheduledSyncLogs,
  getWeeklySyncSummary,
  getScheduledSyncLogs,
  getLatestScheduledSyncLog,
  getTodaySyncLogs,
  type Agent,
  type Client,
  type WorkflowTask,
  type SyncLog,
} from "./db";
import { productionRecords } from "../drizzle/schema";
import { encryptCredential, decryptCredential } from "./encryption";
import { TRPCError } from "@trpc/server";

// Validation schemas
const AgentSchema = z.object({
  agentCode: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  currentStage: z.enum(["RECRUITMENT", "EXAM_PREP", "LICENSED", "PRODUCT_TRAINING", "BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"]).optional(),
  examDate: z.date().optional(),
  licenseNumber: z.string().optional(),
  notes: z.string().optional(),
});

const ClientSchema = z.object({
  agentId: z.number(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  renewalDate: z.date().optional(),
  notes: z.string().optional(),
});

const WorkflowTaskSchema = z.object({
  agentId: z.number().optional(),
  clientId: z.number().optional(),
  taskType: z.enum(["EXAM_PREP_FOLLOW_UP", "LICENSE_VERIFICATION", "PRODUCT_TRAINING", "BUSINESS_LAUNCH_PREP", "RENEWAL_REMINDER", "CHARGEBACK_MONITORING", "GENERAL_FOLLOW_UP"]),
  dueDate: z.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  description: z.string().optional(),
});

const CredentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  apiKey: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    listUsers: protectedProcedure.query(async () => {
      return getAllUsers();
    }),
  }),

  // Agent management
  agents: router({
    list: protectedProcedure
      .input(z.object({ stage: z.string().optional(), isActive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return getAgents(input);
      }),
    
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return getAgentById(input);
      }),
    
    create: protectedProcedure
      .input(AgentSchema)
      .mutation(async ({ input, ctx }) => {
        return createAgent({
          ...input,
          recruiterUserId: ctx.user.id,
          currentStage: input.currentStage || "RECRUITMENT",
          stageEnteredAt: new Date(),
        });
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: AgentSchema.partial() }))
      .mutation(async ({ input }) => {
        const updateData: any = { ...input.data };
        if (input.data.currentStage) {
          updateData.stageEnteredAt = new Date();
        }
        return updateAgent(input.id, updateData);
      }),
    
    updateStage: protectedProcedure
      .input(z.object({ id: z.number(), stage: z.string() }))
      .mutation(async ({ input }) => {
        return updateAgent(input.id, {
          currentStage: input.stage as any,
          stageEnteredAt: new Date(),
        });
      }),
  }),

  // Client management
  clients: router({
    list: protectedProcedure
      .input(z.object({ agentId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getClients(input?.agentId);
      }),
    
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return getClientById(input);
      }),
    
    create: protectedProcedure
      .input(ClientSchema)
      .mutation(async ({ input }) => {
        return createClient({
          ...input,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: ClientSchema.partial() }))
      .mutation(async ({ input }) => {
        return updateClient(input.id, input.data);
      }),
  }),

  // Workflow task management
  tasks: router({
    list: protectedProcedure
      .input(z.object({ 
        agentId: z.number().optional(), 
        clientId: z.number().optional(),
        completed: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getWorkflowTasks(input);
      }),
    
    create: protectedProcedure
      .input(WorkflowTaskSchema)
      .mutation(async ({ input, ctx }) => {
        return createWorkflowTask({
          ...input,
          assignedToUserId: ctx.user.id,
        });
      }),
    
    complete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return updateWorkflowTask(input, {
          completedAt: new Date(),
        });
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: WorkflowTaskSchema.partial() }))
      .mutation(async ({ input }) => {
        return updateWorkflowTask(input.id, input.data);
      }),
  }),

  // Production records
  production: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(productionRecords);
    }),

    getByAgent: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return getProductionRecords(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        policyNumber: z.string(),
        policyType: z.string(),
        commissionAmount: z.string().optional(),
        premiumAmount: z.string().optional(),
        issueDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        return createProductionRecord({
          ...input,
        });
      }),
  }),

  // MyWFG Credentials
  credentials: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const cred = await getCredentialsByUserId(ctx.user.id);
      if (!cred) return null;
      return {
        id: cred.id,
        isActive: cred.isActive,
        lastUsedAt: cred.lastUsedAt,
      };
    }),
    
    save: protectedProcedure
      .input(CredentialSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const encryptedUsername = encryptCredential(input.username);
          const encryptedPassword = encryptCredential(input.password);
          const encryptedApiKey = input.apiKey ? encryptCredential(input.apiKey) : undefined;
          
          await createOrUpdateCredential({
            userId: ctx.user.id,
            encryptedUsername,
            encryptedPassword,
            encryptedApiKey,
            isActive: true,
          });
          
          return { success: true };
        } catch (error) {
          console.error("Failed to save credentials:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save credentials" });
        }
      }),
  }),

  // Dashboard & Analytics
  dashboard: router({
    stats: protectedProcedure.query(async () => {
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
      };
    }),
    
    // Get face amount and families protected metrics
    metrics: protectedProcedure.query(async () => {
      return getDashboardMetrics();
    }),
    
    // Get all production records for the production page
    allProduction: protectedProcedure.query(async () => {
      return getAllProductionRecords();
    }),
    
    // Get sync status and monthly cash flow data
    syncStatus: protectedProcedure.query(async () => {
      const { getSyncStatus, getPaymentCycleInfo } = await import("./mywfg-sync-data");
      return {
        ...getSyncStatus(),
        paymentCycle: getPaymentCycleInfo(),
      };
    }),
    
    // Get monthly cash flow data for charts
    monthlyCashFlow: protectedProcedure.query(async () => {
      const { getMonthlyCashFlowData } = await import("./mywfg-sync-data");
      return getMonthlyCashFlowData();
    }),
    
    // Get recent sync logs
    syncLogs: protectedProcedure.query(async () => {
      const { getRecentSyncLogs } = await import("./mywfg-sync-data");
      return getRecentSyncLogs(10);
    }),
    
    // Send chargeback notification to owner
    sendChargebackNotification: protectedProcedure.mutation(async () => {
      const { sendChargebackNotification, getCurrentTransamericaAlerts } = await import("./chargeback-notification");
      const alerts = getCurrentTransamericaAlerts();
      const success = await sendChargebackNotification(alerts);
      return { success, alertCount: alerts.reversedPremiumPayments.length + alerts.eftRemovals.length };
    }),
    
    // Trigger automated sync for all platforms
    triggerSync: protectedProcedure.mutation(async () => {
      const { runFullSync, getLastSyncTime } = await import("./sync-service");
      const results = await runFullSync();
      return {
        results,
        lastSyncTime: getLastSyncTime(),
      };
    }),
    
    // Get automated sync status
    autoSyncStatus: protectedProcedure.query(async () => {
      const { getLastSyncTime } = await import("./sync-service");
      const { verifyGmailCredentials, getMyWFGCredentials, getTransamericaCredentials } = await import("./gmail-otp");
      
      // Check if Gmail credentials are configured
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
    
    // Test Gmail OTP connection
    testGmailConnection: protectedProcedure.input(
      z.object({
        platform: z.enum(['mywfg', 'transamerica']),
      })
    ).mutation(async ({ input }) => {
      const { verifyGmailCredentials, getMyWFGCredentials, getTransamericaCredentials } = await import("./gmail-otp");
      
      const credentials = input.platform === 'mywfg' 
        ? getMyWFGCredentials() 
        : getTransamericaCredentials();
      
      const result = await verifyGmailCredentials(credentials);
      return result;
    }),
  }),

  // MyWFG Integration
  mywfg: router({
    getLatestSync: protectedProcedure.query(async () => {
      return getLatestSyncLog();
    }),

    testSync: protectedProcedure.input(
      z.object({
        validationCode: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { myWFGServiceV3 } = await import("./mywfg-service-v3");
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
      const { runMyWFGSync } = await import("./mywfg-sync-job");
      return runMyWFGSync(ctx.user.id, input.validationCode);
    }),
  }),

  // Cash Flow Management - For Net Licensed tracking
  cashFlow: router({
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
  }),

  // Team management (admin only)
  team: router({
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return getAllUsers();
    }),
  }),

  // Sync Logs - For monitoring scheduled sync tasks
  syncLogs: router({
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
  }),
});

export type AppRouter = typeof appRouter;
