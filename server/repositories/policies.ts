/**
 * Policies Repository
 * 
 * Database operations for policy management including:
 * - Pending policies (Transamerica Life Access)
 * - Inforce policies (Production data)
 * - Policy requirements
 * - Production summaries
 */

import { eq, desc, sql } from "drizzle-orm";
import { 
  pendingPolicies, pendingRequirements, inforcePolicies,
  InsertPendingPolicy, InsertPendingRequirement, InsertInforcePolicy 
} from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Re-export types
export type { PendingPolicy, PendingRequirement, InforcePolicy } from "../../drizzle/schema";

let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initPoliciesRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

// ============================================
// Pending Policies
// ============================================

export async function getPendingPolicies(filters?: { status?: string; agentCode?: string }) {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching pending policies", { filters });
  let query: any = db.select().from(pendingPolicies);
  if (filters?.status) {
    query = query.where(eq(pendingPolicies.status, filters.status as any));
  }
  if (filters?.agentCode) {
    query = query.where(eq(pendingPolicies.agentCode, filters.agentCode));
  }
  return query.orderBy(desc(pendingPolicies.updatedAt));
}

export async function getPendingPolicyByNumber(policyNumber: string) {
  const db = await _getDb();
  if (!db) return null;
  const result = await db.select().from(pendingPolicies).where(eq(pendingPolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}

export async function upsertPendingPolicy(data: InsertPendingPolicy) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Upserting pending policy", { policyNumber: data.policyNumber });
  const existing = await getPendingPolicyByNumber(data.policyNumber);
  
  if (existing) {
    await db.update(pendingPolicies)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(pendingPolicies.policyNumber, data.policyNumber));
    return getPendingPolicyByNumber(data.policyNumber);
  } else {
    const result = await db.insert(pendingPolicies).values({ ...data, lastSyncedAt: new Date() });
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert pending policy");
    const created = await db.select().from(pendingPolicies).where(eq(pendingPolicies.id, insertId)).limit(1);
    return created[0];
  }
}

export async function getPendingRequirementsByPolicyId(policyId: number) {
  const db = await _getDb();
  if (!db) return [];
  return db.select().from(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));
}

export async function clearPendingRequirements(policyId: number) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));
}

export async function insertPendingRequirement(data: InsertPendingRequirement) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(pendingRequirements).values(data);
}

export async function bulkInsertPendingRequirements(requirements: InsertPendingRequirement[]) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  if (requirements.length === 0) return;
  return db.insert(pendingRequirements).values(requirements);
}

export async function getPendingPoliciesWithRequirements() {
  const db = await _getDb();
  if (!db) return [];
  
  const policies = await db.select().from(pendingPolicies).orderBy(desc(pendingPolicies.updatedAt));
  
  const policiesWithRequirements = await Promise.all(
    policies.map(async (policy) => {
      const requirements = await getPendingRequirementsByPolicyId(policy.id);
      return {
        ...policy,
        requirements: {
          pendingWithProducer: requirements.filter(r => r.category === "Pending with Producer"),
          pendingWithTransamerica: requirements.filter(r => r.category === "Pending with Transamerica"),
          completed: requirements.filter(r => r.category === "Completed"),
        },
      };
    })
  );
  
  return policiesWithRequirements;
}

export async function getPendingPolicySummary() {
  const db = await _getDb();
  if (!db) return { total: 0, byStatus: {}, totalPendingRequirements: 0 };
  
  const policies = await db.select().from(pendingPolicies);
  const requirements = await db.select().from(pendingRequirements);
  
  const byStatus: Record<string, number> = {};
  policies.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  
  const pendingWithProducerCount = requirements.filter(r => r.category === "Pending with Producer").length;
  const pendingWithTransamericaCount = requirements.filter(r => r.category === "Pending with Transamerica").length;
  
  return {
    total: policies.length,
    byStatus,
    totalPendingRequirements: pendingWithProducerCount + pendingWithTransamericaCount,
    pendingWithProducerCount,
    pendingWithTransamericaCount,
  };
}

// ============================================
// Inforce Policies
// ============================================

export async function getInforcePolicies(filters?: { status?: string; agentId?: number }) {
  const db = await _getDb();
  if (!db) return [];
  
  logger.debug("Fetching inforce policies", { filters });
  let query: any = db.select().from(inforcePolicies);
  if (filters?.status) {
    query = query.where(eq(inforcePolicies.status, filters.status as any));
  }
  if (filters?.agentId) {
    query = query.where(eq(inforcePolicies.agentId, filters.agentId));
  }
  return query.orderBy(desc(inforcePolicies.updatedAt));
}

export async function getInforcePolicyByNumber(policyNumber: string) {
  const db = await _getDb();
  if (!db) return null;
  const result = await db.select().from(inforcePolicies).where(eq(inforcePolicies.policyNumber, policyNumber)).limit(1);
  return result[0] || null;
}

export async function upsertInforcePolicy(data: InsertInforcePolicy) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Upserting inforce policy", { policyNumber: data.policyNumber });
  const existing = await getInforcePolicyByNumber(data.policyNumber);
  
  if (existing) {
    await db.update(inforcePolicies)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(inforcePolicies.policyNumber, data.policyNumber));
    return getInforcePolicyByNumber(data.policyNumber);
  } else {
    const result = await db.insert(inforcePolicies).values({ ...data, lastSyncedAt: new Date() });
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) throw new Error("Failed to insert inforce policy");
    const created = await db.select().from(inforcePolicies).where(eq(inforcePolicies.id, insertId)).limit(1);
    return created[0];
  }
}

