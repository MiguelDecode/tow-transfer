import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { useCenters } from "../hooks/useCenters";
import { urgencyLabels } from "../lib/labels";
import {
  buildTransferFormSchema,
  toRequestBody,
  type TransferFormValues,
} from "../lib/transferForm";
import type { CreateTransferBody, Urgency } from "../lib/types";
import FormField from "./FormField";

const urgencies = Object.keys(urgencyLabels) as Urgency[];
const inputClass =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2";

type Props = {
  defaultValues: TransferFormValues;
  allowPastDate?: boolean;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  serverError: string | null;
  cancelTo: string;
  onSubmit: (body: CreateTransferBody) => void;
};

export default function TransferForm({
  defaultValues,
  allowPastDate = false,
  submitLabel,
  pendingLabel,
  pending,
  serverError,
  cancelTo,
  onSubmit,
}: Props) {
  const centers = useCenters();
  const schema = useMemo(
    () => buildTransferFormSchema(allowPastDate),
    [allowPastDate],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const centerOptions = centers.data ?? [];

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(toRequestBody(values)))}
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

      <FormField label="Chasis (VIN)" htmlFor="vin" error={errors.vin?.message}>
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
          to={cancelTo}
          className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
