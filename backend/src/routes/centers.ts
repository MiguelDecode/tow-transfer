import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParamSchema, omitUndefined } from "../lib/http.js";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.js";

export const centersRouter = Router();

const centerSelect = {
  id: true,
  name: true,
  address: true,
  active: true,
} as const;

const nameSchema = z.string().trim().min(1).max(100);
const addressSchema = z.string().trim().max(200);

const createCenterSchema = z.object({
  name: nameSchema,
  address: addressSchema.nullish(),
});

const updateCenterSchema = z
  .object({
    name: nameSchema.optional(),
    address: addressSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

centersRouter.get("/", requireAuth, async (req, res) => {
  // Only admins can ask for inactive centers too.
  const includeInactive =
    req.query.includeInactive === "true" && currentUser(req).role === "ADMIN";

  const centers = await prisma.center.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
    select: centerSelect,
  });
  res.json(centers);
});

centersRouter.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createCenterSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }
  const { name, address } = parsed.data;

  if (await prisma.center.findUnique({ where: { name } })) {
    res.status(409).json({ error: "A center with that name already exists" });
    return;
  }

  const center = await prisma.center.create({
    data: { name, address: address ?? null },
    select: centerSelect,
  });
  res.status(201).json(center);
});

centersRouter.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const id = idParamSchema.safeParse(req.params.id);
    const parsed = updateCenterSchema.safeParse(req.body);
    if (!id.success || !parsed.success) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }

    const existing = await prisma.center.findUnique({ where: { id: id.data } });
    if (!existing) {
      res.status(404).json({ error: "Center not found" });
      return;
    }

    const { name } = parsed.data;
    if (name !== undefined && name !== existing.name) {
      if (await prisma.center.findUnique({ where: { name } })) {
        res
          .status(409)
          .json({ error: "A center with that name already exists" });
        return;
      }
    }

    const center = await prisma.center.update({
      where: { id: id.data },
      data: omitUndefined(parsed.data),
      select: centerSelect,
    });
    res.json(center);
  },
);
