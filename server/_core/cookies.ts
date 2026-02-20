import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  // With trust proxy enabled, req.secure is correct
  if (req.secure) return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((p) => p.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  // Use SameSite=None only when secure (HTTPS) — browsers reject
  // SameSite=None on non-HTTPS. Default to Lax for CSRF protection.
  // Cross-site cookies are needed for the Manus OAuth flow.
  const sameSite: CookieOptions["sameSite"] = secure ? "none" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
