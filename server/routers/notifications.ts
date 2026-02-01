/**
 * Notifications Router
 * 
 * tRPC procedures for managing user notifications
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAllNotifications,
  getNotificationById,
} from "../repositories/notifications";
import { NOTIFICATION_TYPES } from "../../drizzle/schema";

export const notificationsRouter = router({
  /**
   * Get notifications for the current user
   */
  list: protectedProcedure
    .input(z.object({
      type: z.enum(NOTIFICATION_TYPES).optional(),
      isRead: z.boolean().optional(),
      isDismissed: z.boolean().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const filters = {
        userId: ctx.user.id,
        type: input?.type,
        isRead: input?.isRead,
        isDismissed: input?.isDismissed ?? false, // Default to not dismissed
        priority: input?.priority,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      };
      
      return getNotifications(filters);
    }),

  /**
   * Get unread notification count for the current user
   */
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      return getUnreadCount(ctx.user.id);
    }),

  /**
   * Mark a notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to this user or is a broadcast
      const notification = await getNotificationById(input.notificationId);
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (notification.userId !== null && notification.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      
      await markAsRead(input.notificationId);
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current user
   */
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const count = await markAllAsRead(ctx.user.id);
      return { success: true, count };
    }),

  /**
   * Dismiss a notification
   */
  dismiss: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to this user or is a broadcast
      const notification = await getNotificationById(input.notificationId);
      if (!notification) {
        throw new Error("Notification not found");
      }
      if (notification.userId !== null && notification.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      
      await dismissNotification(input.notificationId);
      return { success: true };
    }),

  /**
   * Dismiss all notifications for the current user
   */
  dismissAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const count = await dismissAllNotifications(ctx.user.id);
      return { success: true, count };
    }),

  /**
   * Get a single notification by ID
   */
  getById: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const notification = await getNotificationById(input.notificationId);
      if (!notification) {
        return null;
      }
      // Only return if it belongs to this user or is a broadcast
      if (notification.userId !== null && notification.userId !== ctx.user.id) {
        return null;
      }
      return notification;
    }),
});
