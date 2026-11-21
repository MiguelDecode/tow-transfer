import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { idParamSchema, omitUndefined } from "../lib/http.js";
import {
  ACTIVE_STATUSES,
  STATUSES,
  URGENCIES,
  transferDetailInclude,
  transferInclude,
} from "../lib/transfers.js";
import {
  allowedActions,
  canAssignDriver,
  canCancelTransfer,
  canChangeProgress,
  canCreateTransfer,
  canEditTransfer,
  canRelease,
  canReschedule,
  canSelfAssign,
  canViewTransfer,
  transferVisibilityFilter,
  type TransferSnapshot,
  type TransferStatusName,
} from "../lib/permissions.js";
import { currentUser, requireAuth, type AuthUser } from "../middleware/auth.js";

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
    include: transferDetailInclude,
  });

  // 404 both when it does not exist and when the user cannot see it,
  // so nobody can find out which transfers exist.
  if (!transfer || !canViewTransfer(user, transfer)) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  res.json({ ...transfer, allowedActions: allowedActions(user, transfer) });
});

// ---------- Actions ----------

const isoDateSchema = z.iso
  .datetime({ offset: true })
  .transform((v) => new Date(v));
const futureDateSchema = isoDateSchema.refine(
  (date) => date.getTime() > Date.now(),
  {
    message: "Date must be in the future",
  },
);

const assignSchema = z.object({
  driverId: z.number().int().positive().optional(),
  scheduledAt: futureDateSchema,
});

const scheduleSchema = z.object({ scheduledAt: futureDateSchema });

const updateTransferSchema = z
  .object({
    plate: plateSchema.nullable().optional(),
    vin: vinSchema.nullable().optional(),
    brand: z.string().trim().min(1).max(60).optional(),
    model: z.string().trim().min(1).max(60).optional(),
    originCenterId: z.number().int().positive().optional(),
    destinationCenterId: z.number().int().positive().optional(),
    requestedAt: isoDateSchema.optional(),
    urgency: z.enum(URGENCIES).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

const CONFLICT_MESSAGE =
  "The transfer was changed by someone else. Reload and try again";

// Loads the transfer and checks the user can see it (404 otherwise).
async function loadForAction(req: Request, res: Response) {
  const user = currentUser(req);
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: "Invalid id" });
    return null;
  }
  const transfer = await prisma.transfer.findUnique({ where: { id: id.data } });
  if (!transfer || !canViewTransfer(user, transfer)) {
    res.status(404).json({ error: "Transfer not found" });
    return null;
  }
  return { user, transfer };
}

async function sendTransfer(res: Response, user: AuthUser, id: number) {
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: transferDetailInclude,
  });
  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  res.json({ ...transfer, allowedActions: allowedActions(user, transfer) });
}

// Changes the status and records it in the history, in one transaction.
// It only works if the transfer still has the expected status, so two
// people acting at the same time cannot overwrite each other.
async function transition(
  res: Response,
  user: AuthUser,
  transfer: TransferSnapshot & { id: number },
  toStatus: TransferStatusName,
  extra: Prisma.TransferUncheckedUpdateManyInput = {},
) {
  const done = await prisma.$transaction(async (tx) => {
    const result = await tx.transfer.updateMany({
      where: { id: transfer.id, status: transfer.status },
      data: { ...extra, status: toStatus },
    });
    if (result.count !== 1) return false;
    await tx.transferStatusHistory.create({
      data: { transferId: transfer.id, status: toStatus, changedById: user.id },
    });
    return true;
  });

  if (!done) {
    res.status(409).json({ error: CONFLICT_MESSAGE });
    return;
  }
  await sendTransfer(res, user, transfer.id);
}

