/**
 * Alerts Router
 * 
 * Handles alert dismissal tracking to prevent repeated notifications
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  isAlertDismissed,
  dismissAlert,
  restoreAlert,
  getDismissedAlerts,
  getDismissedAlertById,
  getDismissedAlertCounts,
} from "../repositories/alerts";

export const alertsRouter = router({
  /**
   * Check if a specific alert has been dismissed
   */
  isAlertDismissed: publicProcedure
    .input(z.object({
      policyNumber: z.string(),
      alertType: z.string(),
      alertDate: z.string(),
    }))
    .query(async ({ input }) => {
      return isAlertDismissed(input.policyNumber, input.alertType, input.alertDate);
    }),

  /**
   * Dismiss an alert
   */
  dismissAlert: protectedProcedure
    .input(z.object({
      alertType: z.enum(["REVERSED_PREMIUM_PAYMENT", "EFT_REMOVAL", "CHARGEBACK", "OTHER"]),
      policyNumber: z.string(),
      ownerName: z.string().optional(),
      alertDate: z.string().optional(),
      dismissReason: z.string().optional(),
      originalAlertData: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return dismissAlert({
        ...input,
        dismissedBy: ctx.user.id,
      });
    }),

  /**
   * Restore (un-dismiss) an alert
   */
  restoreAlert: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      await restoreAlert(input.id);
      return { success: true };
    }),

  /**
   * Get all dismissed alerts
   */
  getDismissedAlerts: protectedProcedure
    .input(z.object({
      alertType: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getDismissedAlerts(input);
    }),

  /**
   * Get a specific dismissed alert by ID
   */
  getDismissedAlertById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      return getDismissedAlertById(input.id);
    }),

  /**
   * Get counts of dismissed alerts by type
   */
  getDismissedAlertCounts: protectedProcedure
    .query(async () => {
      return getDismissedAlertCounts();
    }),
});
