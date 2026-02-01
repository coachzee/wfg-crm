import { getDb } from "../db";
import { notifications, type Notification, type InsertNotification, type NotificationType } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull, or, lte, gt } from "drizzle-orm";

/**
 * Notifications Repository
 * Handles all database operations for the notification system
 */

export interface CreateNotificationParams {
  userId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface NotificationFilters {
  userId?: number;
  type?: NotificationType;
  isRead?: boolean;
  isDismissed?: boolean;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  limit?: number;
  offset?: number;
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [notification] = await db.insert(notifications).values({
    userId: params.userId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    priority: params.priority ?? "MEDIUM",
    metadata: params.metadata,
    expiresAt: params.expiresAt,
  }).$returningId();

  const [created] = await db.select().from(notifications).where(eq(notifications.id, notification.id));
  return created;
}

/**
 * Create multiple notifications at once (for broadcasts)
 */
export async function createBulkNotifications(notificationsList: CreateNotificationParams[]): Promise<number> {
  if (notificationsList.length === 0) return 0;
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const values = notificationsList.map(params => ({
    userId: params.userId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
    linkLabel: params.linkLabel,
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
    priority: params.priority ?? "MEDIUM",
    metadata: params.metadata,
    expiresAt: params.expiresAt,
  }));

  const result = await db.insert(notifications).values(values);
  return notificationsList.length;
}

/**
 * Get notifications for a user with filters
 */
export async function getNotifications(filters: NotificationFilters): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  // User-specific or broadcast notifications
  if (filters.userId !== undefined) {
    conditions.push(
      or(
        eq(notifications.userId, filters.userId),
        isNull(notifications.userId)
      )
    );
  }
  
  if (filters.type !== undefined) {
    conditions.push(eq(notifications.type, filters.type));
  }
  
  if (filters.isRead !== undefined) {
    conditions.push(eq(notifications.isRead, filters.isRead));
  }
  
  if (filters.isDismissed !== undefined) {
    conditions.push(eq(notifications.isDismissed, filters.isDismissed));
  }
  
  if (filters.priority !== undefined) {
    conditions.push(eq(notifications.priority, filters.priority));
  }
  
  // Exclude expired notifications
  conditions.push(
    or(
      isNull(notifications.expiresAt),
      gt(notifications.expiresAt, new Date())
    )
  );

  const query = db.select()
    .from(notifications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notifications.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return await query;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        ),
        eq(notifications.isRead, false),
        eq(notifications.isDismissed, false),
        or(
          isNull(notifications.expiresAt),
          gt(notifications.expiresAt, new Date())
        )
      )
    );
  
  return Number(result[0]?.count ?? 0);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(notifications)
    .set({ 
      isRead: true, 
      readAt: new Date() 
    })
    .where(eq(notifications.id, notificationId));
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.update(notifications)
    .set({ 
      isRead: true, 
      readAt: new Date() 
    })
    .where(
      and(
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        ),
        eq(notifications.isRead, false)
      )
    );
  
  return result[0]?.affectedRows ?? 0;
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(notifications)
    .set({ 
      isDismissed: true, 
      dismissedAt: new Date() 
    })
    .where(eq(notifications.id, notificationId));
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.update(notifications)
    .set({ 
      isDismissed: true, 
      dismissedAt: new Date() 
    })
    .where(
      and(
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        ),
        eq(notifications.isDismissed, false)
      )
    );
  
  return result[0]?.affectedRows ?? 0;
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await db.delete(notifications)
    .where(
      and(
        eq(notifications.isDismissed, true),
        lte(notifications.createdAt, cutoffDate)
      )
    );
  
  return result[0]?.affectedRows ?? 0;
}

/**
 * Get notification by ID
 */
export async function getNotificationById(id: number): Promise<Notification | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [notification] = await db.select()
    .from(notifications)
    .where(eq(notifications.id, id));
  
  return notification ?? null;
}

/**
 * Check if a similar notification already exists (to prevent duplicates)
 */
export async function hasSimilarNotification(
  userId: number | null,
  type: NotificationType,
  relatedEntityType: string,
  relatedEntityId: string,
  withinMinutes: number = 60
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);
  
  const conditions = [
    eq(notifications.type, type),
    eq(notifications.relatedEntityType, relatedEntityType),
    eq(notifications.relatedEntityId, relatedEntityId),
    gt(notifications.createdAt, cutoffTime),
  ];
  
  if (userId !== null) {
    conditions.push(eq(notifications.userId, userId));
  } else {
    conditions.push(isNull(notifications.userId));
  }
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(...conditions));
  
  return Number(result[0]?.count ?? 0) > 0;
}
