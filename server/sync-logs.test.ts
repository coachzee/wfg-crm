import { describe, it, expect, afterAll } from 'vitest';
import { getDb, createScheduledSyncLog, updateScheduledSyncLog, getWeeklySyncSummary } from './db';
import { syncLogs } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Sync Logs', () => {
  let testSyncLogId: number;
  const testSyncIds: number[] = [];
  
  afterAll(async () => {
    // Clean up test data after tests
    const db = await getDb();
    for (const id of testSyncIds) {
      await db.delete(syncLogs).where(eq(syncLogs.id, id));
    }
  });
  
  describe('createScheduledSyncLog', () => {
    it('should create a new sync log entry', async () => {
      const syncLog = await createScheduledSyncLog({
        syncType: 'FULL_SYNC',
        scheduledTime: '3:30 PM',
        status: 'RUNNING',
        startedAt: new Date(),
      });
      
      expect(syncLog).toBeDefined();
      expect(syncLog.id).toBeDefined();
      expect(syncLog.syncType).toBe('FULL_SYNC');
      expect(syncLog.scheduledTime).toBe('3:30 PM');
      expect(syncLog.status).toBe('RUNNING');
      
      testSyncLogId = syncLog.id;
      testSyncIds.push(syncLog.id);
    });
    
    it('should create sync log with default values', async () => {
      const syncLog = await createScheduledSyncLog({
        syncType: 'CONTACT_INFO',
        scheduledTime: '6:30 PM',
        status: 'RUNNING',
        startedAt: new Date(),
      });
      
      expect(syncLog.agentsProcessed).toBe(0);
      expect(syncLog.agentsUpdated).toBe(0);
      expect(syncLog.contactsUpdated).toBe(0);
      expect(syncLog.errorsCount).toBe(0);
      
      testSyncIds.push(syncLog.id);
    });
  });
  
  describe('updateScheduledSyncLog', () => {
    it('should update an existing sync log entry', async () => {
      await updateScheduledSyncLog(testSyncLogId, {
        status: 'SUCCESS',
        agentsProcessed: 50,
        agentsUpdated: 45,
        contactsUpdated: 40,
        errorsCount: 2,
        errorMessages: ['Error 1', 'Error 2'],
        summary: 'Test sync completed successfully',
      });
      
      const db = await getDb();
      const [updated] = await db.select().from(syncLogs).where(eq(syncLogs.id, testSyncLogId));
      
      expect(updated.status).toBe('SUCCESS');
      // durationSeconds is calculated automatically from startedAt to completedAt
      expect(typeof updated.durationSeconds).toBe('number');
      expect(updated.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(updated.agentsProcessed).toBe(50);
      expect(updated.agentsUpdated).toBe(45);
      expect(updated.contactsUpdated).toBe(40);
      expect(updated.errorsCount).toBe(2);
      expect(updated.summary).toBe('Test sync completed successfully');
    });
    
    it('should update status to FAILED on error', async () => {
      const syncLog = await createScheduledSyncLog({
        syncType: 'DOWNLINE_STATUS',
        scheduledTime: '3:30 PM',
        status: 'RUNNING',
        startedAt: new Date(),
      });
      
      testSyncIds.push(syncLog.id);
      
      await updateScheduledSyncLog(syncLog.id, {
        status: 'FAILED',
        errorsCount: 1,
        errorMessages: ['Connection timeout'],
        summary: 'Sync failed due to connection timeout',
      });
      
      const db = await getDb();
      const [updated] = await db.select().from(syncLogs).where(eq(syncLogs.id, syncLog.id));
      
      expect(updated.status).toBe('FAILED');
      expect(updated.errorsCount).toBe(1);
    });
  });
  

  
  describe('getWeeklySyncSummary', () => {
    it('should return weekly summary statistics', async () => {
      const summary = await getWeeklySyncSummary();
      
      expect(summary).toBeDefined();
      expect(typeof summary.totalSyncs).toBe('number');
      expect(typeof summary.successfulSyncs).toBe('number');
      expect(typeof summary.failedSyncs).toBe('number');
      expect(typeof summary.totalAgentsProcessed).toBe('number');
      expect(typeof summary.totalContactsUpdated).toBe('number');
      expect(typeof summary.totalErrors).toBe('number');
    });
    
    it('should return syncs by time breakdown', async () => {
      const summary = await getWeeklySyncSummary();
      
      expect(summary.syncsByTime).toBeInstanceOf(Array);
      // Should have entries for 3:30 PM and 6:30 PM syncs
      if (summary.syncsByTime.length > 0) {
        expect(summary.syncsByTime[0]).toHaveProperty('time');
        expect(summary.syncsByTime[0]).toHaveProperty('success');
        expect(summary.syncsByTime[0]).toHaveProperty('failed');
      }
    });
  });
});
