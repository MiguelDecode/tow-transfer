import { Link, Navigate, useNavigate, useParams } from "react-router";
import TransferForm from "../components/TransferForm";
import { useTransfer, useUpdateTransfer } from "../hooks/useTransfers";
import { ApiError } from "../lib/api";
import { toFormValues } from "../lib/transferForm";

export default function EditTransferPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const transfer = useTransfer(id);
  const update = useUpdateTransfer(id);

  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/transfers" replace />;
  }
  if (transfer.isPending) {
    return <p className="text-slate-600">Cargando traslado…</p>;
  }
  if (transfer.isError || !transfer.data) {
    return (
      <section>
        <Link to="/transfers" className="text-sm text-blue-700 hover:underline">
          ← Volver a los traslados
        </Link>
        <p
          role="alert"
          className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          No se pudo cargar el traslado.
        </p>
      </section>
    );
  }
  // Nobody edits a transfer they are not allowed to edit.
  if (!transfer.data.allowedActions.edit) {
    return <Navigate to={`/transfers/${id}`} replace />;
  }

  let serverError: string | null = null;
  if (update.error) {
    if (update.error instanceof ApiError && update.error.status === 409) {
      serverError =
        "No se pudo guardar: el vehículo ya tiene otro traslado activo o el traslado ha cambiado.";
    } else if (
      update.error instanceof ApiError &&
      update.error.status === 403
    ) {
      serverError = "Ya no puedes editar este traslado: ha cambiado de estado.";
    } else {
      serverError =
        "No se pudo guardar el traslado. Revisa los datos e inténtalo de nuevo.";
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Editar traslado</h1>
      <TransferForm
        defaultValues={toFormValues(transfer.data)}
        allowPastDate
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        pending={update.isPending}
        serverError={serverError}
        cancelTo={`/transfers/${id}`}
        onSubmit={(body) =>
          update.mutate(body, {
            onSuccess: () => void navigate(`/transfers/${id}`),
          })
        }
      />
    </section>
  );
}
