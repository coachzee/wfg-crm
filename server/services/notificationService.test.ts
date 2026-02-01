import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notifications repository
vi.mock("../repositories/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue({
    id: 1,
    type: "SYNC_COMPLETED",
    title: "Test",
    message: "Test message",
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  }),
  createBulkNotifications: vi.fn().mockResolvedValue(5),
  hasSimilarNotification: vi.fn().mockResolvedValue(false),
}));

import {
  notifySyncCompleted,
  notifySyncFailed,
  notifyPolicyAnniversary,
  notifyAgentMilestone,
  notifyChargebackAlert,
  notifyNewPolicy,
  notifySystemAlert,
  notifyTaskDue,
  notifyWelcome,
  broadcastNotification,
} from "./notificationService";
import * as notificationsRepo from "../repositories/notifications";

describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifySyncCompleted", () => {
    it("should create a sync completed notification", async () => {
      await notifySyncCompleted({
        syncType: "Transamerica",
        duration: 5000,
        metrics: { policiesProcessed: 10 },
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNC_COMPLETED",
          title: "Transamerica Sync Completed",
          priority: "LOW",
        })
      );
    });

    it("should skip duplicate notifications within 5 minutes", async () => {
      vi.mocked(notificationsRepo.hasSimilarNotification).mockResolvedValueOnce(true);

      await notifySyncCompleted({
        syncType: "Transamerica",
        duration: 5000,
      });

      expect(notificationsRepo.createNotification).not.toHaveBeenCalled();
    });
  });

  describe("notifySyncFailed", () => {
    it("should create a sync failed notification with HIGH priority", async () => {
      await notifySyncFailed({
        syncType: "Transamerica",
        error: "Connection timeout",
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYNC_FAILED",
          title: "Transamerica Sync Failed",
          priority: "HIGH",
        })
      );
    });

    it("should truncate long error messages", async () => {
      const longError = "A".repeat(300);
      
      await notifySyncFailed({
        syncType: "Test",
        error: longError,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/^A{200}\.\.\.$/),
        })
      );
    });
  });

  describe("notifyPolicyAnniversary", () => {
    it("should create a policy anniversary notification", async () => {
      await notifyPolicyAnniversary({
        policyNumber: "POL123",
        ownerName: "John Doe",
        anniversaryDate: "2024-03-15",
        daysUntil: 14,
        premium: 500,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "POLICY_ANNIVERSARY",
          title: "Policy Anniversary in 14 days",
          priority: "MEDIUM",
          relatedEntityType: "policy",
          relatedEntityId: "POL123",
        })
      );
    });

    it("should set HIGH priority for anniversaries within 7 days", async () => {
      await notifyPolicyAnniversary({
        policyNumber: "POL123",
        ownerName: "John Doe",
        anniversaryDate: "2024-03-15",
        daysUntil: 5,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "HIGH",
        })
      );
    });
  });

  describe("notifyAgentMilestone", () => {
    it("should create milestone notifications with correct messages", async () => {
      await notifyAgentMilestone({
        agentId: 1,
        agentName: "Jane Smith",
        milestone: "NET_LICENSED",
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "AGENT_MILESTONE",
          title: "Agent Became Net Licensed!",
          message: expect.stringContaining("Jane Smith"),
        })
      );
    });

    it("should include rank details for RANK_UP milestone", async () => {
      await notifyAgentMilestone({
        agentId: 1,
        agentName: "Jane Smith",
        milestone: "RANK_UP",
        details: "Senior Associate",
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Senior Associate"),
        })
      );
    });
  });

  describe("notifyChargebackAlert", () => {
    it("should create a chargeback alert with URGENT priority", async () => {
      await notifyChargebackAlert({
        policyNumber: "POL456",
        ownerName: "Bob Wilson",
        alertType: "Reversed Premium",
        amount: 1500,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "CHARGEBACK_ALERT",
          priority: "URGENT",
          title: "Chargeback Alert: Reversed Premium",
        })
      );
    });
  });

  describe("notifyNewPolicy", () => {
    it("should create a new policy notification", async () => {
      await notifyNewPolicy({
        policyNumber: "POL789",
        ownerName: "Alice Brown",
        agentName: "Jane Smith",
        premium: 2000,
        faceAmount: 500000,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "NEW_POLICY",
          title: "New Policy Issued!",
          message: expect.stringContaining("Jane Smith"),
        })
      );
    });
  });

  describe("notifySystemAlert", () => {
    it("should create a system alert notification", async () => {
      await notifySystemAlert({
        title: "Maintenance Scheduled",
        message: "System will be down for maintenance",
        priority: "HIGH",
        linkUrl: "/status",
        linkLabel: "View Status",
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SYSTEM_ALERT",
          title: "Maintenance Scheduled",
          priority: "HIGH",
        })
      );
    });
  });

  describe("notifyTaskDue", () => {
    it("should create a task due notification", async () => {
      await notifyTaskDue({
        taskId: 123,
        taskType: "FOLLOW_UP_CALL",
        description: "Call client about policy renewal",
        dueDate: "2024-03-15",
        userId: 1,
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "TASK_DUE",
          title: "Task Due: FOLLOW UP CALL",
          relatedEntityType: "task",
          relatedEntityId: "123",
        })
      );
    });
  });

  describe("notifyWelcome", () => {
    it("should create a welcome notification for new users", async () => {
      await notifyWelcome(1, "New User");

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WELCOME",
          title: "Welcome to WFG CRM!",
          message: expect.stringContaining("New User"),
          priority: "LOW",
        })
      );
    });
  });

  describe("broadcastNotification", () => {
    it("should create a broadcast notification with null userId", async () => {
      await broadcastNotification({
        type: "SYSTEM_ALERT",
        title: "System Update",
        message: "New features available",
        priority: "MEDIUM",
      });

      expect(notificationsRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          type: "SYSTEM_ALERT",
        })
      );
    });
  });
});
