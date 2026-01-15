import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Health check endpoint for uptime monitoring
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: "Wealth Builders Haven CRM"
    });
  });

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
        }))
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
      
      res.status(200).json({
        success: results.every(r => r.success),
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          platform: r.platform,
          success: r.success,
          error: r.error
        }))
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: errorMessage });
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
