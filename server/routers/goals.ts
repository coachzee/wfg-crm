/**
 * Goals Router
 * 
 * tRPC procedures for goal tracking including:
 * - CRUD operations for goals
 * - Progress tracking
 * - Active goals for dashboard
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
  getActiveGoals,
  archiveExpiredGoals,
} from "../db";

export const goalsRouter = router({
  // List goals with optional filters
  list: protectedProcedure
    .input(z.object({
      periodYear: z.number().optional(),
      periodMonth: z.number().optional(),
      periodQuarter: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Archive expired goals first
      await archiveExpiredGoals(ctx.user.id);
      return getGoals(ctx.user.id, input);
    }),

  // Get active goals for dashboard display
  active: protectedProcedure
    .query(async ({ ctx }) => {
      await archiveExpiredGoals(ctx.user.id);
      return getActiveGoals(ctx.user.id);
    }),

  // Get single goal
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getGoalById(input.id);
    }),

  // Create a new goal
  create: protectedProcedure
    .input(z.object({
      metricKey: z.string().max(64),
      title: z.string().max(255),
      description: z.string().optional(),
      targetValue: z.string(),
      unit: z.enum(["count", "currency", "percentage"]).default("count"),
      periodType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
      periodMonth: z.number().min(1).max(12).optional(),
      periodQuarter: z.number().min(1).max(4).optional(),
      periodYear: z.number(),
      color: z.string().max(32).optional(),
      icon: z.string().max(64).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createGoal({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // Update a goal
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().max(255).optional(),
      description: z.string().optional(),
      targetValue: z.string().optional(),
      currentValue: z.string().optional(),
      unit: z.enum(["count", "currency", "percentage"]).optional(),
      status: z.enum(["ACTIVE", "COMPLETED", "MISSED", "ARCHIVED"]).optional(),
      color: z.string().max(32).optional(),
      icon: z.string().max(64).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateGoal(id, data);
    }),

  // Update progress on a goal
  updateProgress: protectedProcedure
    .input(z.object({
      id: z.number(),
      currentValue: z.string(),
    }))
    .mutation(async ({ input }) => {
      return updateGoalProgress(input.id, input.currentValue);
    }),

  // Delete a goal
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteGoal(input.id);
    }),
});
