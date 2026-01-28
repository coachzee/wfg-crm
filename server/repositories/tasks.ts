/**
 * Tasks Repository
 * 
 * Database operations for workflow task management including:
 * - CRUD operations
 * - Task filtering by agent, client, and completion status
 */

import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { workflowTasks, InsertWorkflowTask } from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Re-export types
export type { WorkflowTask } from "../../drizzle/schema";

// Import getDb from parent - will be injected
let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initTasksRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function getWorkflowTasks(filters?: { agentId?: number; clientId?: number; completed?: boolean }) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get workflow tasks: database not available");
    return [];
  }

  logger.debug("Fetching workflow tasks", { filters });
  
  const conditions = [];
  
  if (filters?.agentId) {
    conditions.push(eq(workflowTasks.agentId, filters.agentId));
  }
  if (filters?.clientId) {
    conditions.push(eq(workflowTasks.clientId, filters.clientId));
  }
  if (filters?.completed !== undefined) {
    if (filters.completed) {
      conditions.push(isNotNull(workflowTasks.completedAt));
    } else {
      conditions.push(isNull(workflowTasks.completedAt));
    }
  }
  
  if (conditions.length > 0) {
    return db.select().from(workflowTasks).where(and(...conditions));
  }
  return db.select().from(workflowTasks);
}

export async function createWorkflowTask(data: InsertWorkflowTask) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Creating workflow task", { taskType: data.taskType, agentId: data.agentId });
  return db.insert(workflowTasks).values(data);
}

export async function updateWorkflowTask(id: number, data: Partial<InsertWorkflowTask>) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Updating workflow task", { taskId: id });
  await db.update(workflowTasks).set(data).where(eq(workflowTasks.id, id));
  
  const updated = await db.select().from(workflowTasks).where(eq(workflowTasks.id, id)).limit(1);
  return updated[0];
}

export async function getTaskById(id: number) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get task: database not available");
    return null;
  }
  
  logger.debug("Fetching task by ID", { taskId: id });
  const result = await db.select().from(workflowTasks).where(eq(workflowTasks.id, id)).limit(1);
  return result[0] || null;
}

export async function completeTask(id: number) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Completing task", { taskId: id });
  await db.update(workflowTasks)
    .set({ completedAt: new Date() })
    .where(eq(workflowTasks.id, id));
  
  const updated = await db.select().from(workflowTasks).where(eq(workflowTasks.id, id)).limit(1);
  return updated[0];
}

export async function getTaskStats() {
  const db = await _getDb();
  if (!db) {
    return { total: 0, completed: 0, pending: 0 };
  }
  
  logger.debug("Fetching task statistics");
  
  const allTasks = await db.select().from(workflowTasks);
  const completed = allTasks.filter(t => t.completedAt !== null);
  
  return {
    total: allTasks.length,
    completed: completed.length,
    pending: allTasks.length - completed.length,
  };
}