export async function getProductionSummary() {
  const db = await _getDb();
  if (!db) return {
    totalPolicies: 0, activePolicies: 0, totalPremium: 0,
    totalCommission: 0, totalFaceAmount: 0, byStatus: {},
  };
  
  const policies = await db.select().from(inforcePolicies);
  
  const activePolicies = policies.filter(p => p.status === 'Active');
  const totalPremium = policies.reduce((sum, p) => sum + parseFloat(p.premium?.toString() || '0'), 0);
  const totalCommission = policies.reduce((sum, p) => sum + parseFloat(p.calculatedCommission?.toString() || '0'), 0);
  const totalFaceAmount = policies.reduce((sum, p) => sum + parseFloat(p.faceAmount?.toString() || '0'), 0);
  
  const byStatus: Record<string, number> = {};
  policies.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });
  
  return { totalPolicies: policies.length, activePolicies: activePolicies.length, totalPremium, totalCommission, totalFaceAmount, byStatus };
}

export async function getTopProducersByPremium(limit: number = 10) {
  const db = await _getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  const producerMap = new Map<string, { name: string; totalPremium: number; totalCommission: number; policyCount: number; totalFaceAmount: number }>();
  
  for (const policy of policies) {
    const name = policy.ownerName;
    const existing = producerMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0, totalFaceAmount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || '0');
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || '0');
    existing.totalFaceAmount += parseFloat(policy.faceAmount?.toString() || '0');
    existing.policyCount += 1;
    producerMap.set(name, existing);
  }
  
  return Array.from(producerMap.values())
    .sort((a, b) => b.totalPremium - a.totalPremium)
    .slice(0, limit);
}

export async function getProductionByWritingAgent() {
  const db = await _getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  const agentMap = new Map<string, { name: string; totalPremium: number; totalCommission: number; policyCount: number }>();
  
  for (const policy of policies) {
    const name = policy.writingAgentName || 'Unknown';
    const existing = agentMap.get(name) || { name, totalPremium: 0, totalCommission: 0, policyCount: 0 };
    existing.totalPremium += parseFloat(policy.premium?.toString() || '0');
    existing.totalCommission += parseFloat(policy.calculatedCommission?.toString() || '0');
    existing.policyCount += 1;
    agentMap.set(name, existing);
  }
  
  return Array.from(agentMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);
}

export async function getTopAgentsByCommission(limit: number = 10) {
  const db = await _getDb();
  if (!db) return [];
  
  const policies = await db.select().from(inforcePolicies).where(eq(inforcePolicies.status, 'Active'));
  
  const agentMap = new Map<string, { 
    agentCode: string; 
    name: string; 
    totalPremium: number; 
    totalCommission: number; 
    policyCount: number; 
    totalFaceAmount: number;
    avgCommissionLevel: number;
    commissionLevelSum: number;
  }>();
  
  for (const policy of policies) {
    const targetPremium = parseFloat(policy.targetPremium?.toString() || policy.premium?.toString() || '0');
    const multiplier = 1.25;
    
    // Primary agent
    const primaryName = policy.writingAgentName || 'Unknown';
    const primaryCode = policy.writingAgentCode || '';
    const primarySplit = Number(policy.writingAgentSplit) || 100;
    const primaryLevel = Number(policy.writingAgentLevel) || 55;
    const primaryCommission = targetPremium * multiplier * (primaryLevel / 100) * (primarySplit / 100);
    
    const existingPrimary = agentMap.get(primaryName) || { 
      name: primaryName, 
      agentCode: primaryCode,
      totalCommission: 0, 
      totalPremium: 0, 
      policyCount: 0,
      totalFaceAmount: 0,
      avgCommissionLevel: 0,
      commissionLevelSum: 0
    };
    existingPrimary.totalCommission += primaryCommission;
    existingPrimary.totalPremium += targetPremium * (primarySplit / 100);
    existingPrimary.totalFaceAmount += parseFloat(policy.faceAmount?.toString() || '0');
    existingPrimary.policyCount += 1;
    existingPrimary.commissionLevelSum += Number(primaryLevel);
    existingPrimary.avgCommissionLevel = existingPrimary.commissionLevelSum / existingPrimary.policyCount;
    if (!existingPrimary.agentCode && primaryCode) {
      existingPrimary.agentCode = primaryCode;
    }
    agentMap.set(primaryName, existingPrimary);
    
    // Secondary agent (if split)
    if (policy.secondAgentName && policy.secondAgentSplit && Number(policy.secondAgentSplit) > 0) {
      const secondaryName = policy.secondAgentName;
      const secondaryCode = policy.secondAgentCode || '';
      const secondarySplit = Number(policy.secondAgentSplit);
      const secondaryLevel = Number(policy.secondAgentLevel) || 25;
      const secondaryCommission = targetPremium * multiplier * (secondaryLevel / 100) * (secondarySplit / 100);
      
      const existingSecondary = agentMap.get(secondaryName) || { 
        name: secondaryName, 
        agentCode: secondaryCode,
        totalCommission: 0, 
        totalPremium: 0, 
        policyCount: 0,
        totalFaceAmount: 0,
        avgCommissionLevel: 0,
        commissionLevelSum: 0
      };
      existingSecondary.totalCommission += secondaryCommission;
      existingSecondary.totalPremium += targetPremium * (secondarySplit / 100);
      existingSecondary.policyCount += 1;
      existingSecondary.commissionLevelSum += Number(secondaryLevel);
      existingSecondary.avgCommissionLevel = existingSecondary.commissionLevelSum / existingSecondary.policyCount;
      if (!existingSecondary.agentCode && secondaryCode) {
        existingSecondary.agentCode = secondaryCode;
      }
      agentMap.set(secondaryName, existingSecondary);
    }
  }
  
  return Array.from(agentMap.values())
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, limit);
}
