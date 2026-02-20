import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getEnv } from "./env.schema";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Get system configuration (admin only)
  getConfig: adminProcedure.query(() => {
    const syncSecret = getEnv("SYNC_SECRET");
    return {
      syncSecretConfigured: !!syncSecret && syncSecret.trim() !== "",
      syncSecret: syncSecret || null,
      appUrl: process.env.APP_URL || null,
      nodeEnv: process.env.NODE_ENV || "development",
    };
  }),

  // Trigger Chrome installation (admin only)
  installChrome: adminProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const { existsSync, readdirSync } = await import("fs");
    const { resolve } = await import("path");
    const { homedir } = await import("os");

    const findChrome = (): string | null => {
      const cacheDirs = [
        resolve(homedir(), ".cache/puppeteer/chrome"),
        "/root/.cache/puppeteer/chrome",
      ];
      for (const dir of cacheDirs) {
        if (existsSync(dir)) {
          try {
            const versions = readdirSync(dir).sort().reverse();
            for (const ver of versions) {
              const bin = resolve(dir, ver, "chrome-linux64", "chrome");
              if (existsSync(bin)) return bin;
            }
          } catch {}
        }
      }
      for (const p of [
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome-stable",
      ]) {
        if (existsSync(p)) return p;
      }
      return null;
    };

    const existing = findChrome();
    if (existing) {
      return {
        success: true,
        message: "Chrome already installed",
        chromePath: existing,
      };
    }

    try {
      execSync("npx puppeteer browsers install chrome", {
        stdio: "pipe",
        timeout: 300000,
      });
      const newPath = findChrome();
      return {
        success: true,
        message: "Chrome installed successfully",
        chromePath: newPath,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to install Chrome",
        chromePath: null,
      };
    }
  }),

  // Trigger deployment (admin only) - pulls from GitHub and restarts
  triggerDeploy: adminProcedure.mutation(async () => {
    const { execSync } = await import("child_process");
    const appDir = process.cwd();

    try {
      execSync("git pull origin main", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 60000,
      });
      execSync("pnpm install --frozen-lockfile", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 300000,
      });
      execSync("pnpm build", {
        cwd: appDir,
        stdio: "pipe",
        timeout: 300000,
      });
      // Restart in background to allow response to be sent
      setImmediate(() => {
        try {
          execSync("pm2 restart wfgcrm || pm2 restart all", {
            stdio: "pipe",
            timeout: 30000,
          });
        } catch {}
      });
      return {
        success: true,
        message: "Deployment completed. Application is restarting.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Deployment failed",
      };
    }
  }),
});
