/**
 * Notification Service
 * 
 * High-level service for creating notifications from CRM events.
 * This service abstracts the notification creation logic and provides
 * convenient methods for common notification scenarios.
 */

import {
  createNotification,
  createBulkNotifications,
  hasSimilarNotification,
  type CreateNotificationParams,
} from "../repositories/notifications";
import type { NotificationType } from "../../drizzle/schema";

/**
 * Notify about sync completion
 */
export async function notifySyncCompleted(params: {
  syncType: string;
  duration: number;
  metrics?: Record<string, number>;
  userId?: number;
}): Promise<void> {
  const { syncType, duration, metrics, userId } = params;
  
  // Check for duplicate notification
  const isDuplicate = await hasSimilarNotification(
    userId ?? null,
    "SYNC_COMPLETED",
    "sync",
    syncType,
    5 // Within 5 minutes
  );
  
  if (isDuplicate) return;
  
  const metricsText = metrics 
    ? Object.entries(metrics)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";
  
  await createNotification({
    userId,
    type: "SYNC_COMPLETED",
    title: `${syncType} Sync Completed`,
    message: `Sync completed in ${Math.round(duration / 1000)}s.${metricsText ? ` ${metricsText}` : ""}`,
    linkUrl: "/sync-logs",
    linkLabel: "View Sync Logs",
    relatedEntityType: "sync",
    relatedEntityId: syncType,
    priority: "LOW",
    metadata: { syncType, duration, metrics },
  });
}

/**
 * Notify about sync failure
 */
export async function notifySyncFailed(params: {
  syncType: string;
  error: string;
  userId?: number;
}): Promise<void> {
  const { syncType, error, userId } = params;
  
  await createNotification({
    userId,
    type: "SYNC_FAILED",
    title: `${syncType} Sync Failed`,
    message: error.length > 200 ? error.substring(0, 200) + "..." : error,
    linkUrl: "/sync-logs",
    linkLabel: "View Details",
    relatedEntityType: "sync",
    relatedEntityId: syncType,
    priority: "HIGH",
    metadata: { syncType, error },
  });
}

/**
 * Notify about upcoming policy anniversary
 */
export async function notifyPolicyAnniversary(params: {
  policyNumber: string;
  ownerName: string;
  anniversaryDate: string;
  daysUntil: number;
  premium?: number;
  userId?: number;
}): Promise<void> {
  const { policyNumber, ownerName, anniversaryDate, daysUntil, premium, userId } = params;
  
  // Check for duplicate notification
  const isDuplicate = await hasSimilarNotification(
    userId ?? null,
    "POLICY_ANNIVERSARY",
    "policy",
    policyNumber,
    1440 // Within 24 hours
  );
  
  if (isDuplicate) return;
  
  const premiumText = premium ? ` (Premium: $${premium.toLocaleString()})` : "";
  
  await createNotification({
    userId,
    type: "POLICY_ANNIVERSARY",
    title: `Policy Anniversary in ${daysUntil} days`,
    message: `${ownerName}'s policy ${policyNumber} anniversary is on ${anniversaryDate}${premiumText}`,
    linkUrl: "/policy-anniversaries",
    linkLabel: "View Policy",
    relatedEntityType: "policy",
    relatedEntityId: policyNumber,
    priority: daysUntil <= 7 ? "HIGH" : "MEDIUM",
    metadata: { policyNumber, ownerName, anniversaryDate, daysUntil, premium },
  });
}

/**
 * Notify about agent milestone achievement
 */
export async function notifyAgentMilestone(params: {
  agentId: number;
  agentName: string;
  milestone: "NET_LICENSED" | "RANK_UP" | "FIRST_SALE" | "LICENSED";
  details?: string;
  userId?: number;
}): Promise<void> {
  const { agentId, agentName, milestone, details, userId } = params;
  
  const milestoneMessages: Record<string, { title: string; message: string }> = {
    NET_LICENSED: {
      title: "Agent Became Net Licensed!",
      message: `${agentName} has achieved net licensed status (earned $1,000+)!`,
    },
    RANK_UP: {
      title: "Agent Rank Promotion!",
      message: `${agentName} has been promoted${details ? ` to ${details}` : ""}!`,
    },
    FIRST_SALE: {
      title: "First Sale Achievement!",
      message: `${agentName} has made their first sale!`,
    },
    LICENSED: {
      title: "Agent Licensed!",
      message: `${agentName} has received their license!`,
    },
  };
  
  const { title, message } = milestoneMessages[milestone] || {
    title: "Agent Milestone",
    message: `${agentName} achieved a milestone: ${milestone}`,
  };
  
  await createNotification({
    userId,
    type: "AGENT_MILESTONE",
    title,
    message: details && !milestoneMessages[milestone] ? `${message} ${details}` : message,
    linkUrl: `/agents/${agentId}`,
    linkLabel: "View Agent",
    relatedEntityType: "agent",
    relatedEntityId: String(agentId),
    priority: "MEDIUM",
    metadata: { agentId, agentName, milestone, details },
  });
}

