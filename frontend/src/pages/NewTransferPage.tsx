import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";
import { z } from "zod";
import FormField from "../components/FormField";
import { useMe } from "../hooks/useAuth";
import { useCenters } from "../hooks/useCenters";
import { useCreateTransfer } from "../hooks/useTransfers";
import { ApiError } from "../lib/api";
import { urgencyLabels } from "../lib/labels";
import type { Urgency } from "../lib/types";

const urgencies = Object.keys(urgencyLabels) as Urgency[];

// Same normalisation as the backend, to validate in the same way.
const normalizePlate = (value: string) =>
  value.replace(/[\s-]/g, "").toUpperCase();
const normalizeVin = (value: string) => value.replace(/\s/g, "").toUpperCase();

const transferFormSchema = z
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
      .refine((v) => Date.parse(v) >= Date.now() - 60_000, {
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

type TransferForm = z.infer<typeof transferFormSchema>;

const inputClass =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2";

export default function NewTransferPage() {
  const me = useMe();
  const navigate = useNavigate();
  const centers = useCenters();
  const createTransfer = useCreateTransfer();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferForm>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      plate: "",
      vin: "",
      brand: "",
      model: "",
      originCenterId: "",
      destinationCenterId: "",
      requestedAt: "",
      urgency: "NORMAL",
      notes: "",
    },
  });

  // Drivers cannot create transfers.
  if (me.data?.role === "DRIVER") {
    return <Navigate to="/transfers" replace />;
  }

  function onSubmit(values: TransferForm) {
    createTransfer.mutate(
      {
        plate: values.plate || null,
        vin: values.vin || null,
        brand: values.brand,
        model: values.model,
        originCenterId: Number(values.originCenterId),
        destinationCenterId: Number(values.destinationCenterId),
        requestedAt: new Date(values.requestedAt).toISOString(),
        urgency: values.urgency,
        notes: values.notes || null,
      },
      { onSuccess: () => navigate("/transfers") },
    );
  }

  let serverError: string | null = null;
  if (createTransfer.error) {
    serverError =
      createTransfer.error instanceof ApiError &&
      createTransfer.error.status === 409
        ? "Ya existe un traslado activo para este vehículo."
        : "No se pudo crear el traslado. Revisa los datos e inténtalo de nuevo.";
  }

  const centerOptions = centers.data ?? [];

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Nuevo traslado</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2"
      >
        <FormField
          label="Matrícula"
          htmlFor="plate"
          error={errors.plate?.message}
          hint="Matrícula o chasis: basta con uno de los dos."
        >
          <input id="plate" className={inputClass} {...register("plate")} />
        </FormField>

        <FormField
          label="Chasis (VIN)"
          htmlFor="vin"
          error={errors.vin?.message}
        >
          <input id="vin" className={inputClass} {...register("vin")} />
        </FormField>

        <FormField label="Marca" htmlFor="brand" error={errors.brand?.message}>
          <input id="brand" className={inputClass} {...register("brand")} />
        </FormField>

        <FormField label="Modelo" htmlFor="model" error={errors.model?.message}>
          <input id="model" className={inputClass} {...register("model")} />
        </FormField>

        <FormField
          label="Centro de recogida"
          htmlFor="originCenterId"
          error={errors.originCenterId?.message}
        >
          <select
            id="originCenterId"
            className={inputClass}
            disabled={centers.isPending}
            {...register("originCenterId")}
          >
            <option value="">Seleccionar…</option>
            {centerOptions.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Centro de entrega"
          htmlFor="destinationCenterId"
          error={errors.destinationCenterId?.message}
        >
          <select
            id="destinationCenterId"
            className={inputClass}
            disabled={centers.isPending}
            {...register("destinationCenterId")}
          >
            <option value="">Seleccionar…</option>
            {centerOptions.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Fecha y hora deseada"
          htmlFor="requestedAt"
          error={errors.requestedAt?.message}
          hint="Es una propuesta: el gruista o el administrador fijarán la fecha final."
        >
          <input
            id="requestedAt"
            type="datetime-local"
            className={inputClass}
            {...register("requestedAt")}
          />
        </FormField>

        <FormField
          label="Urgencia"
          htmlFor="urgency"
          error={errors.urgency?.message}
        >
          <select id="urgency" className={inputClass} {...register("urgency")}>
            {urgencies.map((value) => (
              <option key={value} value={value}>
                {urgencyLabels[value]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Observaciones"
          htmlFor="notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <textarea
            id="notes"
            rows={3}
            className={inputClass}
            {...register("notes")}
          />
        </FormField>

        {centers.isError && (
          <p
            role="alert"
            className="rounded bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2"
          >
            No se pudo cargar la lista de centros. Recarga la página.
          </p>
        )}
        {serverError && (
          <p
            role="alert"
            className="rounded bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2"
          >
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-3 sm:col-span-2">
          <Link
            to="/transfers"
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createTransfer.isPending}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {createTransfer.isPending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </section>
  );
}
