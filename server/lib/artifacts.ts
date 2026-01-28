/**
 * Artifact Capture Utility
 * 
 * Captures screenshots, HTML dumps, and error logs when sync jobs fail.
 * Artifacts are stored locally and can be referenced for debugging.
 */

import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");

/**
 * Capture artifacts on job failure.
 * Returns the path to the artifacts directory.
 */
export async function captureArtifacts(opts: {
  job: string;
  page?: Page;
  error?: unknown;
  additionalData?: Record<string, unknown>;
}): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(ARTIFACTS_DIR, opts.job, ts);
  
  try {
    fs.mkdirSync(base, { recursive: true });
  } catch (err) {
    console.error("[Artifacts] Failed to create directory:", err);
    return base;
  }

  // Save error details
  const errorText = opts.error instanceof Error 
    ? `${opts.error.name}: ${opts.error.message}\n\nStack:\n${opts.error.stack ?? "No stack trace"}`
    : String(opts.error ?? "Unknown error");
  
  try {
    fs.writeFileSync(path.join(base, "error.txt"), errorText);
  } catch (err) {
    console.error("[Artifacts] Failed to write error.txt:", err);
  }

  // Capture page screenshot if available
  if (opts.page) {
    try {
      await opts.page.screenshot({ 
        path: path.join(base, "page.png"), 
        fullPage: true,
        timeout: 10000,
      });
    } catch (err) {
      console.error("[Artifacts] Failed to capture screenshot:", err);
    }

    // Capture page HTML
    try {
      const html = await opts.page.content();
      fs.writeFileSync(path.join(base, "page.html"), html);
    } catch (err) {
      console.error("[Artifacts] Failed to capture HTML:", err);
    }

    // Capture page URL
    try {
      const url = opts.page.url();
      fs.writeFileSync(path.join(base, "url.txt"), url);
    } catch (err) {
      console.error("[Artifacts] Failed to capture URL:", err);
    }
  }

  // Save additional data as JSON
  if (opts.additionalData) {
    try {
      fs.writeFileSync(
        path.join(base, "context.json"),
        JSON.stringify(opts.additionalData, null, 2)
      );
    } catch (err) {
      console.error("[Artifacts] Failed to write context.json:", err);
    }
  }

  // Save timestamp and job info
  try {
    fs.writeFileSync(
      path.join(base, "metadata.json"),
      JSON.stringify({
        job: opts.job,
        timestamp: new Date().toISOString(),
        hasPage: !!opts.page,
        hasError: !!opts.error,
      }, null, 2)
    );
  } catch (err) {
    console.error("[Artifacts] Failed to write metadata.json:", err);
  }

  console.log(`[Artifacts] Captured to: ${base}`);
  return base;
}

/**
 * Clean up old artifacts older than the specified days.
 */
export async function cleanupOldArtifacts(maxAgeDays: number = 7): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  try {
    if (!fs.existsSync(ARTIFACTS_DIR)) {
      return 0;
    }

    const jobs = fs.readdirSync(ARTIFACTS_DIR);
    
    for (const job of jobs) {
      const jobDir = path.join(ARTIFACTS_DIR, job);
      if (!fs.statSync(jobDir).isDirectory()) continue;

      const runs = fs.readdirSync(jobDir);
      
      for (const run of runs) {
        const runDir = path.join(jobDir, run);
        const stat = fs.statSync(runDir);
        
        if (stat.isDirectory() && stat.mtimeMs < cutoff) {
          fs.rmSync(runDir, { recursive: true, force: true });
          deletedCount++;
        }
      }
    }
  } catch (err) {
    console.error("[Artifacts] Cleanup failed:", err);
  }

  return deletedCount;
}

/**
 * List recent artifacts for a job.
 */
export function listArtifacts(job: string, limit: number = 10): string[] {
  const jobDir = path.join(ARTIFACTS_DIR, job);
  
  try {
    if (!fs.existsSync(jobDir)) {
      return [];
    }

    const runs = fs.readdirSync(jobDir)
      .map((name) => ({
        name,
        mtime: fs.statSync(path.join(jobDir, name)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map((r) => r.name);

    return runs;
  } catch (err) {
    console.error("[Artifacts] Failed to list artifacts:", err);
    return [];
  }
}
