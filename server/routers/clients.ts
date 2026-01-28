/**
 * Clients Router
 * 
 * Handles all client-related endpoints including:
 * - CRUD operations for clients
 * - Client search and filtering
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { logger } from "../_core/logger";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
} from "../db";

// Validation schemas
export const ClientSchema = z.object({
  agentId: z.number(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional(),
  renewalDate: z.date().optional(),
  notes: z.string().optional().nullable(),
});

export const ClientUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const clientsRouter = router({
  list: protectedProcedure.query(async () => {
    logger.info("Fetching all clients");
    return getClients();
  }),
  
  getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
    logger.info("Fetching client by ID", { clientId: input });
    return getClientById(input);
  }),
  
  create: protectedProcedure.input(ClientSchema).mutation(async ({ input }) => {
    logger.info("Creating new client", { firstName: input.firstName, lastName: input.lastName });
    return createClient(input);
  }),
  
  update: protectedProcedure.input(
    z.object({
      id: z.number(),
      data: ClientUpdateSchema,
    })
  ).mutation(async ({ input }) => {
    logger.info("Updating client", { clientId: input.id });
    return updateClient(input.id, input.data);
  }),
});

export default clientsRouter;
