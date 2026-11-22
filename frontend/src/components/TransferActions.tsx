import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDrivers } from "../hooks/useDrivers";
import {
  useAssignTransfer,
  useRescheduleTransfer,
  useTransferAction,
} from "../hooks/useTransfers";
import { actionErrorMessage } from "../lib/errors";
import { toDateTimeLocal } from "../lib/transferForm";
import type { TransferDetail } from "../lib/types";
import FormField from "./FormField";

const inputClass =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2";
const primaryButton =
  "rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60";
const outlineButton =
  "rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-60";

const futureDate = z
  .string()
  .min(1, "Indica la fecha y hora")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "La fecha no es válida",
  })
  .refine((value) => Date.parse(value) > Date.now(), {
    message: "La fecha debe ser futura",
  });

type AssignValues = { driverId: string; scheduledAt: string };
type ScheduleValues = { scheduledAt: string };

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {actionErrorMessage(error)}
    </p>
  );
}

// A driver takes the transfer, or a manager/admin assigns (or reassigns) a driver.
function AssignPanel({ transfer }: { transfer: TransferDetail }) {
  const selfAssign = transfer.allowedActions.selfAssign;
  const needsDriver = !selfAssign;
  const drivers = useDrivers(needsDriver);
  const assign = useAssignTransfer(transfer.id);

  const schema = useMemo(
    () =>
      z.object({
        driverId: needsDriver
          ? z.string().min(1, "Selecciona un gruista")
          : z.string(),
        scheduledAt: futureDate,
      }),
    [needsDriver],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      driverId: transfer.driverId ? String(transfer.driverId) : "",
      scheduledAt: toDateTimeLocal(
        transfer.scheduledAt ?? transfer.requestedAt,
      ),
    },
  });

  const title = selfAssign
    ? "Asignarme este traslado"
    : transfer.status === "PENDING"
      ? "Asignar gruista"
      : "Cambiar de gruista";

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit((values) =>
        assign.mutate({
          ...(needsDriver ? { driverId: Number(values.driverId) } : {}),
          scheduledAt: new Date(values.scheduledAt).toISOString(),
        }),
      )}
    >
      <h3 className="font-medium">{title}</h3>
      <div className="flex flex-wrap items-start gap-3">
        {needsDriver && (
          <FormField
            label="Gruista"
            htmlFor="assign-driver"
            error={errors.driverId?.message}
          >
            <select
              id="assign-driver"
              className={inputClass}
              disabled={drivers.isPending}
              {...register("driverId")}
            >
              <option value="">Seleccionar…</option>
              {(drivers.data ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField
          label="Fecha y hora del traslado"
          htmlFor="assign-date"
          error={errors.scheduledAt?.message}
        >
          <input
            id="assign-date"
            type="datetime-local"
            className={inputClass}
            {...register("scheduledAt")}
          />
        </FormField>
        <button
          type="submit"
          disabled={assign.isPending}
          className={`${primaryButton} mt-6`}
        >
          {assign.isPending
            ? "Guardando…"
            : selfAssign
              ? "Asignármelo"
              : "Asignar"}
        </button>
      </div>
      <ErrorNote error={assign.error} />
    </form>
  );
}

function ReschedulePanel({ transfer }: { transfer: TransferDetail }) {
  const reschedule = useRescheduleTransfer(transfer.id);
  const schema = useMemo(() => z.object({ scheduledAt: futureDate }), []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScheduleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scheduledAt: toDateTimeLocal(
        transfer.scheduledAt ?? transfer.requestedAt,
      ),
    },
  });

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit((values) =>
        reschedule.mutate({
          scheduledAt: new Date(values.scheduledAt).toISOString(),
        }),
      )}
    >
      <h3 className="font-medium">Cambiar fecha</h3>
      <div className="flex flex-wrap items-start gap-3">
        <FormField
          label="Nueva fecha y hora"
          htmlFor="reschedule-date"
          error={errors.scheduledAt?.message}
        >
          <input
            id="reschedule-date"
            type="datetime-local"
            className={inputClass}
            {...register("scheduledAt")}
          />
        </FormField>
        <button
          type="submit"
          disabled={reschedule.isPending}
          className={`${outlineButton} mt-6`}
        >
          {reschedule.isPending ? "Guardando…" : "Cambiar fecha"}
        </button>
      </div>
      <ErrorNote error={reschedule.error} />
    </form>
  );
}

export default function TransferActions({
  transfer,
}: {
  transfer: TransferDetail;
}) {
  const actions = transfer.allowedActions;
  const action = useTransferAction();

  const hasAnyAction =
    actions.selfAssign ||
    actions.assignDriver ||
    actions.reschedule ||
    actions.release ||
    actions.start ||
    actions.deliver ||
    actions.cancel;
  if (!hasAnyAction) return null;

  // When the transfer changes, the forms start again with the new data.
  const formKey = `${transfer.status}-${transfer.driverId}-${transfer.scheduledAt}`;

  function run(
    name: "release" | "start" | "deliver" | "cancel",
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    action.mutate({ id: transfer.id, action: name });
  }

  return (
    <section className="mt-4 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Acciones</h2>

      {(actions.selfAssign || actions.assignDriver) && (
        <AssignPanel key={`assign-${formKey}`} transfer={transfer} />
      )}
      {actions.reschedule && (
        <ReschedulePanel key={`schedule-${formKey}`} transfer={transfer} />
      )}

      <div className="flex flex-wrap gap-2">
        {actions.start && (
          <button
            type="button"
            className={primaryButton}
            disabled={action.isPending}
            onClick={() => run("start")}
          >
            Iniciar traslado
          </button>
        )}
        {actions.deliver && (
          <button
            type="button"
            className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
            disabled={action.isPending}
            onClick={() => run("deliver")}
          >
            Marcar como entregado
          </button>
        )}
        {actions.release && (
          <button
            type="button"
            className={outlineButton}
            disabled={action.isPending}
            onClick={() =>
              run(
                "release",
                "El traslado volverá a estar pendiente y sin gruista. ¿Quieres liberarlo?",
              )
            }
          >
            Liberar traslado
          </button>
        )}
        {actions.cancel && (
          <button
            type="button"
            className="rounded border border-red-600 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
            disabled={action.isPending}
            onClick={() =>
              run(
                "cancel",
                "¿Seguro que quieres cancelar este traslado? No se puede deshacer.",
              )
            }
          >
            Cancelar traslado
          </button>
        )}
      </div>
      <ErrorNote error={action.error} />
    </section>
  );
}
