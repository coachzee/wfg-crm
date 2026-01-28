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
  taskType: z.enum(["POLICY_REVIEW", "PRODUCT_TRAINING", "EXAM_PREP_FOLLOW_UP", "LICENSE_VERIFICATION", "BUSINESS_LAUNCH_PREP", "RENEWAL_REMINDER", "CHARGEBACK_MONITORING", "GENERAL_FOLLOW_UP", "ADVANCEMENT_TRACKING"]),
  dueDate: z.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  description: z.string().optional(),
  assignedToUserId: z.number().optional(),
});

export const tasksRouter = router({
  list: protectedProcedure.query(async () => {
    logger.info("Fetching all workflow tasks");
    return getWorkflowTasks();
  }),
  
  create: protectedProcedure.input(TaskSchema).mutation(async ({ input }) => {
    logger.info("Creating new task", { taskType: input.taskType });
    return createWorkflowTask(input);
  }),
  
  update: protectedProcedure.input(
    z.object({
      id: z.number(),
      data: TaskSchema.partial().extend({
        completedAt: z.date().optional().nullable(),
      }),
    })
  ).mutation(async ({ input }) => {
    logger.info("Updating task", { taskId: input.id });
    return updateWorkflowTask(input.id, input.data);
  }),
  
  complete: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    logger.info("Completing task", { taskId: input });
    return updateWorkflowTask(input, { completedAt: new Date() });
  }),
});

export default tasksRouter;
