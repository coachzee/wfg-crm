/**
 * Clients Repository
 * 
 * Database operations for client management including:
 * - CRUD operations
 * - Client filtering by agent
 * - Contact information management
 */

import { eq } from "drizzle-orm";
import { clients, InsertClient } from "../../drizzle/schema";
import { logger } from "../_core/logger";

// Re-export types
export type { Client } from "../../drizzle/schema";

// Import getDb from parent - will be injected
let _getDb: () => Promise<ReturnType<typeof import("drizzle-orm/mysql2").drizzle> | null>;

export function initClientsRepository(getDb: typeof _getDb) {
  _getDb = getDb;
}

export async function getClients(agentId?: number) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get clients: database not available");
    return [];
  }

  logger.debug("Fetching clients", { agentId });
  
  if (agentId) {
    return db.select().from(clients).where(eq(clients.agentId, agentId));
  }
  return db.select().from(clients);
}

export async function getClientById(id: number) {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get client: database not available");
    return null;
  }
  
  logger.debug("Fetching client by ID", { clientId: id });
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0] || null;
}

export async function createClient(data: InsertClient) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Creating new client", { firstName: data.firstName, lastName: data.lastName });
  return db.insert(clients).values(data);
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await _getDb();
  if (!db) throw new Error("Database not available");
  
  logger.info("Updating client", { clientId: id });
  await db.update(clients).set(data).where(eq(clients.id, id));
  
  const updated = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return updated[0];
}

export async function getClientEmailByName(firstName: string, lastName: string): Promise<string | null> {
  const db = await _getDb();
  if (!db) {
    logger.warn("Cannot get client email: database not available");
    return null;
  }
  
  logger.debug("Fetching client email by name", { firstName, lastName });
  
  // Try exact match first
  const exactMatch = await db.select({ email: clients.email })
    .from(clients)
    .where(eq(clients.firstName, firstName))
    .limit(1);
  
  if (exactMatch.length > 0 && exactMatch[0].email) {
    return exactMatch[0].email;
  }
  
  // Try case-insensitive match
  const allClients = await db.select({
    firstName: clients.firstName,
    lastName: clients.lastName,
    email: clients.email,
  }).from(clients);
  
  for (const client of allClients) {
    if (
      client.firstName?.toLowerCase() === firstName.toLowerCase() &&
      client.lastName?.toLowerCase() === lastName.toLowerCase() &&
      client.email
    ) {
      return client.email;
    }
  }
  
  return null;
}
