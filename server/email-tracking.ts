import { getDb } from "./db";
import { emailTracking, scheduledEmails } from "../drizzle/schema";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Create a new email tracking record
export async function createEmailTracking(params: {
  emailType: "ANNIVERSARY_GREETING" | "ANNIVERSARY_REMINDER" | "POLICY_REVIEW_REMINDER" | "CHARGEBACK_ALERT" | "GENERAL_NOTIFICATION";
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database connection not available");
  const trackingId = uuidv4();
  
  await db.insert(emailTracking).values({
    trackingId,
    emailType: params.emailType,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName || null,
    subject: params.subject || null,
    relatedEntityType: params.relatedEntityType || null,
    relatedEntityId: params.relatedEntityId || null,
    metadata: params.metadata || null,
    sendStatus: "PENDING",
  });
  
  return trackingId;
}

// Mark email as sent
export async function markEmailSent(trackingId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(emailTracking)
    .set({
      sendStatus: "SENT",
      sentAt: new Date(),
    })
    .where(eq(emailTracking.trackingId, trackingId));
}

// Mark email as failed
export async function markEmailFailed(trackingId: string, error: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(emailTracking)
    .set({
      sendStatus: "FAILED",
      sendError: error,
    })
    .where(eq(emailTracking.trackingId, trackingId));
}

// Record email open event
export async function recordEmailOpen(
  trackingId: string,
  userAgent: string,
  ipAddress: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  
  // Get current record to check if this is first open
  const [existing] = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.trackingId, trackingId))
    .limit(1);
  
  if (!existing) {
    console.log(`[Email Tracking] Unknown tracking ID: ${trackingId}`);
    return;
  }
  
  // Update open tracking
  await db
    .update(emailTracking)
    .set({
      openedAt: existing.openedAt || now, // Keep first open time
      openCount: (existing.openCount || 0) + 1,
      lastOpenedAt: now,
      lastUserAgent: userAgent,
      lastIpAddress: ipAddress,
    })
    .where(eq(emailTracking.trackingId, trackingId));
  
  console.log(`[Email Tracking] Open recorded for ${trackingId} (total: ${(existing.openCount || 0) + 1})`);
}

// Allowlist of domains that are safe to redirect to
const ALLOWED_REDIRECT_DOMAINS = [
  // Add your own domains here
  'manus.space',
  'manus.im',
  'mywfg.com',
  'transamerica.com',
  'wfgconnects.com',
  // Common safe domains
  'google.com',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'youtube.com',
];

/**
 * Validate a redirect URL against an allowlist of safe domains.
 * SECURITY: Prevents open redirect attacks by only allowing redirects to known-safe domains.
 * 
 * @param trackingId - The email tracking ID
 * @param providedUrl - The URL provided in the query string (optional)
 * @returns The validated URL or null if invalid
 */
export async function getValidatedRedirectUrl(
  trackingId: string,
  providedUrl?: string
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  // First, try to get the stored URL from the email tracking record
  const [record] = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.trackingId, trackingId))
    .limit(1);
  
  // If we have a stored URL in metadata, use that (most secure)
  if (record?.metadata && typeof record.metadata === 'object') {
    const metadata = record.metadata as Record<string, unknown>;
    if (metadata.redirectUrl && typeof metadata.redirectUrl === 'string') {
      return metadata.redirectUrl;
    }
  }
  
  // If no stored URL, validate the provided URL against allowlist
  if (!providedUrl) {
    return null;
  }
  
  try {
    const url = new URL(providedUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Check if the hostname matches any allowed domain (including subdomains)
    const isAllowed = ALLOWED_REDIRECT_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
    
    if (isAllowed) {
      return providedUrl;
    }
    
    // Also allow same-origin redirects
    const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || '';
    if (appUrl) {
      const appHostname = new URL(appUrl).hostname.toLowerCase();
      if (hostname === appHostname || hostname.endsWith(`.${appHostname}`)) {
        return providedUrl;
      }
    }
    
    console.warn(`[Click Tracking] Blocked redirect to untrusted domain: ${hostname}`);
    return null;
  } catch (error) {
    console.warn(`[Click Tracking] Invalid URL format: ${providedUrl}`);
    return null;
  }
}

