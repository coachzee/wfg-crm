/**
 * Router Index
 * 
 * Re-exports all domain routers for easy importing.
 * This allows the main routers.ts to import from a single location.
 */

export { dashboardRouter } from './dashboard';
export { agentsRouter, AgentSchema } from './agents';
export { clientsRouter, ClientSchema, ClientUpdateSchema } from './clients';
export { tasksRouter, TaskSchema } from './tasks';
