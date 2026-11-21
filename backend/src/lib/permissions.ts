import type { AuthUser } from "../middleware/auth.js";

export type TransferStatusName =
  "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";

export type TransferSnapshot = {
  status: TransferStatusName;
  requesterId: number;
  driverId: number | null;
};

const isStaff = (user: AuthUser) =>
  user.role === "ADMIN" || user.role === "MANAGER";

const isOwner = (user: AuthUser, t: TransferSnapshot) =>
  user.role === "REQUESTER" && t.requesterId === user.id;

const isAssignedDriver = (user: AuthUser, t: TransferSnapshot) =>
  user.role === "DRIVER" && t.driverId === user.id;

// Which transfers each role can see (to be used as a Prisma "where").
export function transferVisibilityFilter(user: AuthUser) {
  switch (user.role) {
    case "REQUESTER":
      return { requesterId: user.id };
    case "DRIVER":
      return { OR: [{ status: "PENDING" as const }, { driverId: user.id }] };
    default:
      return {};
  }
}

export function canCreateTransfer(user: AuthUser) {
  return user.role !== "DRIVER";
}

export function canViewTransfer(user: AuthUser, t: TransferSnapshot) {
  if (isStaff(user)) return true;
  if (user.role === "REQUESTER") return isOwner(user, t);
  return t.status === "PENDING" || isAssignedDriver(user, t);
}

export function canEditTransfer(user: AuthUser, t: TransferSnapshot) {
  if (isStaff(user)) return t.status === "PENDING" || t.status === "ASSIGNED";
  return isOwner(user, t) && t.status === "PENDING";
}

export function canCancelTransfer(user: AuthUser, t: TransferSnapshot) {
  if (user.role === "ADMIN") {
    return ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes(t.status);
  }
  return isOwner(user, t) && t.status === "PENDING";
}

export function canSelfAssign(user: AuthUser, t: TransferSnapshot) {
  return user.role === "DRIVER" && t.status === "PENDING";
}

export function canAssignDriver(user: AuthUser, t: TransferSnapshot) {
  return isStaff(user) && (t.status === "PENDING" || t.status === "ASSIGNED");
}

export function canRelease(user: AuthUser, t: TransferSnapshot) {
  if (t.status !== "ASSIGNED") return false;
  return isStaff(user) || isAssignedDriver(user, t);
}

export function canChangeProgress(
  user: AuthUser,
  t: TransferSnapshot,
  to: "IN_PROGRESS" | "DELIVERED",
) {
  const requiredStatus = to === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS";
  if (t.status !== requiredStatus) return false;
  return user.role === "ADMIN" || isAssignedDriver(user, t);
}

export function canReschedule(user: AuthUser, t: TransferSnapshot) {
  return (
    t.status === "ASSIGNED" && (isStaff(user) || isAssignedDriver(user, t))
  );
}

// What the current user can do with a transfer. The frontend uses it to decide which buttons to show, so the rules live only in this file.
export function allowedActions(user: AuthUser, t: TransferSnapshot) {
  return {
    edit: canEditTransfer(user, t),
    cancel: canCancelTransfer(user, t),
    selfAssign: canSelfAssign(user, t),
    assignDriver: canAssignDriver(user, t),
    release: canRelease(user, t),
    reschedule: canReschedule(user, t),
    start: canChangeProgress(user, t, "IN_PROGRESS"),
    deliver: canChangeProgress(user, t, "DELIVERED"),
  };
}