// Simple actions: check permission, then change the status.
function actionRoute(
  path: string,
  isAllowed: (user: AuthUser, transfer: TransferSnapshot) => boolean,
  toStatus: TransferStatusName,
  extra: Prisma.TransferUncheckedUpdateManyInput = {},
) {
  transfersRouter.post(`/:id/${path}`, async (req, res) => {
    const context = await loadForAction(req, res);
    if (!context) return;
    const { user, transfer } = context;
    if (!isAllowed(user, transfer)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await transition(res, user, transfer, toStatus, extra);
  });
}

actionRoute("release", canRelease, "PENDING", {
  driverId: null,
  scheduledAt: null,
});
actionRoute(
  "start",
  (u, t) => canChangeProgress(u, t, "IN_PROGRESS"),
  "IN_PROGRESS",
);
actionRoute(
  "deliver",
  (u, t) => canChangeProgress(u, t, "DELIVERED"),
  "DELIVERED",
);
actionRoute("cancel", canCancelTransfer, "CANCELLED");

transfersRouter.post("/:id/assign", async (req, res) => {
  const context = await loadForAction(req, res);
  if (!context) return;
  const { user, transfer } = context;

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }

  let driverId: number;
  if (user.role === "DRIVER") {
    // A driver can only assign the transfer to themselves.
    const asksForAnotherDriver =
      parsed.data.driverId !== undefined && parsed.data.driverId !== user.id;
    if (!canSelfAssign(user, transfer) || asksForAnotherDriver) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    driverId = user.id;
  } else {
    if (!canAssignDriver(user, transfer)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (parsed.data.driverId === undefined) {
      res.status(400).json({ error: "driverId is required" });
      return;
    }
    const driver = await prisma.user.findUnique({
      where: { id: parsed.data.driverId },
    });
    if (!driver || driver.role !== "DRIVER" || !driver.active) {
      res.status(400).json({ error: "Driver not found or inactive" });
      return;
    }
    driverId = driver.id;
  }

  await transition(res, user, transfer, "ASSIGNED", {
    driverId,
    scheduledAt: parsed.data.scheduledAt,
  });
});

transfersRouter.patch("/:id/schedule", async (req, res) => {
  const context = await loadForAction(req, res);
  if (!context) return;
  const { user, transfer } = context;

  if (!canReschedule(user, transfer)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }

  const result = await prisma.transfer.updateMany({
    where: { id: transfer.id, status: "ASSIGNED" },
    data: { scheduledAt: parsed.data.scheduledAt },
  });
  if (result.count !== 1) {
    res.status(409).json({ error: CONFLICT_MESSAGE });
    return;
  }
  await sendTransfer(res, user, transfer.id);
});

transfersRouter.patch("/:id", async (req, res) => {
  const context = await loadForAction(req, res);
  if (!context) return;
  const { user, transfer } = context;

  if (!canEditTransfer(user, transfer)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = updateTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid data", details: z.flattenError(parsed.error) });
    return;
  }
  const changes = parsed.data;

  // Rules that depend on the final state of the transfer.
  const plate = changes.plate !== undefined ? changes.plate : transfer.plate;
  const vin = changes.vin !== undefined ? changes.vin : transfer.vin;
  const originCenterId = changes.originCenterId ?? transfer.originCenterId;
  const destinationCenterId =
    changes.destinationCenterId ?? transfer.destinationCenterId;

  if (plate === null && vin === null) {
    res.status(400).json({ error: "Plate or VIN is required" });
    return;
  }
  if (originCenterId === destinationCenterId) {
    res.status(400).json({ error: "Origin and destination must be different" });
    return;
  }

  const centersChanged =
    originCenterId !== transfer.originCenterId ||
    destinationCenterId !== transfer.destinationCenterId;
  if (centersChanged) {
    const centers = await prisma.center.findMany({
      where: {
        id: { in: [originCenterId, destinationCenterId] },
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
  }

  if (changes.plate !== undefined || changes.vin !== undefined) {
    const identifiers: Prisma.TransferWhereInput[] = [];
    if (plate) identifiers.push({ plate });
    if (vin) identifiers.push({ vin });
    const duplicate = await prisma.transfer.findFirst({
      where: {
        id: { not: transfer.id },
        status: { in: [...ACTIVE_STATUSES] },
        OR: identifiers,
      },
      select: { id: true },
    });
    if (duplicate) {
      res.status(409).json({
        error: "There is already an active transfer for this vehicle",
      });
      return;
    }
  }

  const result = await prisma.transfer.updateMany({
    where: { id: transfer.id, status: transfer.status },
    data: omitUndefined({
      plate: changes.plate,
      vin: changes.vin,
      brand: changes.brand,
      model: changes.model,
      originCenterId: changes.originCenterId,
      destinationCenterId: changes.destinationCenterId,
      requestedAt: changes.requestedAt,
      urgency: changes.urgency,
      notes: changes.notes,
    }),
  });
  if (result.count !== 1) {
    res.status(409).json({ error: CONFLICT_MESSAGE });
    return;
  }
  await sendTransfer(res, user, transfer.id);
});
