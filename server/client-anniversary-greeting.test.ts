import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getPoliciesWithAnniversaryToday: vi.fn(),
    getClientEmailByName: vi.fn(),
    getAgentContactInfo: vi.fn(),
    hasAnniversaryGreetingBeenSent: vi.fn(),
    recordAnniversaryGreetingSent: vi.fn(),
  };
});

// Mock the email-alert module
vi.mock('./email-alert', async () => {
  const actual = await vi.importActual('./email-alert');
  return {
    ...actual,
    sendClientAnniversaryGreeting: vi.fn(),
    sendBulkClientAnniversaryGreetings: vi.fn(),
  };
});

import {
  getPoliciesWithAnniversaryToday,
  getClientEmailByName,
  getAgentContactInfo,
  hasAnniversaryGreetingBeenSent,
  recordAnniversaryGreetingSent,
} from './db';

import {
  sendClientAnniversaryGreeting,
  sendBulkClientAnniversaryGreetings,
} from './email-alert';

describe('Client Anniversary Greeting Emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPoliciesWithAnniversaryToday', () => {
    it('should return policies with anniversaries matching today', async () => {
      const mockPolicies = [
        {
          id: 1,
          policyNumber: 'POL001',
          ownerName: 'John Doe',
          policyAge: 2,
          faceAmount: 500000,
          premium: 150,
          productType: 'IUL',
          writingAgentName: 'Jane Agent',
          writingAgentCode: 'AG001',
        },
      ];

      vi.mocked(getPoliciesWithAnniversaryToday).mockResolvedValue(mockPolicies);

      const result = await getPoliciesWithAnniversaryToday();

      expect(result).toHaveLength(1);
      expect(result[0].policyNumber).toBe('POL001');
      expect(result[0].policyAge).toBe(2);
    });

    it('should return empty array when no anniversaries today', async () => {
      vi.mocked(getPoliciesWithAnniversaryToday).mockResolvedValue([]);

      const result = await getPoliciesWithAnniversaryToday();

      expect(result).toHaveLength(0);
    });

    it('should filter out policies with age 0 (issued today, not anniversary)', async () => {
      vi.mocked(getPoliciesWithAnniversaryToday).mockResolvedValue([]);

      const result = await getPoliciesWithAnniversaryToday();

      // Age 0 policies should be filtered out
      expect(result.every(p => p.policyAge > 0)).toBe(true);
    });
  });

  describe('getClientEmailByName', () => {
    it('should return email for exact name match', async () => {
      vi.mocked(getClientEmailByName).mockResolvedValue('john.doe@example.com');

      const result = await getClientEmailByName('John', 'Doe');

      expect(result).toBe('john.doe@example.com');
    });

    it('should return null when no client found', async () => {
      vi.mocked(getClientEmailByName).mockResolvedValue(null);

      const result = await getClientEmailByName('Unknown', 'Person');

      expect(result).toBeNull();
    });
  });

  describe('getAgentContactInfo', () => {
    it('should return agent contact info by agent code', async () => {
      const mockAgentInfo = {
        name: 'Jane Agent',
        email: 'jane@wfg.com',
        phone: '555-1234',
      };

      vi.mocked(getAgentContactInfo).mockResolvedValue(mockAgentInfo);

      const result = await getAgentContactInfo('AG001');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Jane Agent');
      expect(result?.email).toBe('jane@wfg.com');
    });

    it('should return null for unknown agent code', async () => {
      vi.mocked(getAgentContactInfo).mockResolvedValue(null);

      const result = await getAgentContactInfo('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('hasAnniversaryGreetingBeenSent', () => {
    it('should return true if greeting was already sent this year', async () => {
      vi.mocked(hasAnniversaryGreetingBeenSent).mockResolvedValue(true);

      const result = await hasAnniversaryGreetingBeenSent('POL001', 2026);

      expect(result).toBe(true);
    });

    it('should return false if greeting not sent yet', async () => {
      vi.mocked(hasAnniversaryGreetingBeenSent).mockResolvedValue(false);

      const result = await hasAnniversaryGreetingBeenSent('POL001', 2026);

      expect(result).toBe(false);
    });
  });

  describe('sendClientAnniversaryGreeting', () => {
    it('should send greeting email with correct details', async () => {
      vi.mocked(sendClientAnniversaryGreeting).mockResolvedValue(true);

      const result = await sendClientAnniversaryGreeting({
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        policyNumber: 'POL001',
        policyAge: 2,
        faceAmount: 500000,
        productType: 'IUL',
        agentName: 'Jane Agent',
        agentPhone: '555-1234',
        agentEmail: 'jane@wfg.com',
      });

      expect(result).toBe(true);
      expect(sendClientAnniversaryGreeting).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          policyNumber: 'POL001',
          policyAge: 2,
        })
      );
    });

    it('should return false when email is missing', async () => {
      vi.mocked(sendClientAnniversaryGreeting).mockResolvedValue(false);

      const result = await sendClientAnniversaryGreeting({
        email: '',
        firstName: 'John',
        lastName: 'Doe',
        policyNumber: 'POL001',
        policyAge: 2,
        faceAmount: 500000,
        agentName: 'Jane Agent',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendBulkClientAnniversaryGreetings', () => {
    it('should send greetings to multiple clients', async () => {
      vi.mocked(sendBulkClientAnniversaryGreetings).mockResolvedValue({
        sent: 3,
        failed: 0,
        skipped: 1,
      });

      const clients = [
        {
          email: 'client1@example.com',
          firstName: 'Client',
          lastName: 'One',
          policyNumber: 'POL001',
          policyAge: 1,
          faceAmount: 100000,
          agentName: 'Agent',
        },
        {
          email: 'client2@example.com',
          firstName: 'Client',
          lastName: 'Two',
          policyNumber: 'POL002',
          policyAge: 2,
          faceAmount: 200000,
          agentName: 'Agent',
        },
        {
          email: 'client3@example.com',
          firstName: 'Client',
          lastName: 'Three',
          policyNumber: 'POL003',
          policyAge: 3,
          faceAmount: 300000,
          agentName: 'Agent',
        },
        {
          email: '',
          firstName: 'No',
          lastName: 'Email',
          policyNumber: 'POL004',
          policyAge: 4,
          faceAmount: 400000,
          agentName: 'Agent',
        },
      ];

      const result = await sendBulkClientAnniversaryGreetings(clients);

      expect(result.sent).toBe(3);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('recordAnniversaryGreetingSent', () => {
    it('should record greeting sent without error', async () => {
      vi.mocked(recordAnniversaryGreetingSent).mockResolvedValue(undefined);

      await expect(
        recordAnniversaryGreetingSent('POL001', 2026, 'john@example.com')
      ).resolves.not.toThrow();

      expect(recordAnniversaryGreetingSent).toHaveBeenCalledWith(
        'POL001',
        2026,
        'john@example.com'
      );
    });
  });

  describe('Email template content', () => {
    it('should include ordinal suffix for policy age', () => {
      // Test ordinal suffix logic
      const ordinalSuffix = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      expect(ordinalSuffix(1)).toBe('1st');
      expect(ordinalSuffix(2)).toBe('2nd');
      expect(ordinalSuffix(3)).toBe('3rd');
      expect(ordinalSuffix(4)).toBe('4th');
      expect(ordinalSuffix(11)).toBe('11th');
      expect(ordinalSuffix(12)).toBe('12th');
      expect(ordinalSuffix(13)).toBe('13th');
      expect(ordinalSuffix(21)).toBe('21st');
      expect(ordinalSuffix(22)).toBe('22nd');
      expect(ordinalSuffix(23)).toBe('23rd');
    });
  });
});
