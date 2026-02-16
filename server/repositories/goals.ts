/**
 * Goals Repository
 * 
 * Database operations for goal tracking including:
 * - CRUD operations for goals
 * - Progress tracking and status updates
 */

import { eq, and, desc } from "drizzle-orm";
import { goals, InsertGoal, Goal } from "../../drizzle/schema";
import { logger } from "../_core/logger";

let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initGoalsRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function getGoals(userId: number, filters?: { periodYear?: number; periodMonth?: number; periodQuarter?: number; status?: string }) {
  const db = await _getDb();
  if (!db) return [];

  logger.debug("Fetching goals", { userId, filters });

  let query = db.select().from(goals).where(eq(goals.userId, userId));
  
  const allGoals = await query.orderBy(goals.sortOrder, desc(goals.updatedAt));
  
  // Apply filters in JS since drizzle chaining is complex
  let filtered = allGoals;
  if (filters?.periodYear) {
    filtered = filtered.filter(g => g.periodYear === filters.periodYear);
  }
  if (filters?.periodMonth) {
    filtered = filtered.filter(g => g.periodMonth === filters.periodMonth);
  }
  if (filters?.periodQuarter) {
    filtered = filtered.filter(g => g.periodQuarter === filters.periodQuarter);
  }
  if (filters?.status) {
    filtered = filtered.filter(g => g.status === filters.status);
  }
  
  return filtered;
}

export async function getGoalById(id: number) {
  const db = await _getDb();
  if (!db) return null;

  const result = await db.select().from(goals).where(eq(goals.id, id));
  return result[0] || null;
}

export async function createGoal(data: Omit<InsertGoal, "id" | "createdAt" | "updatedAt">) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");

  logger.info("Creating goal", { title: data.title, metricKey: data.metricKey });

  const result = await db.insert(goals).values(data);
  const insertId = result[0].insertId;
  return getGoalById(insertId);
}

export async function updateGoal(id: number, data: Partial<Omit<InsertGoal, "id" | "createdAt" | "updatedAt">>) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");

  logger.info("Updating goal", { id, ...data });

  await db.update(goals).set(data).where(eq(goals.id, id));
  return getGoalById(id);
}

export async function updateGoalProgress(id: number, currentValue: string) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");

  logger.info("Updating goal progress", { id, currentValue });

  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  const target = parseFloat(String(goal.targetValue));
  const current = parseFloat(currentValue);
  
  const updates: Partial<InsertGoal> = { currentValue };
  
  // Auto-complete if target reached
  if (current >= target && goal.status === "ACTIVE") {
    updates.status = "COMPLETED";
    updates.completedAt = new Date();
  }

  await db.update(goals).set(updates).where(eq(goals.id, id));
  return getGoalById(id);
}

export async function deleteGoal(id: number) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");

  logger.info("Deleting goal", { id });
  await db.delete(goals).where(eq(goals.id, id));
  return { success: true };
}

export async function getActiveGoals(userId: number) {
  const db = await _getDb();
  if (!db) return [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil(currentMonth / 3);

  const allGoals = await db.select().from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "ACTIVE")))
    .orderBy(goals.sortOrder);

  // Filter to current period goals
  return allGoals.filter(g => {
    if (g.periodYear !== currentYear) return false;
    if (g.periodType === "MONTHLY" && g.periodMonth !== currentMonth) return false;
    if (g.periodType === "QUARTERLY" && g.periodQuarter !== currentQuarter) return false;
    return true;
  });
}

export async function archiveExpiredGoals(userId: number) {
  const db = await _getDb();
  if (!db) return;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const activeGoals = await db.select().from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "ACTIVE")));

  for (const goal of activeGoals) {
    let isExpired = false;
    
    if (goal.periodType === "MONTHLY") {
      if (goal.periodYear < currentYear || (goal.periodYear === currentYear && (goal.periodMonth || 0) < currentMonth)) {
        isExpired = true;
      }
    } else if (goal.periodType === "QUARTERLY") {
      const currentQuarter = Math.ceil(currentMonth / 3);
      if (goal.periodYear < currentYear || (goal.periodYear === currentYear && (goal.periodQuarter || 0) < currentQuarter)) {
        isExpired = true;
      }
    } else if (goal.periodType === "YEARLY") {
      if (goal.periodYear < currentYear) {
        isExpired = true;
      }
    }

    if (isExpired) {
      const current = parseFloat(String(goal.currentValue));
      const target = parseFloat(String(goal.targetValue));
      const newStatus = current >= target ? "COMPLETED" : "MISSED";
      await db.update(goals).set({ status: newStatus }).where(eq(goals.id, goal.id));
    }
  }
}
