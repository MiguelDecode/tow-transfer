import { z } from "zod";
import type { CreateTransferBody, Transfer, Urgency } from "./types";

export type TransferFormValues = {
  plate: string;
  vin: string;
  brand: string;
  model: string;
  originCenterId: string;
  destinationCenterId: string;
  requestedAt: string;
  urgency: Urgency;
  notes: string;
};

export const emptyTransferForm: TransferFormValues = {
  plate: "",
  vin: "",
  brand: "",
  model: "",
  originCenterId: "",
  destinationCenterId: "",
  requestedAt: "",
  urgency: "NORMAL",
  notes: "",
};

// Same normalisation as the backend, to validate in the same way.
const normalizePlate = (value: string) =>
  value.replace(/[\s-]/g, "").toUpperCase();
const normalizeVin = (value: string) => value.replace(/\s/g, "").toUpperCase();

// When editing, the stored requested date may already be in the past.
export function buildTransferFormSchema(allowPastDate: boolean) {
  return z
    .object({
      plate: z
        .string()
        .trim()
        .refine((v) => v === "" || /^[A-Z0-9]{4,10}$/.test(normalizePlate(v)), {
          message: "La matrícula no es válida",
        }),
      vin: z
        .string()
        .trim()
        .refine((v) => v === "" || /^[A-Z0-9]{17}$/.test(normalizeVin(v)), {
          message: "El chasis debe tener 17 letras o números",
        }),
      brand: z
        .string()
        .trim()
        .min(1, "Introduce la marca")
        .max(60, "Máximo 60 caracteres"),
      model: z
        .string()
        .trim()
        .min(1, "Introduce el modelo")
        .max(60, "Máximo 60 caracteres"),
      originCenterId: z.string().min(1, "Selecciona el centro de recogida"),
      destinationCenterId: z.string().min(1, "Selecciona el centro de entrega"),
      requestedAt: z
        .string()
        .min(1, "Indica la fecha y hora deseada")
        .refine((v) => !Number.isNaN(Date.parse(v)), {
          message: "La fecha no es válida",
        })
        .refine((v) => allowPastDate || Date.parse(v) >= Date.now() - 60_000, {
          message: "La fecha no puede estar en el pasado",
        }),
      urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
      notes: z.string().trim().max(1000, "Máximo 1000 caracteres"),
    })
    .refine((data) => data.plate !== "" || data.vin !== "", {
      message: "Indica la matrícula o el chasis",
      path: ["plate"],
    })
    .refine((data) => data.originCenterId !== data.destinationCenterId, {
      message: "El centro de entrega debe ser distinto del de recogida",
      path: ["destinationCenterId"],
    });
}

// Form values -> what the API expects.
export function toRequestBody(values: TransferFormValues): CreateTransferBody {
  return {
    plate: values.plate || null,
    vin: values.vin || null,
    brand: values.brand,
    model: values.model,
    originCenterId: Number(values.originCenterId),
    destinationCenterId: Number(values.destinationCenterId),
    requestedAt: new Date(values.requestedAt).toISOString(),
    urgency: values.urgency,
    notes: values.notes || null,
  };
}

// The value a datetime-local input expects: local time, without seconds.
function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A transfer from the API -> form values (to edit it).
export function toFormValues(transfer: Transfer): TransferFormValues {
  return {
    plate: transfer.plate ?? "",
    vin: transfer.vin ?? "",
    brand: transfer.brand,
    model: transfer.model,
    originCenterId: String(transfer.originCenterId),
    destinationCenterId: String(transfer.destinationCenterId),
    requestedAt: toDateTimeLocal(transfer.requestedAt),
    urgency: transfer.urgency,
    notes: transfer.notes ?? "",
  };
}
