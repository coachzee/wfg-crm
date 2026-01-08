export const ENV = {
  // Application settings
  appId: process.env.VITE_APP_ID ?? "wbh-crm",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  
  // Notification services (optional - configure one)
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? "",
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
  
  // Email settings (optional - for email notifications)
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  
  // External service credentials
  transamericaUsername: process.env.TRANSAMERICA_USERNAME ?? "",
  transamericaPassword: process.env.TRANSAMERICA_PASSWORD ?? "",
  mywfgUsername: process.env.MYWFG_USERNAME ?? "",
  mywfgPassword: process.env.MYWFG_PASSWORD ?? "",
};
