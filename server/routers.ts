/**
 * Main Router Composition
 * 
 * This file composes all domain routers into the main appRouter.
 * Individual router logic is in server/routers/*.ts files.
 */

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { getAllUsers } from "./db";

// Import all domain routers
import {
  dashboardRouter,
  agentsRouter,
  clientsRouter,
  tasksRouter,
  mywfgRouter,
  cashFlowRouter,
  syncLogsRouter,
  pendingPoliciesRouter,
  inforcePoliciesRouter,
  credentialsRouter,
  productionRouter,
  teamRouter,
  alertsRouter,
} from "./routers/index";

// Auth router (kept inline as it's tightly coupled with cookie handling)
const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
  listUsers: protectedProcedure.query(async () => {
    return getAllUsers();
  }),
});

// Compose all routers into the main appRouter
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  agents: agentsRouter,
  clients: clientsRouter,
  tasks: tasksRouter,
  production: productionRouter,
  credentials: credentialsRouter,
  dashboard: dashboardRouter,
  mywfg: mywfgRouter,
  cashFlow: cashFlowRouter,
  team: teamRouter,
  syncLogs: syncLogsRouter,
  pendingPolicies: pendingPoliciesRouter,
  inforcePolicies: inforcePoliciesRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
