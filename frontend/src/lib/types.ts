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
