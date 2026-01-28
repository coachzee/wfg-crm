/**
 * Alerts Repository
 * 
 * Handles dismissed alerts tracking to prevent repeated notifications
 * for the same chargeback/premium reversal issues.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { dismissedAlerts, type InsertDismissedAlert, type DismissedAlert } from "../../drizzle/schema";

/**
 * Check if an alert has been dismissed
 */
export async function isAlertDismissed(
  policyNumber: string,
  alertType: string,
  alertDate: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db
    .select({ id: dismissedAlerts.id })
    .from(dismissedAlerts)
    .where(
      and(
        eq(dismissedAlerts.policyNumber, policyNumber),
        eq(dismissedAlerts.alertType, alertType as any),
        eq(dismissedAlerts.alertDate, alertDate)
      )
    )
    .limit(1);
  
  return result.length > 0;
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(
  data: {
    alertType: "REVERSED_PREMIUM_PAYMENT" | "EFT_REMOVAL" | "CHARGEBACK" | "OTHER";
    policyNumber: string;
    ownerName?: string;
    alertDate?: string;
    dismissedBy?: number;
    dismissReason?: string;
    originalAlertData?: any;
  }
): Promise<DismissedAlert> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const insertData: InsertDismissedAlert = {
    alertType: data.alertType,
    policyNumber: data.policyNumber,
    ownerName: data.ownerName,
    alertDate: data.alertDate,
    dismissedBy: data.dismissedBy,
    dismissReason: data.dismissReason,
    originalAlertData: data.originalAlertData,
  };
  
  await db.insert(dismissedAlerts).values(insertData);
  
  // Return the inserted record
  const [result] = await db
    .select()
    .from(dismissedAlerts)
    .where(eq(dismissedAlerts.policyNumber, data.policyNumber))
    .orderBy(desc(dismissedAlerts.id))
    .limit(1);
  
  return result;
}

/**
 * Restore (un-dismiss) an alert
 */
export async function restoreAlert(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(dismissedAlerts).where(eq(dismissedAlerts.id, id));
}

/**
 * Get all dismissed alerts
 */
export async function getDismissedAlerts(options?: {
  alertType?: string;
  limit?: number;
  offset?: number;
}): Promise<DismissedAlert[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  let query = db.select().from(dismissedAlerts);
  
  if (options?.alertType) {
    query = query.where(eq(dismissedAlerts.alertType, options.alertType as any)) as any;
  }
  
  query = query.orderBy(desc(dismissedAlerts.dismissedAt)) as any;
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return query;
}

/**
 * Get dismissed alert by ID
 */
export async function getDismissedAlertById(id: number): Promise<DismissedAlert | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db
    .select()
    .from(dismissedAlerts)
    .where(eq(dismissedAlerts.id, id))
    .limit(1);
  
  return result || null;
}

/**
 * Filter out dismissed alerts from a list
 */
export async function filterDismissedAlerts<T extends { policyNumber: string; alertDate?: string; alertType?: string }>(
  alerts: T[],
  alertType: string
): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Get all dismissed alerts of this type
  const dismissed = await db
    .select({
      policyNumber: dismissedAlerts.policyNumber,
      alertDate: dismissedAlerts.alertDate,
    })
    .from(dismissedAlerts)
    .where(eq(dismissedAlerts.alertType, alertType as any));
  
  // Create a set of dismissed alert keys for fast lookup
  const dismissedKeys = new Set(
    dismissed.map(d => `${d.policyNumber}|${d.alertDate || ''}`)
  );
  
  // Filter out dismissed alerts
  return alerts.filter(alert => {
    const key = `${alert.policyNumber}|${alert.alertDate || ''}`;
    return !dismissedKeys.has(key);
  });
}

/**
 * Get count of dismissed alerts by type
 */
export async function getDismissedAlertCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const results = await db
    .select({
      alertType: dismissedAlerts.alertType,
    })
    .from(dismissedAlerts);
  
  const counts: Record<string, number> = {
    REVERSED_PREMIUM_PAYMENT: 0,
    EFT_REMOVAL: 0,
    CHARGEBACK: 0,
    OTHER: 0,
  };
  
  results.forEach(r => {
    counts[r.alertType] = (counts[r.alertType] || 0) + 1;
  });
  
  return counts;
}
