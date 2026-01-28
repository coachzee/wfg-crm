import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { requestCorrelationMiddleware, logger } from "./logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Request correlation middleware - adds request ID to all requests
  app.use(requestCorrelationMiddleware());
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const requestId = (req as any).requestId;
      logger.info(`${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });
  // Health check endpoints for container orchestration and monitoring
  const { healthz, readyz, healthDetailed } = await import('../lib/health');
  
  // Liveness probe - indicates the server is running
  app.get("/healthz", healthz);
  app.get("/api/healthz", healthz);
  
  // Readiness probe - indicates the server can handle traffic
  app.get("/readyz", readyz);
  app.get("/api/readyz", readyz);
  
  // Detailed health check for debugging
  app.get("/api/health", healthDetailed);
  app.get("/api/health/detailed", healthDetailed);

  // Sync monitoring endpoint - checks sync health and returns status
  app.get("/api/monitoring/sync", async (req, res) => {
    try {
      const { getMonitoringReport } = await import('../lib/monitoring');
      const report = await getMonitoringReport();
      const statusCode = report.overall.isHealthy ? 200 : 503;
      res.status(statusCode).json(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Start the scheduler for background tasks
  const { startScheduler } = await import('../scheduler');
  startScheduler();

  // Cron-triggered sync endpoint for Hostinger/self-hosted deployments
  // This endpoint can be called by external cron jobs to trigger data sync
  // Requires SYNC_SECRET environment variable for authentication
  // Uses job locking to prevent overlapping runs and records sync history
  app.post("/api/cron/sync", async (req, res) => {
    try {
      // Verify the sync secret using cronAuth utility
      const { requireCronSecret } = await import('../lib/cronAuth');
      requireCronSecret(req);
      
      console.log('[Cron Sync] Starting scheduled sync with job locking...');
      
      // Use the fullsync job which handles locking and run history
      const { executeFullSync } = await import('../jobs/fullsync');
      const result = await executeFullSync('cron-post');
      
      if (result.success) {
        res.status(200).json({
          success: true,
          timestamp: new Date().toISOString(),
          runId: result.runId,
          metrics: result.metrics,
        });
      } else {
        // Job was locked or failed
        const statusCode = result.error === 'Job is already running' ? 409 : 500;
        res.status(statusCode).json({
          success: false,
          timestamp: new Date().toISOString(),
          runId: result.runId,
          error: result.error,
        });
      }
    } catch (error: any) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Cron Sync] Error:', errorMessage);
      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cron endpoint for Transamerica alerts sync (with job locking)
  app.get("/api/cron/transamerica-alerts", async (req, res) => {
    try {
      const { requireCronSecret } = await import('../lib/cronAuth');
      requireCronSecret(req);
      
      console.log('[Cron] Starting Transamerica alerts sync with job locking...');
      
      // Use job locking for Transamerica alerts
      const { withJobLock } = await import('../lib/jobLock');
      const { syncTransamericaAlerts } = await import('../scheduler');
      
      const lockResult = await withJobLock('transamerica-alerts', 20 * 60 * 1000, async () => {
        return await syncTransamericaAlerts();
      });
      
      if (lockResult.success) {
        const result = lockResult.result;
        res.status(200).json({
          success: result.success,
          timestamp: new Date().toISOString(),
          alertsCount: result.alertsCount,
          newAlertsDetected: result.newAlertsDetected,
          notificationSent: result.notificationSent,
          error: result.error,
        });
      } else if (lockResult.reason === 'locked') {
        res.status(409).json({
          success: false,
          error: 'Transamerica alerts sync is already running',
          timestamp: new Date().toISOString(),
        });
      } else {
        throw lockResult.error;
      }
    } catch (error: any) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(statusCode).json({ success: false, error: errorMessage });
    }
  });

  // GET endpoint for simpler cron job configuration (some hosts only support GET)
  // DEPRECATED: Use POST /api/cron/sync with x-sync-secret header instead
  app.get("/api/cron/sync", async (req, res) => {
    try {
      const { requireCronSecret } = await import('../lib/cronAuth');
      requireCronSecret(req);
      
      console.warn('[Cron Sync GET] DEPRECATED: Use POST /api/cron/sync with x-sync-secret header');
      console.log('[Cron Sync GET] Starting scheduled sync with job locking...');
      
      // Use the fullsync job which handles locking and run history
      const { executeFullSync } = await import('../jobs/fullsync');
      const result = await executeFullSync('cron-get');
      
      if (result.success) {
        res.status(200).json({
          success: true,
          timestamp: new Date().toISOString(),
          runId: result.runId,
          metrics: result.metrics,
          deprecated: 'Use POST /api/cron/sync with x-sync-secret header',
        });
      } else {
        const statusCode = result.error === 'Job is already running' ? 409 : 500;
        res.status(statusCode).json({
          success: false,
          timestamp: new Date().toISOString(),
          runId: result.runId,
          error: result.error,
        });
      }
    } catch (error: any) {
      const statusCode = error.statusCode ?? 500;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(statusCode).json({ success: false, error: errorMessage });
    }
  });

  // Email tracking endpoints for open/click tracking
  // Tracking pixel endpoint - records email opens
  app.get("/api/track/open/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
      
      // Import and record the open event
      const { recordEmailOpen } = await import('../email-tracking');
      await recordEmailOpen(trackingId, userAgent, ipAddress);
      
      // Return a 1x1 transparent GIF
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.send(pixel);
    } catch (error) {
      // Still return the pixel even if tracking fails
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    }
  });

  // Click tracking endpoint - records link clicks and redirects
  // SECURITY: Only allows redirects to validated URLs stored server-side or allowlisted domains
  app.get("/api/track/click/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { url } = req.query;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
      
      // Import and record the click event, get validated redirect URL
      const { recordEmailClick, getValidatedRedirectUrl } = await import('../email-tracking');
      
      // Get the validated redirect URL from server-side storage or validate against allowlist
      const validatedUrl = await getValidatedRedirectUrl(trackingId, url as string | undefined);
      
      if (!validatedUrl) {
        console.warn(`[Click Tracking] Invalid or missing redirect URL for tracking ID: ${trackingId}`);
        res.status(400).send('Invalid or missing redirect URL');
        return;
      }
      
      // Record the click event
      await recordEmailClick(trackingId, validatedUrl, userAgent, ipAddress);
      
      // Redirect to the validated URL
      res.redirect(302, validatedUrl);
    } catch (error) {
      console.error('[Click Tracking] Error:', error);
      res.status(400).send('Invalid tracking request');
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