// Record email click event
export async function recordEmailClick(
  trackingId: string,
  clickedUrl: string,
  userAgent: string,
  ipAddress: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  
  // Get current record
  const [existing] = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.trackingId, trackingId))
    .limit(1);
  
  if (!existing) {
    console.log(`[Email Tracking] Unknown tracking ID: ${trackingId}`);
    return;
  }
  
  // Update clicked links array
  const currentLinks = (existing.clickedLinks as string[]) || [];
  if (!currentLinks.includes(clickedUrl)) {
    currentLinks.push(clickedUrl);
  }
  
  // Update click tracking
  await db
    .update(emailTracking)
    .set({
      clickedAt: existing.clickedAt || now, // Keep first click time
      clickCount: (existing.clickCount || 0) + 1,
      lastClickedAt: now,
      clickedLinks: currentLinks,
      lastUserAgent: userAgent,
      lastIpAddress: ipAddress,
    })
    .where(eq(emailTracking.trackingId, trackingId));
  
  console.log(`[Email Tracking] Click recorded for ${trackingId} - URL: ${clickedUrl}`);
}

// Get email tracking statistics for dashboard
export async function getEmailTrackingStats(days: number = 30): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  byType: Array<{
    emailType: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>;
}> {
  const db = await getDb();
  if (!db) return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0, byType: [] };
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Get all emails in the period
  const emails = await db
    .select()
    .from(emailTracking)
    .where(
      and(
        eq(emailTracking.sendStatus, "SENT"),
        gte(emailTracking.sentAt, cutoffDate)
      )
    );
  
  const totalSent = emails.length;
  const totalOpened = emails.filter((e: typeof emails[0]) => e.openCount && e.openCount > 0).length;
  const totalClicked = emails.filter((e: typeof emails[0]) => e.clickCount && e.clickCount > 0).length;
  
  // Group by email type
  const byTypeMap = new Map<string, { sent: number; opened: number; clicked: number }>();
  
  for (const email of emails) {
    const type = email.emailType;
    const current = byTypeMap.get(type) || { sent: 0, opened: 0, clicked: 0 };
    current.sent++;
    if (email.openCount && email.openCount > 0) current.opened++;
    if (email.clickCount && email.clickCount > 0) current.clicked++;
    byTypeMap.set(type, current);
  }
  
  const byType = Array.from(byTypeMap.entries()).map(([emailType, stats]) => ({
    emailType,
    sent: stats.sent,
    opened: stats.opened,
    clicked: stats.clicked,
    openRate: stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0,
    clickRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0,
  }));
  
  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    byType,
  };
}

// Get recent email tracking records for detailed view
export async function getRecentEmailTracking(limit: number = 50): Promise<Array<{
  id: number;
  trackingId: string;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  relatedEntityId: string | null;
  sentAt: Date | null;
  sendStatus: string | null;
  openedAt: Date | null;
  openCount: number;
  clickedAt: Date | null;
  clickCount: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  const records = await db
    .select({
      id: emailTracking.id,
      trackingId: emailTracking.trackingId,
      emailType: emailTracking.emailType,
      recipientEmail: emailTracking.recipientEmail,
      recipientName: emailTracking.recipientName,
      subject: emailTracking.subject,
      relatedEntityId: emailTracking.relatedEntityId,
      sentAt: emailTracking.sentAt,
      sendStatus: emailTracking.sendStatus,
      openedAt: emailTracking.openedAt,
      openCount: emailTracking.openCount,
      clickedAt: emailTracking.clickedAt,
      clickCount: emailTracking.clickCount,
    })
    .from(emailTracking)
    .orderBy(desc(emailTracking.createdAt))
    .limit(limit);
  
  return records.map((r: typeof records[0]) => ({
    ...r,
    openCount: r.openCount || 0,
    clickCount: r.clickCount || 0,
  }));
}

