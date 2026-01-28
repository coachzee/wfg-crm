/**
 * Request ID Middleware
 * 
 * Adds a unique request ID to each incoming request for tracing and debugging.
 * The ID is available in req.requestId and is included in response headers.
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Middleware that adds a unique request ID to each request.
 * If the client provides an x-request-id header, it will be used.
 * Otherwise, a new UUID is generated.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const existingId = req.header(REQUEST_ID_HEADER);
  const requestId = existingId && isValidRequestId(existingId) 
    ? existingId 
    : generateRequestId();

  // Attach to request object
  req.requestId = requestId;

  // Include in response headers
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

/**
 * Generate a short, unique request ID.
 * Format: timestamp-random (e.g., "1706456789-a1b2c3d4")
 */
function generateRequestId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}

/**
 * Validate that a request ID is safe to use.
 * Prevents injection attacks via malicious header values.
 */
function isValidRequestId(id: string): boolean {
  // Allow alphanumeric, dashes, and underscores, max 64 chars
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

/**
 * Get the current request ID from the request object.
 * Returns "unknown" if not available.
 */
export function getRequestId(req: Request): string {
  return req.requestId ?? "unknown";
}
