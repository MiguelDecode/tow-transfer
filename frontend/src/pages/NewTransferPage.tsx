import { Navigate, useNavigate } from "react-router";
import TransferForm from "../components/TransferForm";
import { useMe } from "../hooks/useAuth";
import { useCreateTransfer } from "../hooks/useTransfers";
import { ApiError } from "../lib/api";
import { emptyTransferForm } from "../lib/transferForm";

export default function NewTransferPage() {
  const me = useMe();
  const navigate = useNavigate();
  const createTransfer = useCreateTransfer();

  // Drivers cannot create transfers.
  if (me.data?.role === "DRIVER") {
    return <Navigate to="/transfers" replace />;
  }

  let serverError: string | null = null;
  if (createTransfer.error) {
    serverError =
      createTransfer.error instanceof ApiError &&
      createTransfer.error.status === 409
        ? "Ya existe un traslado activo para este vehículo."
        : "No se pudo crear el traslado. Revisa los datos e inténtalo de nuevo.";
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Nuevo traslado</h1>
      <TransferForm
        defaultValues={emptyTransferForm}
        submitLabel="Enviar solicitud"
        pendingLabel="Enviando…"
        pending={createTransfer.isPending}
        serverError={serverError}
        cancelTo="/transfers"
        onSubmit={(body) =>
          createTransfer.mutate(body, {
            onSuccess: () => void navigate("/transfers"),
          })
        }
      />
    </section>
  );
}