// Get anniversary email tracking specifically
export async function getAnniversaryEmailStats(): Promise<{
  thisWeek: { sent: number; opened: number; clicked: number };
  thisMonth: { sent: number; opened: number; clicked: number };
  total: { sent: number; opened: number; clicked: number };
  recentEmails: Array<{
    recipientName: string | null;
    recipientEmail: string;
    policyNumber: string | null;
    sentAt: Date | null;
    opened: boolean;
    clicked: boolean;
  }>;
}> {
  const db = await getDb();
  if (!db) return { thisWeek: { sent: 0, opened: 0, clicked: 0 }, thisMonth: { sent: 0, opened: 0, clicked: 0 }, total: { sent: 0, opened: 0, clicked: 0 }, recentEmails: [] };
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Get all anniversary greeting emails
  const emails = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.emailType, "ANNIVERSARY_GREETING"))
    .orderBy(desc(emailTracking.sentAt));
  
  const sentEmails = emails.filter((e: typeof emails[0]) => e.sendStatus && e.sendStatus === "SENT");
  
  // Calculate stats for different periods
  const thisWeekEmails = sentEmails.filter((e: typeof sentEmails[0]) => e.sentAt && e.sentAt >= weekAgo);
  const thisMonthEmails = sentEmails.filter((e: typeof sentEmails[0]) => e.sentAt && e.sentAt >= monthAgo);
  
  const calcStats = (list: typeof sentEmails) => ({
    sent: list.length,
    opened: list.filter((e: typeof sentEmails[0]) => e.openCount && e.openCount > 0).length,
    clicked: list.filter((e: typeof sentEmails[0]) => e.clickCount && e.clickCount > 0).length,
  });
  
  // Get recent emails for detailed view
  const recentEmails = sentEmails.slice(0, 20).map((e: typeof sentEmails[0]) => ({
    recipientName: e.recipientName,
    recipientEmail: e.recipientEmail,
    policyNumber: e.relatedEntityId,
    sentAt: e.sentAt,
    opened: (e.openCount || 0) > 0,
    clicked: (e.clickCount || 0) > 0,
  }));
  
  return {
    thisWeek: calcStats(thisWeekEmails),
    thisMonth: calcStats(thisMonthEmails),
    total: calcStats(sentEmails),
    recentEmails,
  };
}

// Generate tracking pixel URL
export function getTrackingPixelUrl(trackingId: string, baseUrl: string): string {
  return `${baseUrl}/api/track/open/${trackingId}`;
}

// Generate tracked link URL
export function getTrackedLinkUrl(trackingId: string, originalUrl: string, baseUrl: string): string {
  return `${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(originalUrl)}`;
}


// Get emails eligible for resend (not opened after X days)
export async function getEmailsEligibleForResend(daysThreshold: number = 3): Promise<Array<{
  id: number;
  trackingId: string;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  relatedEntityId: string | null;
  sentAt: Date | null;
  resendCount: number;
  daysSinceSent: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  
  // Get emails that were sent, not opened, and sent before the threshold
  const emails = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.sendStatus, "SENT"))
    .orderBy(desc(emailTracking.sentAt));
  
  // Filter for unopened emails older than threshold
  const eligibleEmails = emails.filter((e: typeof emails[0]) => {
    if (!e.sentAt) return false;
    if (e.openCount && e.openCount > 0) return false; // Already opened
    if (e.sentAt > cutoffDate) return false; // Too recent
    return true;
  });
  
  return eligibleEmails.map((e: typeof eligibleEmails[0]) => {
    const daysSinceSent = e.sentAt 
      ? Math.floor((Date.now() - new Date(e.sentAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      id: e.id,
      trackingId: e.trackingId,
      emailType: e.emailType,
      recipientEmail: e.recipientEmail,
      recipientName: e.recipientName,
      subject: e.subject,
      relatedEntityId: e.relatedEntityId,
      sentAt: e.sentAt,
      resendCount: e.resendCount || 0,
      daysSinceSent,
      metadata: e.metadata as Record<string, unknown> | null,
    };
  });
}

// Mark email as resent and update resend count
export async function markEmailResent(trackingId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const [existing] = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.trackingId, trackingId))
    .limit(1);
  
  if (!existing) return;
  
  await db
    .update(emailTracking)
    .set({
      resendCount: (existing.resendCount || 0) + 1,
      lastResendAt: new Date(),
    })
    .where(eq(emailTracking.trackingId, trackingId));
}

// Get email details by tracking ID for resending
export async function getEmailByTrackingId(trackingId: string): Promise<{
  id: number;
  trackingId: string;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown> | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [email] = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.trackingId, trackingId))
    .limit(1);
  
  if (!email) return null;
  
  return {
    id: email.id,
    trackingId: email.trackingId,
    emailType: email.emailType,
    recipientEmail: email.recipientEmail,
    recipientName: email.recipientName,
    subject: email.subject,
    relatedEntityType: email.relatedEntityType,
    relatedEntityId: email.relatedEntityId,
    metadata: email.metadata as Record<string, unknown> | null,
  };
}


// ============================================
// SCHEDULED EMAILS FUNCTIONS
// ============================================

