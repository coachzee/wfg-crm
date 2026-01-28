/**
 * Job Locking Utility
 * 
 * Prevents overlapping sync runs by using database-based locking.
 * Supports heartbeat to extend locks during long-running jobs.
 */

import { eq, lt, and, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { jobLocks } from "../../drizzle/schema";
import crypto from "crypto";

const DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Attempt to acquire a lock for a job.
 * Returns the lock owner ID if successful, null if lock is held by another process.
 */
export async function acquireLock(
  lockName: string,
  durationMs: number = DEFAULT_LOCK_DURATION_MS
): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.error("[JobLock] Database not available");
    return null;
  }
  const ownerId = crypto.randomUUID();
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + durationMs);

  try {
    // Try to insert new lock or update expired lock
    const existingLock = await db
      .select()
      .from(jobLocks)
      .where(eq(jobLocks.name, lockName))
      .limit(1);

    if (existingLock.length === 0) {
      // No lock exists, create one
      await db.insert(jobLocks).values({
        name: lockName,
        ownerId,
        lockedAt: now,
        lockedUntil,
        heartbeatAt: now,
      });
      return ownerId;
    }

    const lock = existingLock[0];
    
    // Check if lock is expired
    if (lock.lockedUntil < now) {
      // Lock is expired, take it over
      await db
        .update(jobLocks)
        .set({
          ownerId,
          lockedAt: now,
          lockedUntil,
          heartbeatAt: now,
        })
        .where(
          and(
            eq(jobLocks.name, lockName),
            lt(jobLocks.lockedUntil, now)
          )
        );
      
      // Verify we got the lock
      const updated = await db
        .select()
        .from(jobLocks)
        .where(eq(jobLocks.name, lockName))
        .limit(1);
      
      if (updated.length > 0 && updated[0].ownerId === ownerId) {
        return ownerId;
      }
    }

    // Lock is held by another process
    console.log(`[JobLock] Lock "${lockName}" is held by ${lock.ownerId} until ${lock.lockedUntil}`);
    return null;
  } catch (error) {
    console.error(`[JobLock] Error acquiring lock "${lockName}":`, error);
    return null;
  }
}

/**
 * Release a lock.
 */
export async function releaseLock(lockName: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  
  try {
    const result = await db
      .delete(jobLocks)
      .where(
        and(
          eq(jobLocks.name, lockName),
          eq(jobLocks.ownerId, ownerId)
        )
      );
    
    return true;
  } catch (error) {
    console.error(`[JobLock] Error releasing lock "${lockName}":`, error);
    return false;
  }
}

/**
 * Extend a lock's duration (heartbeat).
 */
export async function extendLock(
  lockName: string,
  ownerId: string,
  durationMs: number = DEFAULT_LOCK_DURATION_MS
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + durationMs);

  try {
    await db
      .update(jobLocks)
      .set({
        lockedUntil,
        heartbeatAt: now,
      })
      .where(
        and(
          eq(jobLocks.name, lockName),
          eq(jobLocks.ownerId, ownerId)
        )
      );
    
    return true;
  } catch (error) {
    console.error(`[JobLock] Error extending lock "${lockName}":`, error);
    return false;
  }
}

/**
 * Execute a function with a lock, automatically handling acquisition and release.
 * Returns null if lock cannot be acquired.
 */
export async function withJobLock<T>(
  lockName: string,
  durationMs: number,
  fn: () => Promise<T>
): Promise<{ success: true; result: T } | { success: false; reason: "locked" | "error"; error?: unknown }> {
  const ownerId = await acquireLock(lockName, durationMs);
  
  if (!ownerId) {
    return { success: false, reason: "locked" };
  }

  // Set up heartbeat interval
  const heartbeatInterval = setInterval(() => {
    extendLock(lockName, ownerId, durationMs).catch((err) => {
      console.error(`[JobLock] Heartbeat failed for "${lockName}":`, err);
    });
  }, HEARTBEAT_INTERVAL_MS);

  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    return { success: false, reason: "error", error };
  } finally {
    clearInterval(heartbeatInterval);
    await releaseLock(lockName, ownerId);
  }
}

/**
 * Check if a lock is currently held.
 */
export async function isLocked(lockName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[JobLock] Database not available");
    return false;
  }

  try {
    const locks = await db
      .select()
      .from(jobLocks)
      .where(
        and(
          eq(jobLocks.name, lockName),
          lt(sql`NOW()`, jobLocks.lockedUntil)
        )
      )
      .limit(1);
    
    return locks.length > 0;
  } catch (error) {
    console.error(`[JobLock] Error checking lock "${lockName}":`, error);
    return false;
  }
}

/**
 * Get information about a lock.
 */
export async function getLockInfo(lockName: string): Promise<{
  isLocked: boolean;
  ownerId?: string;
  lockedAt?: Date;
  lockedUntil?: Date;
  heartbeatAt?: Date;
} | null> {
  const db = await getDb();
  if (!db) {
    console.error("[JobLock] Database not available");
    return null;
  }

  try {
    const locks = await db
      .select()
      .from(jobLocks)
      .where(eq(jobLocks.name, lockName))
      .limit(1);
    
    if (locks.length === 0) {
      return { isLocked: false };
    }

    const lock = locks[0];
    const now = new Date();
    
    return {
      isLocked: lock.lockedUntil > now,
      ownerId: lock.ownerId,
      lockedAt: lock.lockedAt,
      lockedUntil: lock.lockedUntil,
      heartbeatAt: lock.heartbeatAt,
    };
  } catch (error) {
    console.error(`[JobLock] Error getting lock info for "${lockName}":`, error);
    return null;
  }
}
