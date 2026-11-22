export type Role = "ADMIN" | "MANAGER" | "DRIVER" | "REQUESTER";
export type TransferStatus =
  "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
export type Urgency = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  centerId: number | null;
};

export type AllowedActions = {
  edit: boolean;
  cancel: boolean;
  selfAssign: boolean;
  assignDriver: boolean;
  release: boolean;
  reschedule: boolean;
  start: boolean;
  deliver: boolean;
};

type NamedRef = { id: number; name: string };

export type Transfer = {
  id: number;
  plate: string | null;
  vin: string | null;
  brand: string;
  model: string;
  originCenterId: number;
  destinationCenterId: number;
  requestedAt: string;
  scheduledAt: string | null;
  urgency: Urgency;
  status: TransferStatus;
  notes: string | null;
  requesterId: number;
  driverId: number | null;
  createdAt: string;
  updatedAt: string;
  originCenter: NamedRef;
  destinationCenter: NamedRef;
  requester: NamedRef;
  driver: NamedRef | null;
  allowedActions: AllowedActions;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type Center = {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
};

export type CreateTransferBody = {
  plate: string | null;
  vin: string | null;
  brand: string;
  model: string;
  originCenterId: number;
  destinationCenterId: number;
  requestedAt: string;
  urgency: Urgency;
  notes: string | null;
};
