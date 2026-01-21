import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Exam Prep Feature', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  
  beforeAll(async () => {
    db = await getDb();
  });
  
  describe('Schema', () => {
    it('should have agentExamPrep table defined', () => {
      expect(schema.agentExamPrep).toBeDefined();
    });
    
    it('should have correct columns in agentExamPrep table', () => {
      const columns = Object.keys(schema.agentExamPrep);
      expect(columns).toContain('id');
      expect(columns).toContain('agentId');
      expect(columns).toContain('xcelFirstName');
      expect(columns).toContain('xcelLastName');
      expect(columns).toContain('course');
      expect(columns).toContain('state');
      expect(columns).toContain('dateEnrolled');
      expect(columns).toContain('lastLogin');
      expect(columns).toContain('pleCompletePercent');
      expect(columns).toContain('preparedToPass');
      expect(columns).toContain('isActive');
      expect(columns).toContain('lastSyncedAt');
    });
  });
  
  describe('Database Operations', () => {
    it('should be able to query agentExamPrep table', async () => {
      if (!db) {
        console.log('Database not available, skipping test');
        return;
      }
      
      // Query should not throw
      const records = await db.select().from(schema.agentExamPrep).limit(10);
      expect(Array.isArray(records)).toBe(true);
    });
    
    it('should be able to insert and retrieve exam prep record', async () => {
      if (!db) {
        console.log('Database not available, skipping test');
        return;
      }
      
      // Insert a test record
      const testRecord = {
        xcelFirstName: 'TestExamPrep',
        xcelLastName: 'AgentTest',
        course: 'Life Insurance',
        state: 'TX',
        pleCompletePercent: 75,
        preparedToPass: 'No',
      };
      
      const result = await db.insert(schema.agentExamPrep).values(testRecord);
      expect(result).toBeDefined();
      
      // Query the record back
      const records = await db.select()
        .from(schema.agentExamPrep)
        .where(eq(schema.agentExamPrep.xcelFirstName, 'TestExamPrep'));
      
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].xcelFirstName).toBe('TestExamPrep');
      expect(records[0].xcelLastName).toBe('AgentTest');
      expect(records[0].course).toBe('Life Insurance');
      expect(records[0].pleCompletePercent).toBe(75);
      
      // Clean up - delete the test record
      await db.delete(schema.agentExamPrep)
        .where(eq(schema.agentExamPrep.xcelFirstName, 'TestExamPrep'));
    });
  });
  
  describe('XCEL Email Scraper', () => {
    it('should export syncExamPrepFromEmail function', async () => {
      const { syncExamPrepFromEmail } = await import('./xcel-exam-scraper');
      expect(typeof syncExamPrepFromEmail).toBe('function');
    });
    
    it('should export getExamPrepRecords function', async () => {
      const { getExamPrepRecords } = await import('./xcel-exam-scraper');
      expect(typeof getExamPrepRecords).toBe('function');
    });
    
    it('getExamPrepRecords should return array', async () => {
      const { getExamPrepRecords } = await import('./xcel-exam-scraper');
      const records = await getExamPrepRecords();
      expect(Array.isArray(records)).toBe(true);
    });
  });
  
  describe('Sync Service Integration', () => {
    it('should export syncExamPrepData function', async () => {
      const { syncExamPrepData } = await import('./sync-service');
      expect(typeof syncExamPrepData).toBe('function');
    });
    
    it('should export scheduledExamPrepSync function', async () => {
      const { scheduledExamPrepSync } = await import('./sync-service');
      expect(typeof scheduledExamPrepSync).toBe('function');
    });
  });
});
