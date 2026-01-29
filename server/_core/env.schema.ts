import { z } from "zod";

/**
 * Environment variable schema with Zod validation.
 * Required variables will cause the app to fail fast at startup if missing.
 * In production, additional variables are required for unattended automation.
 */

// Base schema - always validated
const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Core required variables
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  
  // Encryption key - required for credential storage
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),
  
  // Sync secret - required for cron endpoint authentication
  SYNC_SECRET: z.string().min(16, "SYNC_SECRET must be at least 16 characters").optional(),

  // OAuth configuration
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
  OAUTH_SERVER_URL: z.string().min(1, "OAUTH_SERVER_URL is required"),
  VITE_OAUTH_PORTAL_URL: z.string().optional().default(""),

  // Owner info
  OWNER_OPEN_ID: z.string().optional().default(""),
  OWNER_NAME: z.string().optional().default(""),

  // Forge API
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

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("pretty"),

  // MyWFG credentials (optional in dev, validated in prod for unattended sync)
  MYWFG_USERNAME: z.string().optional().default(""),
  MYWFG_PASSWORD: z.string().optional().default(""),
  MYWFG_EMAIL: z.string().optional().default(""),
  MYWFG_APP_PASSWORD: z.string().optional().default(""),

  // Transamerica credentials (optional in dev, validated in prod for unattended sync)
  TRANSAMERICA_USERNAME: z.string().optional().default(""),
  TRANSAMERICA_PASSWORD: z.string().optional().default(""),
  TRANSAMERICA_EMAIL: z.string().optional().default(""),
  TRANSAMERICA_APP_PASSWORD: z.string().optional().default(""),
  TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY: z.string().optional().default(""),
  TRANSAMERICA_SECURITY_Q_PET_NAME: z.string().optional().default(""),

  // Enable legacy GET method for cron endpoints (deprecated, use POST)
  ENABLE_CRON_GET_SECRET: z
    .string()
    .optional()
    .transform((v) => (v ? ["1", "true", "yes", "on"].includes(v.toLowerCase()) : false)),

  // Enable portal sync - when true, portal credentials are required in production
  ENABLE_PORTAL_SYNC: z
    .string()
    .optional()
    .transform((v) => (v ? ["1", "true", "yes", "on"].includes(v.toLowerCase()) : true)), // Default to true
});

// Production refinement - enforce additional requirements
export const envSchema = baseSchema.superRefine((env, ctx) => {
  // In production, critical security variables must be set
  if (env.NODE_ENV === "production") {
    // JWT_SECRET must be present in production
    // Note: System-provided JWT_SECRET may be shorter but is still secure
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET must be at least 16 characters in production",
        path: ["JWT_SECRET"],
      });
    }

    // ENCRYPTION_KEY is required for credential storage
    if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ENCRYPTION_KEY is required in production and must be at least 32 characters",
        path: ["ENCRYPTION_KEY"],
      });
    }

    // SYNC_SECRET is required for cron endpoint authentication
    if (!env.SYNC_SECRET || env.SYNC_SECRET.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SYNC_SECRET is required in production and must be at least 16 characters",
        path: ["SYNC_SECRET"],
      });
    }

    // When ENABLE_PORTAL_SYNC is true (default), require portal credentials for unattended automation
    if (env.ENABLE_PORTAL_SYNC) {
      // Transamerica credentials are required for unattended sync
      const requiredTransamericaCreds = [
        ["TRANSAMERICA_USERNAME", env.TRANSAMERICA_USERNAME],
        ["TRANSAMERICA_PASSWORD", env.TRANSAMERICA_PASSWORD],
      ] as const;

      for (const [key, value] of requiredTransamericaCreds) {
        if (!value || value === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required in production for unattended sync (set ENABLE_PORTAL_SYNC=false to disable)`,
            path: [key],
          });
        }
      }

      // Transamerica security answer - at least one is required
      if (
        (!env.TRANSAMERICA_SECURITY_Q_PET_NAME || env.TRANSAMERICA_SECURITY_Q_PET_NAME === "") &&
        (!env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY === "")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one Transamerica security answer is required for unattended sync",
          path: ["TRANSAMERICA_SECURITY_Q_PET_NAME"],
        });
      }

      // MyWFG credentials check (warning only - MyWFG sync is less critical)
      if (!env.MYWFG_USERNAME || !env.MYWFG_PASSWORD) {
        console.warn(
          "[ENV] Warning: MyWFG credentials not configured. MyWFG sync will be skipped."
        );
      }
    } else {
      console.warn(
        "[ENV] Warning: ENABLE_PORTAL_SYNC=false - portal credentials not validated. " +
        "Unattended sync will not work."
      );
    }
  }
});

export type EnvConfig = z.infer<typeof baseSchema>;

/**
 * Validate and parse environment variables.
 * Throws descriptive errors if required variables are missing.
 * In production, exits the process on validation failure.
 */
export function validateEnv(): EnvConfig {
  const isProduction = process.env.NODE_ENV === "production";
  
  try {
    const result = envSchema.parse(process.env);
    console.log(`[ENV] Environment validated successfully (${result.NODE_ENV} mode)`);
    return result as EnvConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      
      console.error(`\n❌ Environment validation failed:\n${issues}\n`);
      
      if (isProduction) {
        console.error("FATAL: Cannot start in production with invalid environment configuration.");
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

/**
 * Check if SYNC_SECRET is configured for cron authentication.
 */
export function hasSyncSecret(): boolean {
  return !!(process.env.SYNC_SECRET && process.env.SYNC_SECRET.length >= 16);
}
