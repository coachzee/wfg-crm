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
  type Agent,
  type Client,
  type WorkflowTask,
} from "./db";
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
      
      const taskStats = {
        total: allTasks.length,
        completed: allTasks.filter((t: WorkflowTask) => t.completedAt).length,
        pending: allTasks.filter((t: WorkflowTask) => !t.completedAt).length,
      };
      
      const latestSync = await getLatestSyncLog();
      
      return {
        totalAgents: allAgents.length,
        agentsByStage,
        taskStats,
        lastSyncDate: latestSync?.syncDate,
      };
    }),
  }),

  // MyWFG Integration
  mywfg: router({
    getLatestSync: protectedProcedure.query(async () => {
      return getLatestSyncLog();
    }),

    testSync: protectedProcedure.mutation(async ({ ctx }) => {
      const { myWFGService } = await import("./mywfg-service");
      const creds = await getCredentialsByUserId(ctx.user.id);
      
      if (!creds) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials configured" });
      }

      try {
        const result = await myWFGService.extractData(creds.encryptedUsername, creds.encryptedPassword);
        return {
          success: result.success,
          agentsExtracted: result.agentsExtracted,
          productionRecordsExtracted: result.productionRecordsExtracted,
          error: result.error,
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Test sync failed" });
      }
    }),

    manualSync: protectedProcedure.mutation(async ({ ctx }) => {
      const { runMyWFGSync } = await import("./mywfg-sync-job");
      return runMyWFGSync(ctx.user.id);
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
});

export type AppRouter = typeof appRouter;
