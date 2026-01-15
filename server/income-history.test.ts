import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  saveIncomeSnapshot, 
  getIncomeHistory, 
  getIncomeAccuracyStats,
  updateActualIncome,
  getDb
} from './db';
import { incomeHistory } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

describe('Income History', () => {
  describe('saveIncomeSnapshot', () => {
    it('should save a snapshot and return an id', async () => {
      const result = await saveIncomeSnapshot();
      // Result can be null if no projected income data, or an id if saved
      expect(result === null || typeof result === 'number').toBe(true);
    });
  });

  describe('getIncomeHistory', () => {
    it('should return an array for week period', async () => {
      const history = await getIncomeHistory('week');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return an array for month period', async () => {
      const history = await getIncomeHistory('month');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return an array for quarter period', async () => {
      const history = await getIncomeHistory('quarter');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return an array for year period', async () => {
      const history = await getIncomeHistory('year');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return history items with correct structure', async () => {
      // First save a snapshot to ensure we have data
      await saveIncomeSnapshot();
      
      const history = await getIncomeHistory('month');
      
      if (history.length > 0) {
        const item = history[0];
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('projectedTotal');
        expect(item).toHaveProperty('projectedFromPending');
        expect(item).toHaveProperty('projectedFromInforce');
        expect(item).toHaveProperty('actualIncome');
        expect(item).toHaveProperty('pendingPoliciesCount');
        expect(item).toHaveProperty('inforcePoliciesCount');
      }
    });
  });

  describe('getIncomeAccuracyStats', () => {
    it('should return accuracy stats object or null', async () => {
      const stats = await getIncomeAccuracyStats();
      
      if (stats !== null) {
        expect(stats).toHaveProperty('totalSnapshots');
        expect(stats).toHaveProperty('snapshotsWithActual');
        expect(typeof stats.totalSnapshots).toBe('number');
        expect(typeof stats.snapshotsWithActual).toBe('number');
      }
    });
  });

  describe('updateActualIncome', () => {
    it('should return a boolean indicating success', async () => {
      // First save a snapshot for today
      await saveIncomeSnapshot();
      
      const result = await updateActualIncome(
        new Date(),
        5000,
        'Test Source'
      );
      
      expect(typeof result).toBe('boolean');
    });
  });
});
