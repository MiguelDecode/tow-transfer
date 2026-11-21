export const STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "CANCELLED",
] as const;

export const ACTIVE_STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS"] as const;

export const URGENCIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

// Related data included in every transfer response.
export const transferInclude = {
  originCenter: { select: { id: true, name: true } },
  destinationCenter: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  driver: { select: { id: true, name: true } },
} as const;
