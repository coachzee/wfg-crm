/**
 * Credentials Router Module
 * 
 * Handles secure credential storage:
 * - Get credentials for current user
 * - Save encrypted credentials
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getCredentialsByUserId, createOrUpdateCredential } from "../db";
import { encryptCredential } from "../encryption";

const CredentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  apiKey: z.string().optional(),
});

export const credentialsRouter = router({
  // Get credentials for current user
  get: protectedProcedure.query(async ({ ctx }) => {
    const cred = await getCredentialsByUserId(ctx.user.id);
    if (!cred) return null;
    return {
      id: cred.id,
      isActive: cred.isActive,
      lastUsedAt: cred.lastUsedAt,
    };
  }),

  // Save credentials
  save: protectedProcedure
    .input(CredentialSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const encryptedUsername = encryptCredential(input.username);
        const encryptedPassword = encryptCredential(input.password);
        const encryptedApiKey = input.apiKey ? encryptCredential(input.apiKey) : undefined;
        
        await createOrUpdateCredential({
          userId: ctx.user.id,
          encryptedUsername,
          encryptedPassword,
          encryptedApiKey,
          isActive: true,
        });
        
        return { success: true };
      } catch (error) {
        console.error("Failed to save credentials:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save credentials" });
      }
    }),
});
