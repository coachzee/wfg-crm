/**
 * MyWFG Router Module
 * 
 * Handles MyWFG sync operations including:
 * - Downline status sync
 * - Exam prep sync from XCEL emails
 * - Contact info sync
 * - Manual sync triggers
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { 
  getLatestSyncLog, 
  getCredentialsByUserId,
} from "../db";
import { syncExamPrepFromEmail, getExamPrepRecords } from '../xcel-exam-scraper';

export const mywfgRouter = router({
  getLatestSync: protectedProcedure.query(async () => {
    return getLatestSyncLog();
  }),

  testSync: protectedProcedure.input(
    z.object({
      validationCode: z.string().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { myWFGServiceV3 } = await import("../mywfg-service-v3");
    const creds = await getCredentialsByUserId(ctx.user.id);
    
    if (!creds) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials configured" });
    }

    try {
      const result = await myWFGServiceV3.extractData(
        creds.encryptedUsername,
        creds.encryptedPassword,
        input.validationCode
      );
      return {
        success: result.success,
        agentsExtracted: result.agentsExtracted,
        productionRecordsExtracted: result.productionRecordsExtracted,
        error: result.error,
        requiresValidation: result.requiresValidation,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Test sync failed" });
    }
  }),

  manualSync: protectedProcedure.input(
    z.object({
      validationCode: z.string().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { runMyWFGSync } = await import("../mywfg-sync-job");
    return runMyWFGSync(ctx.user.id, input.validationCode);
  }),

  // Self-deploy: git pull + pnpm install + pnpm build + pm2 restart
  // Allows updating the production server to the latest code without SSH access
  selfDeploy: protectedProcedure.mutation(async () => {
    const { execSync } = await import('child_process');
    const appDir = process.cwd();
    console.log('[SelfDeploy] Starting self-deploy from', appDir);
    try {
      const pull = execSync('git pull origin main 2>&1', { cwd: appDir, timeout: 60000 }).toString();
      console.log('[SelfDeploy] git pull:', pull.trim());
      execSync('pnpm install --frozen-lockfile 2>&1', { cwd: appDir, timeout: 300000 });
      console.log('[SelfDeploy] pnpm install done');
      execSync('pnpm build 2>&1', { cwd: appDir, timeout: 300000 });
      console.log('[SelfDeploy] pnpm build done');
      setImmediate(() => {
        try { execSync('pm2 restart wfgcrm 2>&1 || pm2 restart all 2>&1', { timeout: 30000 }); } catch {}
      });
      return { success: true, message: 'Self-deploy complete, restarting...', pull: pull.trim() };
    } catch (err: any) {
      return { success: false, message: err.message || 'Self-deploy failed' };
    }
  }),

  // Sync agents from MyWFG Downline Status report
  syncDownlineStatus: protectedProcedure.mutation(async () => {
    const { fetchDownlineStatus, syncAgentsFromDownlineStatus } = await import("../mywfg-downline-scraper");
    const { getDb } = await import("../db");
    const schema = await import("../../drizzle/schema");

    // Pre-install Chrome if missing (fixes 'Could not find Chrome' on production)
    try {
      const { execSync } = await import('child_process');
      const { existsSync, readdirSync } = await import('fs');
      const { resolve } = await import('path');
      const { homedir } = await import('os');
      const findChrome = () => {
        for (const base of [resolve(homedir(), '.cache/puppeteer/chrome'), '/root/.cache/puppeteer/chrome']) {
          if (existsSync(base)) {
            try {
              const vers = readdirSync(base).sort().reverse();
              for (const v of vers) {
                const bin = resolve(base, v, 'chrome-linux64', 'chrome');
                if (existsSync(bin)) return bin;
              }
            } catch {}
          }
        }
        for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable']) {
          if (existsSync(p)) return p;
        }
        return null;
      };
      if (!findChrome()) {
        console.log('[Manual Sync] Chrome not found, installing...');
        const isRoot = process.getuid && process.getuid() === 0;
        const cacheDir = isRoot ? '/root/.cache/puppeteer' : resolve(homedir(), '.cache/puppeteer');
        execSync(`PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`, {
          stdio: 'pipe', timeout: 300000, env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
        });
        console.log('[Manual Sync] Chrome installed to', cacheDir);
      }
    } catch (chromeErr: any) {
      console.warn('[Manual Sync] Chrome pre-install failed (will try anyway):', chromeErr?.message);
    }
    
    console.log("[Manual Sync] Starting Downline Status sync...");
    
    const fetchResult = await fetchDownlineStatus();
    
    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error || "Failed to fetch downline status",
        agentsFetched: 0,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0,
      };
    }
    
    console.log(`[Manual Sync] Fetched ${fetchResult.agents.length} agents from MyWFG`);
    
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsFetched: fetchResult.agents.length,
        agentsAdded: 0,
        agentsUpdated: 0,
        agentsDeactivated: 0,
        agentsReactivated: 0,
      };
    }
    
    const syncResult = await syncAgentsFromDownlineStatus(db, schema);
    
    console.log(`[Manual Sync] Sync completed - Added: ${syncResult.added}, Updated: ${syncResult.updated}, Deactivated: ${syncResult.deactivated}, Reactivated: ${syncResult.reactivated}`);
    
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsFetched: fetchResult.agents.length,
      agentsAdded: syncResult.added,
      agentsUpdated: syncResult.updated,
      agentsDeactivated: syncResult.deactivated,
      agentsReactivated: syncResult.reactivated,
    };
  }),
  
  // Sync exam prep status from XCEL Solutions emails
  syncExamPrep: protectedProcedure.mutation(async () => {
    console.log("[Manual Sync] Starting Exam Prep sync from XCEL emails...");
    
    const result = await syncExamPrepFromEmail();
    
    console.log(`[Manual Sync] Exam Prep sync completed - Found: ${result.recordsFound}, Matched: ${result.recordsMatched}, Created: ${result.recordsCreated}, Updated: ${result.recordsUpdated}`);
    
    return result;
  }),
  
  // Get all exam prep records
  getExamPrepRecords: protectedProcedure.query(async () => {
    return getExamPrepRecords();
  }),
  
  // Trigger git pull + rebuild + restart for production deployments
  triggerDeploy: protectedProcedure.mutation(async () => {
    const { execSync } = await import('child_process');
    const appDir = process.cwd();
    try {
      execSync('git pull origin main', { cwd: appDir, stdio: 'pipe', timeout: 60000 });
      execSync('pnpm install --frozen-lockfile', { cwd: appDir, stdio: 'pipe', timeout: 300000 });
      execSync('pnpm build', { cwd: appDir, stdio: 'pipe', timeout: 300000 });
      setImmediate(() => {
        try { execSync('pm2 restart wfgcrm || pm2 restart all', { stdio: 'pipe', timeout: 30000 }); } catch {}
      });
      return { success: true, message: 'Deploy triggered successfully' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Deploy failed' };
    }
  }),

  // Install Chrome for Puppeteer (fixes 'Could not find Chrome' error on production)
  installChrome: protectedProcedure.mutation(async () => {
    const { execSync } = await import('child_process');
    const { existsSync, readdirSync } = await import('fs');
    const { resolve } = await import('path');
    const { homedir } = await import('os');
    const findChrome = (): string | null => {
      for (const base of [resolve(homedir(), '.cache/puppeteer/chrome'), '/root/.cache/puppeteer/chrome']) {
        if (existsSync(base)) {
          try {
            const vers = readdirSync(base).sort().reverse();
            for (const v of vers) {
              const bin = resolve(base, v, 'chrome-linux64', 'chrome');
              if (existsSync(bin)) return bin;
            }
          } catch {}
        }
      }
      for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable']) {
        if (existsSync(p)) return p;
      }
      return null;
    };
    const existing = findChrome();
    if (existing) {
      return { success: true, message: 'Chrome already installed', chromePath: existing };
    }
    try {
      // Use explicit cache dir for root user in production
      const isRoot = process.getuid && process.getuid() === 0;
      const cacheDir = isRoot ? '/root/.cache/puppeteer' : resolve(homedir(), '.cache/puppeteer');
      execSync(
        `PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`,
        { stdio: 'pipe', timeout: 300000, env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir } }
      );
      const newPath = findChrome();
      return { success: true, message: 'Chrome installed successfully', chromePath: newPath };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to install Chrome', chromePath: null };
    }
  }),

  // Sync contact info for agents with missing data
  syncContactInfo: protectedProcedure.mutation(async () => {
    const { syncContactInfoFromMyWFG } = await import("../mywfg-downline-scraper");
    const { getDb } = await import("../db");
    const schema = await import("../../drizzle/schema");
    
    console.log("[Manual Sync] Starting Contact Info sync...");
    
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
        agentsUpdated: 0,
      };
    }
    
    const syncResult = await syncContactInfoFromMyWFG(db, schema, 15);
    
    console.log(`[Manual Sync] Contact sync completed - Updated: ${syncResult.updated}`);
    
    return {
      success: syncResult.success,
      error: syncResult.error,
      agentsUpdated: syncResult.updated,
    };
  }),
});
