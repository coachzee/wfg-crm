import { z } from "zod";

/**
 * Environment variable schema with Zod validation.
 * Required variables will cause the app to fail fast at startup if missing.
 * Optional variables have sensible defaults for development.
 */

const isProduction = process.env.NODE_ENV === "production";

// Helper to create required env var that fails fast in production
const requiredInProd = (name: string) => 
  z.string().min(1, `${name} is required`).optional().transform((val) => {
    if (isProduction && !val) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return val ?? "";
  });

// Helper to strictly require an env var (always required)
const strictlyRequired = (name: string) =>
  z.string().min(1, `${name} is required and cannot be empty`);

// Core app configuration
const coreSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().default("3000"),
  
  // Database (required)
  DATABASE_URL: strictlyRequired("DATABASE_URL"),
  
  // Auth & Security (required)
  JWT_SECRET: strictlyRequired("JWT_SECRET"),
  VITE_APP_ID: strictlyRequired("VITE_APP_ID"),
  OAUTH_SERVER_URL: strictlyRequired("OAUTH_SERVER_URL"),
  VITE_OAUTH_PORTAL_URL: z.string().optional().default(""),
  
  // Owner info
  OWNER_OPEN_ID: z.string().optional().default(""),
  OWNER_NAME: z.string().optional().default(""),
  
  // Forge API (required for LLM/storage features)
  BUILT_IN_FORGE_API_URL: z.string().optional().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().optional().default(""),
  VITE_FRONTEND_FORGE_API_URL: z.string().optional().default(""),
  VITE_FRONTEND_FORGE_API_KEY: z.string().optional().default(""),
  
  // App branding
  VITE_APP_TITLE: z.string().optional().default("Wealth Builders Haven CRM"),
  VITE_APP_LOGO: z.string().optional().default(""),
  
  // Analytics
  VITE_ANALYTICS_ENDPOINT: z.string().optional().default(""),
  VITE_ANALYTICS_WEBSITE_ID: z.string().optional().default(""),
});

// MyWFG credentials (required for sync features)
const mywfgSchema = z.object({
  MYWFG_USERNAME: z.string().optional().default(""),
  MYWFG_PASSWORD: z.string().optional().default(""),
  MYWFG_EMAIL: z.string().optional().default(""),
  MYWFG_APP_PASSWORD: z.string().optional().default(""),
});

// Transamerica credentials (required for sync features)
const transamericaSchema = z.object({
  TRANSAMERICA_USERNAME: z.string().optional().default(""),
  TRANSAMERICA_PASSWORD: z.string().optional().default(""),
  TRANSAMERICA_EMAIL: z.string().optional().default(""),
  TRANSAMERICA_APP_PASSWORD: z.string().optional().default(""),
  TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY: z.string().optional().default(""),
  TRANSAMERICA_SECURITY_Q_PET_NAME: z.string().optional().default(""),
});

// Encryption (required for credential storage)
const encryptionSchema = z.object({
  ENCRYPTION_KEY: z.string().min(16, "ENCRYPTION_KEY must be at least 16 characters").optional()
    .transform((val) => {
      if (isProduction && !val) {
        throw new Error("ENCRYPTION_KEY is required in production");
      }
      return val;
    }),
});

// Sync configuration
const syncSchema = z.object({
  SYNC_SECRET: z.string().optional().default(""),
});

// Combined schema
export const envSchema = coreSchema
  .merge(mywfgSchema)
  .merge(transamericaSchema)
  .merge(encryptionSchema)
  .merge(syncSchema);

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables.
 * Throws descriptive errors if required variables are missing.
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      console.error(`\n❌ Environment validation failed:\n${issues}\n`);
      if (isProduction) {
        process.exit(1);
      }
    }
    throw error;
  }
}

/**
 * Get a required environment variable or throw.
 * Use this for credentials that must exist.
 */
export function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default.
 */
export function getEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] ?? defaultValue;
}

/**
 * Check if all MyWFG credentials are configured.
 */
export function hasMyWFGCredentials(): boolean {
  return !!(
    process.env.MYWFG_USERNAME &&
    process.env.MYWFG_PASSWORD &&
    process.env.MYWFG_EMAIL &&
    process.env.MYWFG_APP_PASSWORD
  );
}

/**
 * Check if all Transamerica credentials are configured.
 */
export function hasTransamericaCredentials(): boolean {
  return !!(
    process.env.TRANSAMERICA_USERNAME &&
    process.env.TRANSAMERICA_PASSWORD &&
    process.env.TRANSAMERICA_EMAIL &&
    process.env.TRANSAMERICA_APP_PASSWORD
  );
}