// Schedule an email for later sending
export async function scheduleEmail(params: {
  originalTrackingId: string;
  emailType: "ANNIVERSARY_GREETING" | "ANNIVERSARY_REMINDER" | "POLICY_REVIEW_REMINDER" | "CHARGEBACK_ALERT" | "GENERAL_NOTIFICATION";
  recipientEmail: string;
  recipientName?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  scheduledFor: Date;
  customContent?: {
    greetingMessage?: string;
    personalNote?: string;
    closingMessage?: string;
  };
  metadata?: Record<string, unknown> | null;
  createdBy: number;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection not available");
  
  const result = await db.insert(scheduledEmails).values({
    originalTrackingId: params.originalTrackingId,
    emailType: params.emailType,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName || null,
    relatedEntityType: params.relatedEntityType || null,
    relatedEntityId: params.relatedEntityId || null,
    scheduledFor: params.scheduledFor,
    customContent: params.customContent || null,
    metadata: params.metadata || null,
    createdBy: params.createdBy,
    status: "PENDING",
  });
  
  return { id: Number((result as unknown as { insertId: number }).insertId) };
}

// Get all pending scheduled emails
export async function getScheduledEmails(): Promise<Array<{
  id: number;
  originalTrackingId: string | null;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  relatedEntityId: string | null;
  scheduledFor: Date;
  status: string;
  customContent: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const records = await db
    .select()
    .from(scheduledEmails)
    .where(eq(scheduledEmails.status, "PENDING"))
    .orderBy(scheduledEmails.scheduledFor);
  
  return records.map((r) => ({
    id: r.id,
    originalTrackingId: r.originalTrackingId,
    emailType: r.emailType,
    recipientEmail: r.recipientEmail,
    recipientName: r.recipientName,
    relatedEntityId: r.relatedEntityId,
    scheduledFor: r.scheduledFor,
    status: r.status,
    customContent: r.customContent as Record<string, unknown> | null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}

// Cancel a scheduled email
export async function cancelScheduledEmail(scheduledId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(scheduledEmails)
    .set({
      status: "CANCELLED",
    })
    .where(eq(scheduledEmails.id, scheduledId));
}

// Process scheduled emails that are due
export async function processScheduledEmails(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, succeeded: 0, failed: 0 };
  
  const now = new Date();
  
  // Get all pending emails that are due
  const dueEmails = await db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, "PENDING"),
        lte(scheduledEmails.scheduledFor, now)
      )
    );
  
  let succeeded = 0;
  let failed = 0;
  
  for (const email of dueEmails) {
    try {
      // Import the email sending function
      const { sendClientAnniversaryGreeting } = await import("./email-alert");
      
      // Get metadata for the email
      const metadata = (email.metadata || {}) as Record<string, unknown>;
      const customContent = (email.customContent || {}) as {
        greetingMessage?: string;
        personalNote?: string;
        closingMessage?: string;
      };
      
      // Parse client name
      const clientName = email.recipientName || "Valued Client";
      const nameParts = clientName.split(" ");
      const firstName = nameParts[0] || "Valued";
      const lastName = nameParts.slice(1).join(" ") || "Client";
      
      // Send the email
      const result = await sendClientAnniversaryGreeting({
        email: email.recipientEmail,
        firstName,
        lastName,
        policyNumber: email.relatedEntityId || "",
        faceAmount: (metadata.faceAmount as string) || "N/A",
        policyAge: (metadata.policyAge as number) || 1,
        productType: (metadata.productType as string) || "Life Insurance",
        agentName: (metadata.agentName as string) || "Your WFG Agent",
        agentPhone: (metadata.agentPhone as string) || "",
        agentEmail: (metadata.agentEmail as string) || "",
      }, {
        customContent: Object.keys(customContent).length > 0 ? customContent : undefined,
      });
      
      if (result.success) {
        // Mark as sent
        await db
          .update(scheduledEmails)
          .set({
            status: "SENT",
            processedAt: new Date(),
            newTrackingId: result.trackingId,
          })
          .where(eq(scheduledEmails.id, email.id));
        
        // Mark original email as resent if applicable
        if (email.originalTrackingId) {
          await markEmailResent(email.originalTrackingId);
        }
        
        succeeded++;
      } else {
        // Mark as failed
        await db
          .update(scheduledEmails)
          .set({
            status: "FAILED",
            processedAt: new Date(),
            errorMessage: "Email sending failed",
          })
          .where(eq(scheduledEmails.id, email.id));
        failed++;
      }
    } catch (error) {
      // Mark as failed
      await db
        .update(scheduledEmails)
        .set({
          status: "FAILED",
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(scheduledEmails.id, email.id));
      failed++;
    }
  }
  
  return {
    processed: dueEmails.length,
    succeeded,
    failed,
  };
}
