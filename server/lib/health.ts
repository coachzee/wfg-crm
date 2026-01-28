/**
 * Health Check Endpoints
 * 
 * Provides /healthz (liveness) and /readyz (readiness) endpoints
 * for container orchestration and monitoring.
 */

import type { Request, Response } from "express";
import { getDb } from "../db";

type HealthStatus = {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, {
    status: "pass" | "fail";
    message?: string;
    latencyMs?: number;
  }>;
};

/**
 * Liveness probe - indicates the server is running.
 * Returns 200 if the process is alive, regardless of dependencies.
 */
export async function healthz(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Readiness probe - indicates the server can handle traffic.
 * Checks database connectivity and other critical dependencies.
 */
export async function readyz(req: Request, res: Response): Promise<void> {
  const checks: HealthStatus["checks"] = {};
  let overallStatus: HealthStatus["status"] = "ok";

  // Check database connectivity
  const dbStart = Date.now();
  try {
    const db = await getDb();
    if (db) {
      // Simple query to verify connection
      await db.execute("SELECT 1");
      checks.database = {
        status: "pass",
        latencyMs: Date.now() - dbStart,
      };
    } else {
      checks.database = {
        status: "fail",
        message: "Database not initialized",
      };
      overallStatus = "unhealthy";
    }
  } catch (err) {
    checks.database = {
      status: "fail",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - dbStart,
    };
    overallStatus = "unhealthy";
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  if (heapPercent > 90) {
    checks.memory = {
      status: "fail",
      message: `Heap usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
    };
    overallStatus = overallStatus === "ok" ? "degraded" : overallStatus;
  } else if (heapPercent > 75) {
    checks.memory = {
      status: "pass",
      message: `Heap usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
    };
    if (overallStatus === "ok") overallStatus = "degraded";
  } else {
    checks.memory = {
      status: "pass",
      message: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
    };
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  };

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;
  res.status(httpStatus).json(response);
}

/**
 * Detailed health check with all system information.
 * Useful for debugging and monitoring dashboards.
 */
export async function healthDetailed(req: Request, res: Response): Promise<void> {
  const checks: HealthStatus["checks"] = {};
  let overallStatus: HealthStatus["status"] = "ok";

  // Database check
  const dbStart = Date.now();
  try {
    const db = await getDb();
    if (db) {
      await db.execute("SELECT 1");
      checks.database = {
        status: "pass",
        latencyMs: Date.now() - dbStart,
      };
    } else {
      checks.database = { status: "fail", message: "Not initialized" };
      overallStatus = "unhealthy";
    }
  } catch (err) {
    checks.database = {
      status: "fail",
      message: err instanceof Error ? err.message : "Unknown error",
    };
    overallStatus = "unhealthy";
  }

  // Memory check
  const mem = process.memoryUsage();
  checks.memory = {
    status: "pass",
    message: JSON.stringify({
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    }),
  };

  res.status(overallStatus === "unhealthy" ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    checks,
  });
}
