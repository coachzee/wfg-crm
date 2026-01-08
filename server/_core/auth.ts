/**
 * Self-hosted Authentication Module
 * Replaces Manus OAuth with local email/password authentication
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";

// Environment configuration
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  return new TextEncoder().encode(secret);
};

export type SessionPayload = {
  openId: string;
  name: string;
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT session token
 */
export async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getJwtSecret();

  return new SignJWT({
    openId,
    name: options.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/**
 * Verify a JWT session token
 */
export async function verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string } | null> {
  if (!cookieValue) {
    return null;
  }

  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;

    if (typeof openId !== "string" || openId.length === 0) {
      return null;
    }

    return {
      openId,
      name: typeof name === "string" ? name : "",
    };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

/**
 * Parse cookies from request header
 */
function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

/**
 * Authenticate a request and return the user
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const user = await db.getUserByOpenId(session.openId);

  if (!user) {
    throw ForbiddenError("User not found");
  }

  // Update last signed in
  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });

  return user;
}

/**
 * Generate a unique user ID (replaces Manus openId)
 */
export function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `user_${timestamp}${randomPart}`;
}

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // Find user by email
      const user = await db.getUserByEmail(email);
      
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Verify password
      const passwordHash = await db.getUserPasswordHash(user.openId);
      if (!passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const isValid = await verifyPassword(password, passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Create session token
      const sessionToken = await createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      // Generate unique user ID
      const openId = generateUserId();

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      await db.createUserWithPassword({
        openId,
        name: name || null,
        email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      }, passwordHash);

      // Create session token
      const sessionToken = await createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      const user = await db.getUserByOpenId(openId);

      res.json({ 
        success: true, 
        user: {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          role: user?.role,
        }
      });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      res.json({
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new password are required" });
        return;
      }

      // Verify current password
      const passwordHash = await db.getUserPasswordHash(user.openId);
      if (!passwordHash) {
        res.status(400).json({ error: "Cannot change password for this account" });
        return;
      }

      const isValid = await verifyPassword(currentPassword, passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      // Update password
      const newPasswordHash = await hashPassword(newPassword);
      await db.updateUserPassword(user.openId, newPasswordHash);

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Password change failed", error);
      res.status(500).json({ error: "Password change failed" });
    }
  });
}
