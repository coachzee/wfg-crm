/**
 * Agents Router
 * 
 * Handles all agent-related endpoints including:
 * - CRUD operations for agents
 * - Stage transitions
 * - Agent hierarchy
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { logger } from "../_core/logger";
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
} from "../db";

// Validation schemas
export const AgentSchema = z.object({
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

export const agentsRouter = router({
  list: protectedProcedure.query(async () => {
    logger.info("Fetching all agents");
    return getAgents();
  }),
  
  getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
    logger.info("Fetching agent by ID", { agentId: input });
    return getAgentById(input);
  }),
  
  create: protectedProcedure.input(AgentSchema).mutation(async ({ input }) => {
    logger.info("Creating new agent", { firstName: input.firstName, lastName: input.lastName });
    return createAgent(input);
  }),
  
  update: protectedProcedure.input(
    z.object({
      id: z.number(),
      data: AgentSchema.partial(),
    })
  ).mutation(async ({ input }) => {
    logger.info("Updating agent", { agentId: input.id });
    return updateAgent(input.id, input.data);
  }),
  
  updateStage: protectedProcedure.input(
    z.object({
      id: z.number(),
      stage: z.enum(["RECRUITMENT", "EXAM_PREP", "LICENSED", "PRODUCT_TRAINING", "BUSINESS_LAUNCH", "NET_LICENSED", "CLIENT_TRACKING", "CHARGEBACK_PROOF"]),
    })
  ).mutation(async ({ input }) => {
    logger.info("Updating agent stage", { agentId: input.id, stage: input.stage });
    return updateAgent(input.id, { currentStage: input.stage });
  }),
});

export default agentsRouter;
