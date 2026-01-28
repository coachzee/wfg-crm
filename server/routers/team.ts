/**
 * Team Router Module
 * 
 * Handles team management (admin only):
 * - List all users
 */

import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getAllUsers } from "../db";

export const teamRouter = router({
  // List all users (admin only)
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return getAllUsers();
  }),
});
