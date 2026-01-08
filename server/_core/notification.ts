import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a notification to the system owner.
 * 
 * This is a placeholder implementation. In production, you should configure
 * one of the following notification methods:
 * 
 * 1. Email (SMTP) - Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, OWNER_EMAIL
 * 2. Slack Webhook - Configure SLACK_WEBHOOK_URL
 * 3. Discord Webhook - Configure DISCORD_WEBHOOK_URL
 * 4. Telegram Bot - Configure TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * 
 * Returns `true` if the notification was sent, `false` otherwise.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // Check if Slack webhook is configured
  if (ENV.slackWebhookUrl) {
    try {
      const response = await fetch(ENV.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${title}*\n${content}`,
        }),
      });
      return response.ok;
    } catch (error) {
      console.warn("[Notification] Error sending Slack notification:", error);
      return false;
    }
  }

  // Check if Discord webhook is configured
  if (ENV.discordWebhookUrl) {
    try {
      const response = await fetch(ENV.discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**${title}**\n${content}`,
        }),
      });
      return response.ok;
    } catch (error) {
      console.warn("[Notification] Error sending Discord notification:", error);
      return false;
    }
  }

  // If no notification service is configured, log to console
  console.log(`[Notification] ${title}: ${content}`);
  console.warn(
    "[Notification] No notification service configured. " +
    "Set SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL in environment variables."
  );
  
  return true; // Return true to not block the application
}
