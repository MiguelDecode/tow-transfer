import type { Role, TransferStatus, Urgency } from "./types";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  DRIVER: "Gruista",
  REQUESTER: "Solicitante",
};

export const statusLabels: Record<TransferStatus, string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En curso",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const urgencyLabels: Record<Urgency, string> = {
  LOW: "Baja",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};
