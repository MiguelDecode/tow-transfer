import type { NextFunction, Request, Response } from "express";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type RoleName,
} from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: RoleName;
  centerId: number | null;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token: unknown = req.cookies[SESSION_COOKIE];
  const userId =
    typeof token === "string" ? await verifySessionToken(token) : null;

  if (userId === null) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      centerId: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    centerId: user.centerId,
  };
  next();
}

// Use inside routes protected by requireAuth.
export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new Error("requireAuth middleware is missing on this route");
  }
  return req.user;
}

// Use after requireAuth: requireAuth, requireRole("ADMIN")
export function requireRole(...roles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(currentUser(req).role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
