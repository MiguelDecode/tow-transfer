import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const centersRouter = Router();

centersRouter.get("/", async (_req, res) => {
  const centers = await prisma.center.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });
  res.json(centers);
});
