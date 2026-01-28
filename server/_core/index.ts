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
  app.use(requestCorrelationMiddleware);
  
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

  // Start the scheduler for background tasks
  const { startScheduler } = await import('../scheduler');
  startScheduler();

  // Cron-triggered sync endpoint for Hostinger/self-hosted deployments
  // This endpoint can be called by external cron jobs to trigger data sync
  // Requires SYNC_SECRET environment variable for authentication
  app.post("/api/cron/sync", async (req, res) => {
    try {
      // Verify the sync secret
      const syncSecret = process.env.SYNC_SECRET;
      const providedSecret = req.headers['x-sync-secret'] || req.query.secret;
      
      if (!syncSecret) {
        console.log('[Cron Sync] SYNC_SECRET not configured');
        return res.status(500).json({ 
          success: false, 
          error: 'SYNC_SECRET environment variable not configured' 
        });
      }
      
      if (providedSecret !== syncSecret) {
        console.log('[Cron Sync] Invalid sync secret provided');
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid sync secret' 
        });
      }
      
      console.log('[Cron Sync] Starting scheduled sync...');
      
      // Import and run the sync service
      const { runFullSync } = await import('../sync-service');
      const results = await runFullSync();
      
      // Process scheduled emails
      console.log('[Cron Sync] Processing scheduled emails...');
      const { processScheduledEmails } = await import('../email-tracking');
      const emailResults = await processScheduledEmails();
      console.log(`[Cron Sync] Scheduled emails processed: ${emailResults.processed} (${emailResults.succeeded} succeeded, ${emailResults.failed} failed)`);
      
      // Sync agent licensing status from MyWFG
      console.log('[Cron Sync] Syncing agent licensing status...');
      let licensingSyncResult: { success: boolean; updated: number; error?: string } = { success: false, updated: 0 };
      try {
        const { syncAgentLicensingStatus } = await import('../agent-licensing-sync');
        licensingSyncResult = await syncAgentLicensingStatus();
        console.log(`[Cron Sync] Licensing sync: ${licensingSyncResult.updated} agents updated`);
      } catch (err) {
        licensingSyncResult.error = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Cron Sync] Licensing sync error:', licensingSyncResult.error);
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`[Cron Sync] Completed - Success: ${successCount}, Failed: ${failureCount}`);
      
      res.status(200).json({
        success: failureCount === 0,
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          platform: r.platform,
          success: r.success,
          error: r.error,
          data: r.data
        })),
        scheduledEmails: emailResults
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Cron Sync] Error:', errorMessage);
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cron endpoint for Transamerica alerts sync
  app.get("/api/cron/transamerica-alerts", async (req, res) => {
    try {
      const syncSecret = process.env.SYNC_SECRET;
      const providedSecret = req.query.secret;
      
      if (!syncSecret || providedSecret !== syncSecret) {
        return res.status(401).json({ success: false, error: 'Invalid sync secret' });
      }
      
      console.log('[Cron] Starting Transamerica alerts sync...');
      
      const { syncTransamericaAlerts } = await import('../scheduler');
      const result = await syncTransamericaAlerts();
      
      res.status(200).json({
        success: result.success,
        timestamp: new Date().toISOString(),
        alertsCount: result.alertsCount,
        newAlertsDetected: result.newAlertsDetected,
        notificationSent: result.notificationSent,
        error: result.error,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // GET endpoint for simpler cron job configuration (some hosts only support GET)
  app.get("/api/cron/sync", async (req, res) => {
    try {
      const syncSecret = process.env.SYNC_SECRET;
      const providedSecret = req.query.secret;
      
      if (!syncSecret || providedSecret !== syncSecret) {
        return res.status(401).json({ success: false, error: 'Invalid sync secret' });
      }
      
      console.log('[Cron Sync GET] Starting scheduled sync...');
      
      const { runFullSync } = await import('../sync-service');
      const results = await runFullSync();
      
      // Process scheduled emails
      console.log('[Cron Sync GET] Processing scheduled emails...');
      const { processScheduledEmails } = await import('../email-tracking');
      const emailResults = await processScheduledEmails();
      console.log(`[Cron Sync GET] Scheduled emails processed: ${emailResults.processed} (${emailResults.succeeded} succeeded, ${emailResults.failed} failed)`);
      
      res.status(200).json({
        success: results.every(r => r.success),
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          platform: r.platform,
          success: r.success,
          error: r.error
        })),
        scheduledEmails: emailResults
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: errorMessage });
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
