/**
 * Tasks Router
 * 
 * Handles all workflow task-related endpoints including:
 * - CRUD operations for tasks
 * - Task assignment and completion
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { logger } from "../_core/logger";
import {
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
} from "../db";

// Validation schemas
export const TaskSchema = z.object({
  agentId: z.number().optional(),
  clientId: z.number().optional(),
  taskType: z.enum(["POLICY_REVIEW", "PRODUCT_TRAINING", "EXAM_PREP_FOLLOW_UP", "LICENSE_VERIFICATION", "BUSINESS_LAUNCH_PREP", "RENEWAL_REMINDER", "CHARGEBACK_MONITORING", "GENERAL_FOLLOW_UP", "ADVANCEMENT_TRACKING"]),
  dueDate: z.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  description: z.string().optional(),
});

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ 
      agentId: z.number().optional(), 
      clientId: z.number().optional(),
      completed: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      logger.info("Fetching workflow tasks", { filters: input });
      return getWorkflowTasks(input);
    }),
  
  create: protectedProcedure
    .input(TaskSchema)
    .mutation(async ({ input, ctx }) => {
      logger.info("Creating new task", { taskType: input.taskType });
      return createWorkflowTask({
        ...input,
        assignedToUserId: ctx.user.id,
      });
    }),
  
  complete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      logger.info("Completing task", { taskId: input });
      return updateWorkflowTask(input, {
        completedAt: new Date(),
      });
    }),
  
  update: protectedProcedure
    .input(z.object({ id: z.number(), data: TaskSchema.partial() }))
    .mutation(async ({ input }) => {
      logger.info("Updating task", { taskId: input.id });
      return updateWorkflowTask(input.id, input.data);
    }),
});

export default tasksRouter;
