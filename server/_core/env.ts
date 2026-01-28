import { validateEnv, mustGetEnv, getEnv, hasMyWFGCredentials, hasTransamericaCredentials, hasSyncSecret } from "./env.schema";

// Validate environment on module load (fail-fast in production)
const validatedEnv = validateEnv();

export const ENV = {
  // Core app config
  nodeEnv: validatedEnv.NODE_ENV,
  isProduction: validatedEnv.NODE_ENV === "production",
  port: validatedEnv.PORT,

  appId: validatedEnv.VITE_APP_ID,
  cookieSecret: validatedEnv.JWT_SECRET,
  databaseUrl: validatedEnv.DATABASE_URL,
  oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL,
  ownerOpenId: validatedEnv.OWNER_OPEN_ID,
  ownerName: validatedEnv.OWNER_NAME,

  // Forge API
  forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL,
  forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY,

  // App branding
  appTitle: validatedEnv.VITE_APP_TITLE,
  appLogo: validatedEnv.VITE_APP_LOGO,

  // Cron / automation controls
  enableCronGetSecret: validatedEnv.ENABLE_CRON_GET_SECRET,
};

// Re-export helpers for use throughout the app
export { mustGetEnv, getEnv, hasMyWFGCredentials, hasTransamericaCredentials, hasSyncSecret };
