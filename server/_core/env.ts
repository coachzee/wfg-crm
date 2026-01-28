import { validateEnv, mustGetEnv, getEnv, hasMyWFGCredentials, hasTransamericaCredentials } from "./env.schema";

// Validate environment on module load
const validatedEnv = validateEnv();

export const ENV = {
  // Core app config
  appId: validatedEnv.VITE_APP_ID,
  cookieSecret: validatedEnv.JWT_SECRET,
  databaseUrl: validatedEnv.DATABASE_URL,
  oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL,
  ownerOpenId: validatedEnv.OWNER_OPEN_ID,
  ownerName: validatedEnv.OWNER_NAME,
  isProduction: validatedEnv.NODE_ENV === "production",
  
  // Forge API
  forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL,
  forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY,
  
  // App branding
  appTitle: validatedEnv.VITE_APP_TITLE,
  appLogo: validatedEnv.VITE_APP_LOGO,
};

// Re-export helpers for use throughout the app
export { mustGetEnv, getEnv, hasMyWFGCredentials, hasTransamericaCredentials };
