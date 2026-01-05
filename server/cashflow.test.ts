import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('Net Licensed Calculation Logic', () => {
  describe('isEligibleForNetLicensed', () => {
    // Test the eligibility logic directly
    const isEligibleForNetLicensed = (titleLevel: string): boolean => {
      const eligibleTitles = ['TA', 'A'];
      return eligibleTitles.includes(titleLevel.toUpperCase());
    };

    it('should return true for Training Associate (TA)', () => {
      expect(isEligibleForNetLicensed('TA')).toBe(true);
      expect(isEligibleForNetLicensed('ta')).toBe(true);
    });

    it('should return true for Associate (A)', () => {
      expect(isEligibleForNetLicensed('A')).toBe(true);
      expect(isEligibleForNetLicensed('a')).toBe(true);
    });

    it('should return false for Senior Associate (SA)', () => {
      expect(isEligibleForNetLicensed('SA')).toBe(false);
    });

    it('should return false for Marketing Director (MD)', () => {
      expect(isEligibleForNetLicensed('MD')).toBe(false);
    });

    it('should return false for Senior Marketing Director (SMD)', () => {
      expect(isEligibleForNetLicensed('SMD')).toBe(false);
    });

    it('should return false for Executive Marketing Director (EMD)', () => {
      expect(isEligibleForNetLicensed('EMD')).toBe(false);
    });
  });

  describe('calculateNetLicensedStatus', () => {
    // Test the Net Licensed status calculation
    const calculateNetLicensedStatus = (totalCashFlow: number, titleLevel: string): boolean => {
      const eligibleTitles = ['TA', 'A'];
      const isEligible = eligibleTitles.includes(titleLevel.toUpperCase());
      return totalCashFlow >= 1000 && isEligible;
    };

    it('should return true for A with $1,000+ cash flow', () => {
      expect(calculateNetLicensedStatus(1000, 'A')).toBe(true);
      expect(calculateNetLicensedStatus(5000, 'A')).toBe(true);
      expect(calculateNetLicensedStatus(15071.31, 'A')).toBe(true);
    });

    it('should return true for TA with $1,000+ cash flow', () => {
      expect(calculateNetLicensedStatus(1000, 'TA')).toBe(true);
      expect(calculateNetLicensedStatus(2500, 'TA')).toBe(true);
    });

    it('should return false for A with less than $1,000 cash flow', () => {
      expect(calculateNetLicensedStatus(999.99, 'A')).toBe(false);
      expect(calculateNetLicensedStatus(500, 'A')).toBe(false);
      expect(calculateNetLicensedStatus(0, 'A')).toBe(false);
    });

    it('should return false for SMD regardless of cash flow', () => {
      expect(calculateNetLicensedStatus(189931.39, 'SMD')).toBe(false);
      expect(calculateNetLicensedStatus(50000, 'SMD')).toBe(false);
    });

    it('should return false for MD regardless of cash flow', () => {
      expect(calculateNetLicensedStatus(100000, 'MD')).toBe(false);
    });

    it('should return false for SA regardless of cash flow', () => {
      expect(calculateNetLicensedStatus(5000, 'SA')).toBe(false);
    });
  });

  describe('Net Licensed filtering', () => {
    // Simulate the filtering logic used in getNetLicensedAgents
    const filterNetLicensedAgents = (records: Array<{
      agentCode: string;
      agentName: string;
      titleLevel: string;
      cumulativeCashFlow: string;
    }>) => {
      return records.filter(r => {
        const cashFlow = parseFloat(r.cumulativeCashFlow || '0');
        const title = r.titleLevel?.toUpperCase() || '';
        return cashFlow >= 1000 && (title === 'TA' || title === 'A');
      });
    };

    const testData = [
      { agentCode: '73DXR', agentName: 'Zaid Shopeju', titleLevel: 'SMD', cumulativeCashFlow: '189931.39' },
      { agentCode: 'D0T7M', agentName: 'Augustina Armstrong-Ogbonna', titleLevel: 'SMD', cumulativeCashFlow: '57655.48' },
      { agentCode: 'E0D89', agentName: 'Chinonyerem Nkemere', titleLevel: 'A', cumulativeCashFlow: '15071.31' },
      { agentCode: 'C9U9S', agentName: 'Oluwatosin Adetona', titleLevel: 'A', cumulativeCashFlow: '6488.12' },
      { agentCode: 'D6W3S', agentName: 'Nonso Humphrey', titleLevel: 'A', cumulativeCashFlow: '4993.62' },
      { agentCode: 'D3Y16', agentName: 'Odion Imasuen', titleLevel: 'A', cumulativeCashFlow: '3361.35' },
      { agentCode: '49AEA', agentName: 'Francis Ogunlolu', titleLevel: 'A', cumulativeCashFlow: '1802.15' },
      { agentCode: 'D3Z8L', agentName: 'Renata Jeroe', titleLevel: 'A', cumulativeCashFlow: '1245.17' },
      { agentCode: 'C9F3Z', agentName: 'Mercy Okonofua', titleLevel: 'A', cumulativeCashFlow: '755.76' },
      { agentCode: 'D3U63', agentName: 'Ese Moses', titleLevel: 'TA', cumulativeCashFlow: '155.96' },
      { agentCode: '42EBU', agentName: 'Clive Henry', titleLevel: 'A', cumulativeCashFlow: '9.84' },
      { agentCode: '16CKG', agentName: 'Folashade Olaiya', titleLevel: 'A', cumulativeCashFlow: '0.64' },
    ];

    it('should return exactly 6 Net Licensed agents from test data', () => {
      const netLicensed = filterNetLicensedAgents(testData);
      expect(netLicensed.length).toBe(6);
    });

    it('should exclude SMD agents even with high cash flow', () => {
      const netLicensed = filterNetLicensedAgents(testData);
      const smdAgents = netLicensed.filter(a => a.titleLevel === 'SMD');
      expect(smdAgents.length).toBe(0);
    });

    it('should include all A agents with $1,000+ cash flow', () => {
      const netLicensed = filterNetLicensedAgents(testData);
      const expectedAgents = ['Chinonyerem Nkemere', 'Oluwatosin Adetona', 'Nonso Humphrey', 'Odion Imasuen', 'Francis Ogunlolu', 'Renata Jeroe'];
      const actualNames = netLicensed.map(a => a.agentName);
      
      expectedAgents.forEach(name => {
        expect(actualNames).toContain(name);
      });
    });

    it('should exclude agents with less than $1,000 cash flow', () => {
      const netLicensed = filterNetLicensedAgents(testData);
      const lowCashFlowAgents = ['Mercy Okonofua', 'Ese Moses', 'Clive Henry', 'Folashade Olaiya'];
      const actualNames = netLicensed.map(a => a.agentName);
      
      lowCashFlowAgents.forEach(name => {
        expect(actualNames).not.toContain(name);
      });
    });

    it('should handle edge case of exactly $1,000 cash flow', () => {
      const edgeCaseData = [
        { agentCode: 'TEST1', agentName: 'Test Agent', titleLevel: 'A', cumulativeCashFlow: '1000.00' },
      ];
      const netLicensed = filterNetLicensedAgents(edgeCaseData);
      expect(netLicensed.length).toBe(1);
    });

    it('should handle edge case of $999.99 cash flow (not Net Licensed)', () => {
      const edgeCaseData = [
        { agentCode: 'TEST1', agentName: 'Test Agent', titleLevel: 'A', cumulativeCashFlow: '999.99' },
      ];
      const netLicensed = filterNetLicensedAgents(edgeCaseData);
      expect(netLicensed.length).toBe(0);
    });
  });

  describe('Not Net Licensed filtering', () => {
    const filterNotNetLicensedAgents = (records: Array<{
      agentCode: string;
      agentName: string;
      titleLevel: string;
      cumulativeCashFlow: string;
    }>) => {
      return records.filter(r => {
        const cashFlow = parseFloat(r.cumulativeCashFlow || '0');
        const title = r.titleLevel?.toUpperCase() || '';
        return cashFlow < 1000 && cashFlow > 0 && (title === 'TA' || title === 'A');
      });
    };

    const testData = [
      { agentCode: 'C9F3Z', agentName: 'Mercy Okonofua', titleLevel: 'A', cumulativeCashFlow: '755.76' },
      { agentCode: 'D3U63', agentName: 'Ese Moses', titleLevel: 'TA', cumulativeCashFlow: '155.96' },
      { agentCode: '42EBU', agentName: 'Clive Henry', titleLevel: 'A', cumulativeCashFlow: '9.84' },
      { agentCode: '16CKG', agentName: 'Folashade Olaiya', titleLevel: 'A', cumulativeCashFlow: '0.64' },
      { agentCode: 'ZERO', agentName: 'Zero Cash Flow', titleLevel: 'A', cumulativeCashFlow: '0' },
    ];

    it('should return agents with cash flow between $0 and $1,000', () => {
      const notNetLicensed = filterNotNetLicensedAgents(testData);
      expect(notNetLicensed.length).toBe(4); // Excludes zero cash flow
    });

    it('should exclude agents with zero cash flow', () => {
      const notNetLicensed = filterNotNetLicensedAgents(testData);
      const zeroAgent = notNetLicensed.find(a => a.agentName === 'Zero Cash Flow');
      expect(zeroAgent).toBeUndefined();
    });

    it('should calculate amount to Net Licensed correctly', () => {
      const records = [
        { agentCode: 'C9F3Z', agentName: 'Mercy Okonofua', titleLevel: 'A', cumulativeCashFlow: '755.76' },
      ];
      const notNetLicensed = filterNotNetLicensedAgents(records);
      const amountToNetLicensed = 1000 - parseFloat(notNetLicensed[0].cumulativeCashFlow);
      expect(amountToNetLicensed).toBeCloseTo(244.24, 2);
    });
  });
});
