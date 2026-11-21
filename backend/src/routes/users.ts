import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ROLES } from "../lib/auth.js";
import { idParamSchema, omitUndefined } from "../lib/http.js";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  centerId: true,
  active: true,
  createdAt: true,
} as const;

const nameSchema = z.string().trim().min(1).max(100);
const passwordSchema = z.string().min(8).max(72);
const centerIdSchema = z.number().int().positive();

const createUserSchema = z
  .object({
    name: nameSchema,
    email: z.email().transform((email) => email.toLowerCase()),
    role: z.enum(ROLES),
    centerId: centerIdSchema.nullish(),
    password: passwordSchema,
  })
  .refine((data) => data.role !== "REQUESTER" || data.centerId != null, {
    message: "Requesters need a center",
    path: ["centerId"],
  });

const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    role: z.enum(ROLES).optional(),
    centerId: centerIdSchema.nullable().optional(),
    active: z.boolean().optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

async function activeCenterExists(id: number) {
  const center = await prisma.center.findUnique({ where: { id } });
  return center !== null && center.active;
}

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: userSelect,
  });
  res.json(users);
});

usersRouter.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }
  const { name, email, role, password } = parsed.data;
  // Only requesters belong to a center.
  const centerId = role === "REQUESTER" ? (parsed.data.centerId ?? null) : null;

  if (centerId !== null && !(await activeCenterExists(centerId))) {
    res.status(400).json({ error: "Center not found or inactive" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      centerId,
      passwordHash: await bcrypt.hash(password, 10),
    },
    select: userSelect,
  });
  res.status(201).json(user);
});

usersRouter.patch("/:id", async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!id.success || !parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: id.data } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Avoid locking yourself out of the system.
  const { password, ...changes } = parsed.data;
  if (
    id.data === currentUser(req).id &&
    (changes.active === false ||
      (changes.role !== undefined && changes.role !== "ADMIN"))
  ) {
    res.status(400).json({ error: "You cannot deactivate or demote yourself" });
    return;
  }

  const role = changes.role ?? existing.role;
  let centerId =
    changes.centerId !== undefined ? changes.centerId : existing.centerId;
  if (role !== "REQUESTER") {
    centerId = null;
  } else if (centerId === null) {
    res.status(400).json({ error: "Requesters need a center" });
    return;
  } else if (
    centerId !== existing.centerId &&
    !(await activeCenterExists(centerId))
  ) {
    res.status(400).json({ error: "Center not found or inactive" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: id.data },
    data: {
      ...omitUndefined(changes),
      centerId,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: userSelect,
  });
  res.json(user);
});