/**
 * Notify about chargeback alert
 */
export async function notifyChargebackAlert(params: {
  policyNumber: string;
  ownerName: string;
  alertType: string;
  amount?: number;
  userId?: number;
}): Promise<void> {
  const { policyNumber, ownerName, alertType, amount, userId } = params;
  
  // Check for duplicate notification
  const isDuplicate = await hasSimilarNotification(
    userId ?? null,
    "CHARGEBACK_ALERT",
    "policy",
    policyNumber,
    1440 // Within 24 hours
  );
  
  if (isDuplicate) return;
  
  const amountText = amount ? ` ($${amount.toLocaleString()})` : "";
  
  await createNotification({
    userId,
    type: "CHARGEBACK_ALERT",
    title: `Chargeback Alert: ${alertType}`,
    message: `${ownerName}'s policy ${policyNumber} has a ${alertType.toLowerCase()} alert${amountText}`,
    linkUrl: "/production",
    linkLabel: "View Details",
    relatedEntityType: "policy",
    relatedEntityId: policyNumber,
    priority: "URGENT",
    metadata: { policyNumber, ownerName, alertType, amount },
  });
}

/**
 * Notify about new policy
 */
export async function notifyNewPolicy(params: {
  policyNumber: string;
  ownerName: string;
  agentName: string;
  premium?: number;
  faceAmount?: number;
  userId?: number;
}): Promise<void> {
  const { policyNumber, ownerName, agentName, premium, faceAmount, userId } = params;
  
  const premiumText = premium ? `$${premium.toLocaleString()} premium` : "";
  const faceText = faceAmount ? `$${faceAmount.toLocaleString()} face amount` : "";
  const details = [premiumText, faceText].filter(Boolean).join(", ");
  
  await createNotification({
    userId,
    type: "NEW_POLICY",
    title: "New Policy Issued!",
    message: `${agentName} issued a new policy for ${ownerName}${details ? ` (${details})` : ""}`,
    linkUrl: "/production",
    linkLabel: "View Policy",
    relatedEntityType: "policy",
    relatedEntityId: policyNumber,
    priority: "MEDIUM",
    metadata: { policyNumber, ownerName, agentName, premium, faceAmount },
  });
}

/**
 * Notify about system alert
 */
export async function notifySystemAlert(params: {
  title: string;
  message: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  linkUrl?: string;
  linkLabel?: string;
  userId?: number;
}): Promise<void> {
  const { title, message, priority = "MEDIUM", linkUrl, linkLabel, userId } = params;
  
  await createNotification({
    userId,
    type: "SYSTEM_ALERT",
    title,
    message,
    linkUrl,
    linkLabel,
    relatedEntityType: "system",
    relatedEntityId: "alert",
    priority,
  });
}

/**
 * Notify about task due
 */
export async function notifyTaskDue(params: {
  taskId: number;
  taskType: string;
  description: string;
  dueDate: string;
  userId: number;
}): Promise<void> {
  const { taskId, taskType, description, dueDate, userId } = params;
  
  // Check for duplicate notification
  const isDuplicate = await hasSimilarNotification(
    userId,
    "TASK_DUE",
    "task",
    String(taskId),
    1440 // Within 24 hours
  );
  
  if (isDuplicate) return;
  
  await createNotification({
    userId,
    type: "TASK_DUE",
    title: `Task Due: ${taskType.replace(/_/g, " ")}`,
    message: description || `Task due on ${dueDate}`,
    linkUrl: "/tasks",
    linkLabel: "View Task",
    relatedEntityType: "task",
    relatedEntityId: String(taskId),
    priority: "MEDIUM",
    metadata: { taskId, taskType, dueDate },
  });
}

/**
 * Send welcome notification to new user
 */
export async function notifyWelcome(userId: number, userName: string): Promise<void> {
  await createNotification({
    userId,
    type: "WELCOME",
    title: "Welcome to WFG CRM!",
    message: `Hello ${userName}! Welcome to your CRM dashboard. Start by exploring the dashboard to see your team's performance.`,
    linkUrl: "/",
    linkLabel: "Go to Dashboard",
    relatedEntityType: "user",
    relatedEntityId: String(userId),
    priority: "LOW",
  });
}

/**
 * Broadcast notification to all users
 */
export async function broadcastNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  linkUrl?: string;
  linkLabel?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await createNotification({
    userId: null, // null = broadcast to all
    type: params.type,
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
    priority: params.priority ?? "MEDIUM",
    metadata: params.metadata,
  });
}
