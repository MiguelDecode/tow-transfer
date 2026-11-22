import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { StatusBadge, UrgencyBadge } from "../components/Badges";
import TransferActions from "../components/TransferActions";
import { useTransfer } from "../hooks/useTransfers";
import { ApiError } from "../lib/api";
import { formatDateTime } from "../lib/format";

function Info({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export default function TransferDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const transfer = useTransfer(id);

  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/transfers" replace />;
  }

  const backLink = (
    <Link to="/transfers" className="text-sm text-blue-700 hover:underline">
      ← Volver a los traslados
    </Link>
  );

  if (transfer.isPending) {
    return <p className="text-slate-600">Cargando traslado…</p>;
  }

  if (transfer.isError || !transfer.data) {
    const notFound =
      transfer.error instanceof ApiError && transfer.error.status === 404;
    return (
      <section>
        {backLink}
        <p
          role="alert"
          className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {notFound
            ? "No se encontró el traslado."
            : "No se pudo cargar el traslado."}
        </p>
      </section>
    );
  }

  const t = transfer.data;

  return (
    <section className="mx-auto max-w-3xl">
      {backLink}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{t.plate ?? t.vin}</h1>
          <StatusBadge status={t.status} />
        </div>
        {t.allowedActions.edit && (
          <Link
            to={`/transfers/${t.id}/edit`}
            className="rounded border border-blue-600 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            Editar datos
          </Link>
        )}
      </div>

      <TransferActions transfer={t} />

      <dl className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <Info label="Matrícula">{t.plate ?? "—"}</Info>
        <Info label="Chasis">{t.vin ?? "—"}</Info>
        <Info label="Vehículo">
          {t.brand} {t.model}
        </Info>
        <Info label="Urgencia">
          <UrgencyBadge urgency={t.urgency} />
        </Info>
        <Info label="Centro de recogida">{t.originCenter.name}</Info>
        <Info label="Centro de entrega">{t.destinationCenter.name}</Info>
        <Info label="Solicitante">{t.requester.name}</Info>
        <Info label="Gruista">{t.driver?.name ?? "Sin asignar"}</Info>
        <Info label="Fecha solicitada">{formatDateTime(t.requestedAt)}</Info>
        <Info label="Fecha asignada">{formatDateTime(t.scheduledAt)}</Info>
        <Info label="Creada">{formatDateTime(t.createdAt)}</Info>
        <Info label="Observaciones" className="sm:col-span-2">
          {t.notes ?? "—"}
        </Info>
      </dl>

      <h2 className="mt-6 text-lg font-semibold">Historial</h2>
      <ol className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {t.history.map((entry, index) => (
          <li
            key={index}
            className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
          >
            <StatusBadge status={entry.status} />
            <span>{formatDateTime(entry.changedAt)}</span>
            <span className="text-slate-500">por {entry.changedBy.name}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
