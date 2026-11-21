import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const centersRouter = Router();

centersRouter.get("/", requireAuth, async (_req, res) => {
  const centers = await prisma.center.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });
  res.json(centers);
});
