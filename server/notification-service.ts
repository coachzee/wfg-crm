import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { workflowTasks, agents, clients } from "../drizzle/schema";
import { eq, lt, and, isNotNull, isNull } from "drizzle-orm";
import { subDays } from "date-fns";

export interface NotificationConfig {
  enableOverdueTaskReminders: boolean;
  enableMilestoneNotifications: boolean;
  enableRenewalReminders: boolean;
  overdueThresholdDays: number;
  renewalThresholdDays: number;
}

const defaultConfig: NotificationConfig = {
  enableOverdueTaskReminders: true,
  enableMilestoneNotifications: true,
  enableRenewalReminders: true,
  overdueThresholdDays: 3,
  renewalThresholdDays: 30,
};

/**
 * Check for overdue tasks and send notifications
 */
export async function checkOverdueTasks(config: NotificationConfig = defaultConfig) {
  if (!config.enableOverdueTaskReminders) return;

  try {
    const db = await getDb();
    if (!db) return;

    const thresholdDate = subDays(new Date(), config.overdueThresholdDays);

    const overdueTasks = await db
      .select()
      .from(workflowTasks)
      .where(
        and(
          lt(workflowTasks.dueDate, thresholdDate),
          isNull(workflowTasks.completedAt),
          isNotNull(workflowTasks.dueDate)
        )
      );

    if (overdueTasks.length > 0) {
      const taskSummary = overdueTasks
        .map((t) => `- ${t.description || t.taskType} (Due: ${t.dueDate.toLocaleDateString()})`)
        .join("\n");

      await notifyOwner({
        title: `⚠️ ${overdueTasks.length} Overdue Tasks`,
        content: `You have ${overdueTasks.length} overdue follow-up tasks that need attention:\n\n${taskSummary}\n\nPlease review and take action on these items.`,
      });

      console.log(`[Notifications] Sent overdue tasks reminder for ${overdueTasks.length} tasks`);
    }
  } catch (error) {
    console.error("[Notifications] Error checking overdue tasks:", error);
  }
}

/**
 * Check for agents reaching production milestones
 */
export async function checkProductionMilestones(config: NotificationConfig = defaultConfig) {
  if (!config.enableMilestoneNotifications) return;

  try {
    const db = await getDb();
    if (!db) return;

    // Get all agents
    const allAgents = await db.select().from(agents);

    const milestoneAgents: Array<{ name: string; production: number; stage: string }> = [];

    // Check each agent's production (this is a simplified check)
    // In production, you'd query the production records table
    for (const agent of allAgents) {
      // Check if agent just reached Net Licensed stage
      if (agent.currentStage === "NET_LICENSED" && agent.updatedAt > subDays(new Date(), 1)) {
        milestoneAgents.push({
          name: `${agent.firstName} ${agent.lastName}`,
          production: 1000,
          stage: agent.currentStage,
        });
      }
    }

    if (milestoneAgents.length > 0) {
      const milestoneSummary = milestoneAgents
        .map((a) => `- ${a.name} reached ${a.stage} stage`)
        .join("\n");

      await notifyOwner({
        title: `🎉 ${milestoneAgents.length} Agent Milestone(s) Reached`,
        content: `Congratulations! Your team has reached important milestones:\n\n${milestoneSummary}`,
      });

      console.log(
        `[Notifications] Sent milestone notification for ${milestoneAgents.length} agents`
      );
    }
  } catch (error) {
    console.error("[Notifications] Error checking production milestones:", error);
  }
}

/**
 * Check for upcoming policy renewals
 */
export async function checkPolicyRenewals(config: NotificationConfig = defaultConfig) {
  if (!config.enableRenewalReminders) return;

  try {
    const db = await getDb();
    if (!db) return;

    const renewalThresholdDate = new Date();
    renewalThresholdDate.setDate(
      renewalThresholdDate.getDate() + config.renewalThresholdDays
    );

    // Get clients with renewal dates coming up
    const allClients = await db.select().from(clients);
    const upcomingRenewals = allClients.filter(
      (c) => c.renewalDate && new Date(c.renewalDate) <= renewalThresholdDate && new Date(c.renewalDate) > new Date()
    );

    if (upcomingRenewals.length > 0) {
      const renewalSummary = upcomingRenewals
        .map((c) => `- ${c.firstName} ${c.lastName} (Renewal: ${c.renewalDate?.toLocaleDateString()})`)
        .join("\n");

      await notifyOwner({
        title: `📅 ${upcomingRenewals.length} Policy Renewal(s) Coming Up`,
        content: `You have ${upcomingRenewals.length} client policies renewing soon:\n\n${renewalSummary}\n\nReach out to these clients to renew their policies.`,
      });

      console.log(
        `[Notifications] Sent renewal reminder for ${upcomingRenewals.length} clients`
      );
    }
  } catch (error) {
    console.error("[Notifications] Error checking policy renewals:", error);
  }
}

/**
 * Run all notification checks
 */
export async function runAllNotificationChecks(config: NotificationConfig = defaultConfig) {
  console.log("[Notifications] Running all notification checks...");

  await Promise.all([
    checkOverdueTasks(config),
    checkProductionMilestones(config),
    checkPolicyRenewals(config),
  ]);

  console.log("[Notifications] Notification checks completed");
}

/**
 * Schedule notification checks to run daily
 */
export function scheduleNotificationChecks(
  config: NotificationConfig = defaultConfig,
  timeOfDay: string = "08:00"
) {
  // Parse time (HH:MM format)
  const parts = timeOfDay.split(":");
  const hours = parseInt(parts[0] || "8", 10);
  const minutes = parseInt(parts[1] || "0", 10);

  // Calculate next run time
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delayMs = nextRun.getTime() - now.getTime();

  console.log(
    `[Notifications] Scheduled daily checks at ${timeOfDay}. Next run in ${Math.round(delayMs / 1000 / 60)} minutes`
  );

  // Initial timeout to first run
  setTimeout(() => {
    runAllNotificationChecks(config);

    // Then run daily
    setInterval(() => {
      runAllNotificationChecks(config);
    }, 24 * 60 * 60 * 1000);
  }, delayMs);
}
