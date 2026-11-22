import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const driversRouter = Router();

driversRouter.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (_req, res) => {
    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.json(drivers);
  },
);
