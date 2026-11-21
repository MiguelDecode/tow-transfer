import { describe, expect, it } from "vitest";
import type { AuthUser } from "../middleware/auth.js";
import {
  allowedActions,
  canCancelTransfer,
  canChangeProgress,
  canRelease,
  canReschedule,
  canSelfAssign,
  canViewTransfer,
  transferVisibilityFilter,
  type TransferSnapshot,
} from "./permissions.js";

const user = (role: AuthUser["role"], id = 1): AuthUser => ({
  id,
  name: "Test",
  email: "test@example.com",
  role,
  centerId: null,
});

const transfer = (
  status: TransferSnapshot["status"],
  requesterId = 1,
  driverId: number | null = null,
): TransferSnapshot => ({ status, requesterId, driverId });

describe("cancelling", () => {
  it("lets a requester cancel their own pending transfer", () => {
    expect(
      canCancelTransfer(user("REQUESTER", 1), transfer("PENDING", 1)),
    ).toBe(true);
  });
  it("does not let a requester cancel once it is assigned", () => {
    expect(
      canCancelTransfer(user("REQUESTER", 1), transfer("ASSIGNED", 1, 5)),
    ).toBe(false);
  });
  it("does not let a requester cancel someone else's transfer", () => {
    expect(
      canCancelTransfer(user("REQUESTER", 2), transfer("PENDING", 1)),
    ).toBe(false);
  });
  it("does not let a manager cancel", () => {
    expect(canCancelTransfer(user("MANAGER"), transfer("PENDING"))).toBe(false);
  });
  it("lets an admin cancel an in-progress transfer but not a delivered one", () => {
    expect(
      canCancelTransfer(user("ADMIN"), transfer("IN_PROGRESS", 1, 5)),
    ).toBe(true);
    expect(canCancelTransfer(user("ADMIN"), transfer("DELIVERED", 1, 5))).toBe(
      false,
    );
  });
});

describe("driver actions", () => {
  it("lets a driver take a pending transfer only", () => {
    expect(canSelfAssign(user("DRIVER"), transfer("PENDING"))).toBe(true);
    expect(canSelfAssign(user("DRIVER"), transfer("ASSIGNED", 1, 9))).toBe(
      false,
    );
  });
  it("lets a driver release only their own assigned transfer", () => {
    expect(canRelease(user("DRIVER", 5), transfer("ASSIGNED", 1, 5))).toBe(
      true,
    );
    expect(canRelease(user("DRIVER", 6), transfer("ASSIGNED", 1, 5))).toBe(
      false,
    );
    expect(canRelease(user("DRIVER", 5), transfer("IN_PROGRESS", 1, 5))).toBe(
      false,
    );
  });
  it("follows the order assigned -> in progress -> delivered", () => {
    const driver = user("DRIVER", 5);
    expect(
      canChangeProgress(driver, transfer("ASSIGNED", 1, 5), "IN_PROGRESS"),
    ).toBe(true);
    expect(
      canChangeProgress(driver, transfer("ASSIGNED", 1, 5), "DELIVERED"),
    ).toBe(false);
    expect(
      canChangeProgress(driver, transfer("IN_PROGRESS", 1, 5), "DELIVERED"),
    ).toBe(true);
  });
});

describe("visibility", () => {
  it("shows a requester only their own transfers", () => {
    expect(canViewTransfer(user("REQUESTER", 1), transfer("PENDING", 2))).toBe(
      false,
    );
    expect(transferVisibilityFilter(user("REQUESTER", 1))).toEqual({
      requesterId: 1,
    });
  });
  it("shows a driver pending transfers and their own", () => {
    expect(canViewTransfer(user("DRIVER", 5), transfer("PENDING", 1))).toBe(
      true,
    );
    expect(canViewTransfer(user("DRIVER", 5), transfer("ASSIGNED", 1, 6))).toBe(
      false,
    );
  });
  it("shows managers and admins everything", () => {
    expect(transferVisibilityFilter(user("MANAGER"))).toEqual({});
    expect(transferVisibilityFilter(user("ADMIN"))).toEqual({});
  });
});

describe("allowed actions", () => {
  it("lists what a requester can do with their pending transfer", () => {
    const actions = allowedActions(
      user("REQUESTER", 1),
      transfer("PENDING", 1),
    );
    expect(actions).toEqual({
      edit: true,
      cancel: true,
      selfAssign: false,
      assignDriver: false,
      release: false,
      reschedule: false,
      start: false,
      deliver: false,
    });
  });
});

describe("rescheduling", () => {
  it("lets the assigned driver and staff reschedule an assigned transfer", () => {
    const t = transfer("ASSIGNED", 1, 5);
    expect(canReschedule(user("DRIVER", 5), t)).toBe(true);
    expect(canReschedule(user("DRIVER", 6), t)).toBe(false);
    expect(canReschedule(user("MANAGER"), t)).toBe(true);
    expect(canReschedule(user("REQUESTER", 1), t)).toBe(false);
  });
});
