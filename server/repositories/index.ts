/**
 * Repositories Index
 * 
 * Re-exports all repository modules for easy importing.
 * Repositories handle database operations for specific domains.
 */

// Agent repository
export {
  initAgentsRepository,
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  getAgentCashFlowHistory,
  getAllCashFlowRecords,
  getNetLicensedAgents,
  upsertCashFlowRecord,
  bulkUpsertCashFlowRecords,
  clearAllCashFlowRecords,
  getAgentContactInfo,
} from './agents';
export type { Agent, AgentCashFlowHistory } from './agents';

// Client repository
export {
  initClientsRepository,
  getClients,
  getClientById,
  createClient,
  updateClient,
  getClientEmailByName,
} from './clients';
export type { Client } from './clients';

// Task repository
export {
  initTasksRepository,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
  getTaskById,
  completeTask,
  getTaskStats,
} from './tasks';
export type { WorkflowTask } from './tasks';

// Dashboard repository
export {
  initDashboardRepository,
  getAgentStats,
  getProductionStats,
  getMonthlyTeamCashFlow,
  upsertMonthlyTeamCashFlow,
  bulkUpsertMonthlyTeamCashFlow,
  getCashFlowTotals,
} from './dashboard';

// Sync logs repository
export {
  initSyncLogsRepository,
  createScheduledSyncLog,
  updateScheduledSyncLog,
  getRecentScheduledSyncLogs,
  getScheduledSyncLogsByPeriod,
  getWeeklySyncSummary,
  getScheduledSyncLogs,
  getLatestScheduledSyncLog,
  getTodaySyncLogs,
} from './syncLogs';
export type { SyncLog } from './syncLogs';

// Policies repository
export {
  initPoliciesRepository,
  getPendingPolicies,
  getPendingPolicyByNumber,
  upsertPendingPolicy,
  getPendingRequirementsByPolicyId,
  clearPendingRequirements,
  insertPendingRequirement,
  bulkInsertPendingRequirements,
  getPendingPoliciesWithRequirements,
  getPendingPolicySummary,
  getInforcePolicies,
  getInforcePolicyByNumber,
  upsertInforcePolicy,
  getProductionSummary,
  getTopProducersByPremium,
  getProductionByWritingAgent,
  getTopAgentsByCommission,
} from './policies';
export type { InforcePolicy, PendingPolicy, PendingRequirement } from './policies';

// Income repository
export {
  initIncomeRepository,
  saveIncomeSnapshot,
  updateActualIncome,
  getIncomeHistory,
  getIncomeAccuracyStats,
} from './income';

// Goals repository
export {
  initGoalsRepository,
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
  getActiveGoals,
  archiveExpiredGoals,
} from './goals';
