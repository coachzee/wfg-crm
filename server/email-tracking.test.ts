import { describe, it, expect, beforeAll } from "vitest";
import {
  createEmailTracking,
  markEmailSent,
  markEmailFailed,
  recordEmailOpen,
  recordEmailClick,
  getEmailTrackingStats,
  getRecentEmailTracking,
  getAnniversaryEmailStats,
} from "./email-tracking";
import { getDb } from "./_core/db";
import { emailTracking } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Email Tracking", () => {
  let testTrackingId: string;

  describe("createEmailTracking", () => {
    it("should create a new email tracking record", async () => {
      testTrackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "test@example.com",
        recipientName: "Test Client",
        subject: "Happy Policy Anniversary!",
        relatedEntityType: "POLICY",
        relatedEntityId: "POL123456",
      });

      expect(testTrackingId).toBeDefined();
      expect(typeof testTrackingId).toBe("string");
      expect(testTrackingId.length).toBeGreaterThan(0);
    });

    it("should create tracking record with minimal required fields", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_REMINDER",
        recipientEmail: "minimal@example.com",
      });

      expect(trackingId).toBeDefined();
      expect(typeof trackingId).toBe("string");
    });
  });

  describe("markEmailSent", () => {
    it("should mark email as sent", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "sent@example.com",
      });

      await markEmailSent(trackingId);

      const db = await getDb();
      if (!db) return;
      
      const [record] = await db
        .select()
        .from(emailTracking)
        .where(eq(emailTracking.trackingId, trackingId))
        .limit(1);

      expect(record.sendStatus).toBe("SENT");
      expect(record.sentAt).toBeDefined();
    });
  });

  describe("markEmailFailed", () => {
    it("should mark email as failed with error message", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "failed@example.com",
      });

      await markEmailFailed(trackingId, "SMTP connection failed");

      const db = await getDb();
      if (!db) return;
      
      const [record] = await db
        .select()
        .from(emailTracking)
        .where(eq(emailTracking.trackingId, trackingId))
        .limit(1);

      expect(record.sendStatus).toBe("FAILED");
      expect(record.errorMessage).toBe("SMTP connection failed");
    });
  });

  describe("recordEmailOpen", () => {
    it("should record email open event", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "opened@example.com",
      });
      await markEmailSent(trackingId);

      await recordEmailOpen(trackingId, "Mozilla/5.0", "192.168.1.1");

      const db = await getDb();
      if (!db) return;
      
      const [record] = await db
        .select()
        .from(emailTracking)
        .where(eq(emailTracking.trackingId, trackingId))
        .limit(1);

      expect(record.openedAt).toBeDefined();
      expect(record.openCount).toBe(1);
      expect(record.lastUserAgent).toBe("Mozilla/5.0");
      expect(record.lastIpAddress).toBe("192.168.1.1");
    });

    it("should increment open count on subsequent opens", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "multiopen@example.com",
      });
      await markEmailSent(trackingId);

      await recordEmailOpen(trackingId, "Mozilla/5.0", "192.168.1.1");
      await recordEmailOpen(trackingId, "Chrome/100", "192.168.1.2");

      const db = await getDb();
      if (!db) return;
      
      const [record] = await db
        .select()
        .from(emailTracking)
        .where(eq(emailTracking.trackingId, trackingId))
        .limit(1);

      expect(record.openCount).toBe(2);
    });
  });

  describe("recordEmailClick", () => {
    it("should record email click event", async () => {
      const trackingId = await createEmailTracking({
        emailType: "ANNIVERSARY_GREETING",
        recipientEmail: "clicked@example.com",
      });
      await markEmailSent(trackingId);

      await recordEmailClick(trackingId, "https://example.com/schedule", "Mozilla/5.0", "192.168.1.1");

      const db = await getDb();
      if (!db) return;
      
      const [record] = await db
        .select()
        .from(emailTracking)
        .where(eq(emailTracking.trackingId, trackingId))
        .limit(1);

      expect(record.clickedAt).toBeDefined();
      expect(record.clickCount).toBe(1);
      expect(record.lastClickedUrl).toBe("https://example.com/schedule");
    });
  });

  describe("getEmailTrackingStats", () => {
    it("should return email tracking statistics", async () => {
      const stats = await getEmailTrackingStats(30);

      expect(stats).toBeDefined();
      expect(typeof stats.totalSent).toBe("number");
      expect(typeof stats.totalOpened).toBe("number");
      expect(typeof stats.totalClicked).toBe("number");
      expect(typeof stats.openRate).toBe("number");
      expect(typeof stats.clickRate).toBe("number");
      expect(Array.isArray(stats.byType)).toBe(true);
    });
  });

  describe("getRecentEmailTracking", () => {
    it("should return recent email tracking records", async () => {
      const records = await getRecentEmailTracking(10);

      expect(Array.isArray(records)).toBe(true);
      if (records.length > 0) {
        expect(records[0]).toHaveProperty("trackingId");
        expect(records[0]).toHaveProperty("emailType");
        expect(records[0]).toHaveProperty("recipientEmail");
      }
    });
  });

  describe("getAnniversaryEmailStats", () => {
    it("should return anniversary email specific statistics", async () => {
      const stats = await getAnniversaryEmailStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("thisWeek");
      expect(stats).toHaveProperty("thisMonth");
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("recentEmails");

      expect(typeof stats.thisWeek.sent).toBe("number");
      expect(typeof stats.thisWeek.opened).toBe("number");
      expect(typeof stats.thisWeek.clicked).toBe("number");

      expect(typeof stats.thisMonth.sent).toBe("number");
      expect(typeof stats.total.sent).toBe("number");
    });
  });
});
