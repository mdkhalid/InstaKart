import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthPayload {
  userId: string;
  role: string;
  storeId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const payload = verifyAccessToken(authHeader.split(" ")[1]);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }
};

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "STORE_ADMIN"];

/**
 * Require any admin-level role (ADMIN, SUPER_ADMIN, or STORE_ADMIN).
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

/**
 * Require super admin (ADMIN or SUPER_ADMIN) — excludes STORE_ADMIN.
 * Used for global-only features like user management, store CRUD, coupons, analytics.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN")) {
    return res.status(403).json({ success: false, message: "Super admin access required" });
  }
  next();
};

/**
 * Helper: get the effective storeId to scope queries.
 * For STORE_ADMIN users, their assigned storeId is forced.
 * For SUPER_ADMIN/ADMIN, the optional query param is used.
 */
export function getEffectiveStoreId(req: Request): string | null {
  if (req.user?.role === "STORE_ADMIN") {
    return req.user.storeId || null;
  }
  return (req.query.storeId as string) || null;
}
