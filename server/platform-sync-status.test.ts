import { describe, it, expect, vi } from 'vitest';

// Mock the DB module before importing anything that uses it
vi.mock('./db', () => ({
  getLatestSyncLog: vi.fn(),
  getRecentScheduledSyncLogs: vi.fn(),
}));

import { getLatestSyncLog, getRecentScheduledSyncLogs } from './db';

const mockGetLatestSyncLog = vi.mocked(getLatestSyncLog);
const mockGetRecentScheduledSyncLogs = vi.mocked(getRecentScheduledSyncLogs);

describe('Platform Sync Status - Data Separation Logic', () => {
  it('should correctly identify Transamerica sync logs by prefix', () => {
    const syncTypes = [
      'TRANSAMERICA_ALERTS',
      'TRANSAMERICA_PENDING',
      'TRANSAMERICA_INFORCE',
      'FULL_SYNC',
      'DOWNLINE_STATUS',
      'CONTACT_INFO',
      'CASH_FLOW',
      'PRODUCTION',
    ];

    const transamericaTypes = syncTypes.filter(t => t.startsWith('TRANSAMERICA'));
    const mywfgTypes = syncTypes.filter(t =>
      ['FULL_SYNC', 'DOWNLINE_STATUS', 'CONTACT_INFO', 'CASH_FLOW', 'PRODUCTION'].includes(t)
    );

    expect(transamericaTypes).toEqual([
      'TRANSAMERICA_ALERTS',
      'TRANSAMERICA_PENDING',
      'TRANSAMERICA_INFORCE',
    ]);
    expect(mywfgTypes).toEqual([
      'FULL_SYNC',
      'DOWNLINE_STATUS',
      'CONTACT_INFO',
      'CASH_FLOW',
      'PRODUCTION',
    ]);

    // No overlap
    for (const t of transamericaTypes) {
      expect(mywfgTypes).not.toContain(t);
    }
  });

  it('should compute recent success/failure counts correctly', () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = [
      { syncType: 'TRANSAMERICA_ALERTS', status: 'SUCCESS', createdAt: new Date() },
      { syncType: 'TRANSAMERICA_PENDING', status: 'FAILED', createdAt: new Date() },
      { syncType: 'TRANSAMERICA_INFORCE', status: 'SUCCESS', createdAt: new Date() },
      // Old log - should be excluded
      { syncType: 'TRANSAMERICA_ALERTS', status: 'SUCCESS', createdAt: new Date('2025-01-01') },
    ];

    const transamericaLogs = logs.filter(l => l.syncType?.startsWith('TRANSAMERICA'));
    expect(transamericaLogs.length).toBe(4);

    const recentTA = transamericaLogs.filter(
      l => l.createdAt && new Date(l.createdAt) >= sevenDaysAgo
    );
    expect(recentTA.length).toBe(3);

    const successes = recentTA.filter(l => l.status === 'SUCCESS').length;
    const failures = recentTA.filter(l => l.status === 'FAILED').length;

    expect(successes).toBe(2);
    expect(failures).toBe(1);

    const totalRecent = successes + failures;
    const successRate = totalRecent > 0 ? Math.round((successes / totalRecent) * 100) : null;
    expect(successRate).toBe(67);
  });

  it('should handle empty sync logs gracefully', async () => {
    mockGetLatestSyncLog.mockResolvedValue(null);
    mockGetRecentScheduledSyncLogs.mockResolvedValue([]);

    const latestMywfg = await getLatestSyncLog();
    const recentScheduled = await getRecentScheduledSyncLogs(50);

    const transamericaLogs = (recentScheduled as any[]).filter(
      (l: any) => l.syncType?.startsWith('TRANSAMERICA')
    );
    const latestTransamerica = transamericaLogs[0] || null;

    expect(latestMywfg).toBeNull();
    expect(latestTransamerica).toBeNull();

    // Build the response shape
    const result = {
      mywfg: {
        lastSyncDate: latestMywfg?.syncDate || null,
        lastSyncStatus: latestMywfg?.status || null,
        lastSyncType: latestMywfg?.syncType || null,
        recordsProcessed: latestMywfg?.recordsProcessed || 0,
        summary: latestMywfg?.errorMessage || null,
        recentSuccesses: 0,
        recentFailures: 0,
      },
      transamerica: {
        lastSyncDate: latestTransamerica?.startedAt || null,
        lastSyncStatus: latestTransamerica?.status || null,
        lastSyncType: latestTransamerica?.syncType || null,
        recordsProcessed: latestTransamerica?.agentsProcessed || 0,
        summary: latestTransamerica?.summary || null,
        recentSuccesses: 0,
        recentFailures: 0,
      },
    };

    expect(result.mywfg.lastSyncDate).toBeNull();
    expect(result.mywfg.lastSyncStatus).toBeNull();
    expect(result.mywfg.recordsProcessed).toBe(0);
    expect(result.transamerica.lastSyncDate).toBeNull();
    expect(result.transamerica.lastSyncStatus).toBeNull();
    expect(result.transamerica.recordsProcessed).toBe(0);
  });

  it('should correctly build response from mock data', async () => {
    const mywfgSync = {
      id: 1,
      syncDate: new Date('2026-02-16T22:46:06Z'),
      syncType: 'DOWNLINE_STATUS' as const,
      status: 'SUCCESS' as const,
      recordsProcessed: 51,
      errorMessage: 'Synced 51 agents',
    };

    const scheduledLogs = [
      {
        id: 10,
        syncType: 'TRANSAMERICA_ALERTS',
        status: 'SUCCESS',
        startedAt: new Date('2026-01-28T15:30:00Z'),
        completedAt: new Date('2026-01-28T15:35:00Z'),
        agentsProcessed: 3,
        summary: 'Synced 3 chargebacks, 0 EFT removals',
        createdAt: new Date('2026-01-28T15:30:00Z'),
      },
      {
        id: 9,
        syncType: 'TRANSAMERICA_PENDING',
        status: 'SUCCESS',
        startedAt: new Date('2026-01-28T15:30:00Z'),
        completedAt: new Date('2026-01-28T15:32:00Z'),
        agentsProcessed: 12,
        summary: 'Synced 12 pending policies',
        createdAt: new Date('2026-01-28T15:30:00Z'),
      },
      {
        id: 8,
        syncType: 'DOWNLINE_STATUS',
        status: 'SUCCESS',
        startedAt: new Date('2026-02-16T22:46:06Z'),
        completedAt: new Date('2026-02-16T22:49:00Z'),
        agentsProcessed: 51,
        summary: 'Synced 51 agents',
        createdAt: new Date('2026-02-16T22:46:06Z'),
      },
    ];

    mockGetLatestSyncLog.mockResolvedValue(mywfgSync as any);
    mockGetRecentScheduledSyncLogs.mockResolvedValue(scheduledLogs as any);

    const latestMywfg = await getLatestSyncLog();
    const recentScheduled = await getRecentScheduledSyncLogs(50);

    const transamericaLogs = (recentScheduled as any[]).filter(
      (l: any) => l.syncType?.startsWith('TRANSAMERICA')
    );
    const latestTransamerica = transamericaLogs[0] || null;

    expect(latestMywfg).toBeDefined();
    expect(latestMywfg!.status).toBe('SUCCESS');
    expect(latestMywfg!.recordsProcessed).toBe(51);

    expect(latestTransamerica).toBeDefined();
    expect(latestTransamerica.syncType).toBe('TRANSAMERICA_ALERTS');
    expect(latestTransamerica.status).toBe('SUCCESS');
    expect(latestTransamerica.agentsProcessed).toBe(3);

    // Verify MyWFG scheduled logs don't include Transamerica
    const mywfgScheduledLogs = (recentScheduled as any[]).filter(
      (l: any) => ['FULL_SYNC', 'DOWNLINE_STATUS', 'CONTACT_INFO', 'CASH_FLOW', 'PRODUCTION'].includes(l.syncType)
    );
    expect(mywfgScheduledLogs.length).toBe(1);
    expect(mywfgScheduledLogs[0].syncType).toBe('DOWNLINE_STATUS');
  });
});
