/**
 * Cron Authentication Utility
 * 
 * Provides secure authentication for cron endpoints.
 * Prefers POST with header secret, logs warnings for GET with query secret.
 */

import type { Request, Response, NextFunction } from "express";
import { ENV } from "../_core/env";
import { getEnv } from "../_core/env.schema";

const SYNC_SECRET_HEADER = "x-sync-secret";
const SYNC_SECRET_QUERY = "secret";

/**
 * Validate cron secret from request.
 * Throws if secret is missing or invalid.
 */
export function requireCronSecret(req: Request): void {
  const syncSecret = getEnv("SYNC_SECRET");
  
  if (!syncSecret || syncSecret.trim() === "") {
    throw Object.assign(
      new Error("SYNC_SECRET environment variable not configured"),
      { statusCode: 500 }
    );
  }

  // Check header first (preferred)
  const headerSecret = req.header(SYNC_SECRET_HEADER);
  if (headerSecret === syncSecret) {
    return; // Valid header secret
  }

  // Check query parameter (deprecated).
  // In production, disallow query-string secrets unless explicitly enabled to avoid leakage in logs/metrics.
  const querySecret = req.query[SYNC_SECRET_QUERY] as string | undefined;
  if (querySecret === syncSecret) {
    if (ENV.isProduction && !ENV.enableCronGetSecret) {
      throw Object.assign(
        new Error("Query-string cron secret is disabled in production. Use POST with x-sync-secret header."),
        { statusCode: 401 }
      );
    }

    // Log warning about deprecated method, but scrub the secret
    console.warn(
      `[Cron Auth] DEPRECATED: Using query parameter for sync secret. ` +
      `Request ID: ${(req as any).requestId ?? "unknown"}. ` +
      `Please migrate to POST with x-sync-secret header.`
    );
    return; // Valid but deprecated
  }

  // No valid secret found
  throw Object.assign(
    new Error("Invalid or missing sync secret"),
    { statusCode: 401 }
  );
}

/**
 * Express middleware for cron authentication.
 * Use this to protect cron endpoints.
 */
export function cronAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    requireCronSecret(req);
    next();
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Authentication failed";
    res.status(statusCode).json({ 
      success: false, 
      error: message 
    });
  }
}

/**
 * Check if request is authenticated for cron operations.
 * Returns true if valid, false otherwise (does not throw).
 */
export function isCronAuthenticated(req: Request): boolean {
  try {
    requireCronSecret(req);
    return true;
  } catch {
    return false;
  }
}
