import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { idParamSchema } from "../lib/http.js";
import {
  ACTIVE_STATUSES,
  STATUSES,
  URGENCIES,
  transferInclude,
} from "../lib/transfers.js";
import {
  allowedActions,
  canCreateTransfer,
  canViewTransfer,
  transferVisibilityFilter,
} from "../lib/permissions.js";
import { currentUser, requireAuth } from "../middleware/auth.js";

export const transfersRouter = Router();

transfersRouter.use(requireAuth);

const plateSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,10}$/, "Invalid plate"));

const vinSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{17}$/, "Invalid VIN"));

const createTransferSchema = z
  .object({
    plate: plateSchema.nullish(),
    vin: vinSchema.nullish(),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    originCenterId: z.number().int().positive(),
    destinationCenterId: z.number().int().positive(),
    requestedAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    urgency: z.enum(URGENCIES).default("NORMAL"),
    notes: z.string().trim().max(1000).nullish(),
  })
  .refine((data) => data.plate != null || data.vin != null, {
    message: "Plate or VIN is required",
    path: ["plate"],
  })
  .refine((data) => data.originCenterId !== data.destinationCenterId, {
    message: "Origin and destination must be different",
    path: ["destinationCenterId"],
  });

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  urgency: z.enum(URGENCIES).optional(),
  centerId: z.coerce.number().int().positive().optional(),
  driverId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

transfersRouter.post("/", async (req, res) => {
  const user = currentUser(req);
  if (!canCreateTransfer(user)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = createTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }
  const data = parsed.data;

  const centers = await prisma.center.findMany({
    where: {
      id: { in: [data.originCenterId, data.destinationCenterId] },
      active: true,
    },
    select: { id: true },
  });
  if (centers.length !== 2) {
    res
      .status(400)
      .json({ error: "Origin or destination center not found or inactive" });
    return;
  }

  // The same vehicle cannot have two active transfers.
  const identifiers: Prisma.TransferWhereInput[] = [];
  if (data.plate) identifiers.push({ plate: data.plate });
  if (data.vin) identifiers.push({ vin: data.vin });
  const duplicate = await prisma.transfer.findFirst({
    where: { status: { in: [...ACTIVE_STATUSES] }, OR: identifiers },
    select: { id: true },
  });
  if (duplicate) {
    res
      .status(409)
      .json({ error: "There is already an active transfer for this vehicle" });
    return;
  }

  const transfer = await prisma.transfer.create({
    data: {
      plate: data.plate ?? null,
      vin: data.vin ?? null,
      brand: data.brand,
      model: data.model,
      originCenterId: data.originCenterId,
      destinationCenterId: data.destinationCenterId,
      requestedAt: data.requestedAt,
      urgency: data.urgency,
      notes: data.notes ?? null,
      requesterId: user.id,
      history: { create: { status: "PENDING", changedById: user.id } },
    },
    include: transferInclude,
  });
  res
    .status(201)
    .json({ ...transfer, allowedActions: allowedActions(user, transfer) });
});

transfersRouter.get("/", async (req, res) => {
  const user = currentUser(req);
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid query", details: z.flattenError(parsed.error) });
    return;
  }
  const { status, urgency, centerId, driverId, q, page, pageSize } =
    parsed.data;

  // The role-based filter always applies, whatever the user asks for.
  const clauses: Prisma.TransferWhereInput[] = [transferVisibilityFilter(user)];
  if (status) clauses.push({ status });
  if (urgency) clauses.push({ urgency });
  if (driverId) clauses.push({ driverId });
  if (centerId) {
    clauses.push({
      OR: [{ originCenterId: centerId }, { destinationCenterId: centerId }],
    });
  }
  if (q) {
    const vehicleCode = q.replace(/[\s-]/g, "").toUpperCase();
    clauses.push({
      OR: [
        { plate: { contains: vehicleCode } },
        { vin: { contains: vehicleCode } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.TransferWhereInput = { AND: clauses };

  const [total, transfers] = await Promise.all([
    prisma.transfer.count({ where }),
    prisma.transfer.findMany({
      where,
      include: transferInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    items: transfers.map((t) => ({
      ...t,
      allowedActions: allowedActions(user, t),
    })),
    page,
    pageSize,
    total,
  });
});

transfersRouter.get("/:id", async (req, res) => {
  const user = currentUser(req);
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id: id.data },
    include: {
      ...transferInclude,
      history: {
        orderBy: { changedAt: "asc" },
        select: {
          status: true,
          changedAt: true,
          changedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  // 404 both when it does not exist and when the user cannot see it,
  // so nobody can find out which transfers exist.
  if (!transfer || !canViewTransfer(user, transfer)) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  res.json({ ...transfer, allowedActions: allowedActions(user, transfer) });
});
