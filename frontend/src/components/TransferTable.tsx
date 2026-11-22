import { Fragment, useState } from "react";
import { Link } from "react-router";
import { formatDateTime } from "../lib/format";
import type { Transfer } from "../lib/types";
import { StatusBadge, UrgencyBadge } from "./Badges";

const headerClass = "px-4 py-3 font-medium";

type Props = {
  transfers: Transfer[];
  // Managers and admins also see the urgency and the requester.
  staffView?: boolean;
};

export default function TransferTable({ transfers, staffView = false }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const columns = staffView ? 9 : 7;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className={headerClass}>Matrícula / Chasis</th>
            <th className={headerClass}>Vehículo</th>
            <th className={headerClass}>Recogida → Entrega</th>
            {staffView && <th className={headerClass}>Urgencia</th>}
            {staffView && <th className={headerClass}>Solicitante</th>}
            <th className={headerClass}>Gruista</th>
            <th className={headerClass}>Fecha asignada</th>
            <th className={headerClass}>Estado</th>
            <th className={headerClass}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {transfers.map((transfer) => {
            const expanded = expandedId === transfer.id;
            return (
              <Fragment key={transfer.id}>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    {transfer.plate ?? transfer.vin}
                    {transfer.plate && transfer.vin && (
                      <div className="text-xs font-normal text-slate-500">
                        {transfer.vin}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {transfer.brand} {transfer.model}
                  </td>
                  <td className="px-4 py-3">
                    {transfer.originCenter.name} →{" "}
                    {transfer.destinationCenter.name}
                  </td>
                  {staffView && (
                    <td className="px-4 py-3">
                      <UrgencyBadge urgency={transfer.urgency} />
                    </td>
                  )}
                  {staffView && (
                    <td className="px-4 py-3">{transfer.requester.name}</td>
                  )}
                  <td className="px-4 py-3">{transfer.driver?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatDateTime(transfer.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={transfer.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {staffView &&
                      transfer.status === "PENDING" &&
                      transfer.allowedActions.assignDriver && (
                        <Link
                          to={`/transfers/${transfer.id}`}
                          className="mr-2 inline-block whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                        >
                          Asignar
                        </Link>
                      )}
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        setExpandedId(expanded ? null : transfer.id)
                      }
                      className="whitespace-nowrap rounded border border-blue-600 px-3 py-1.5 text-blue-700 hover:bg-blue-50"
                    >
                      {expanded ? "Ocultar información" : "Más información"}
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr className="bg-slate-50">
                    <td colSpan={columns} className="px-4 py-3">
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-medium text-slate-500">
                            Creada
                          </dt>
                          <dd>{formatDateTime(transfer.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500">
                            Fecha solicitada
                          </dt>
                          <dd>{formatDateTime(transfer.requestedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500">
                            Urgencia
                          </dt>
                          <dd>
                            <UrgencyBadge urgency={transfer.urgency} />
                          </dd>
                        </div>
                        <div className="sm:col-span-3">
                          <dt className="text-xs font-medium text-slate-500">
                            Observaciones
                          </dt>
                          <dd>{transfer.notes ?? "—"}</dd>
                        </div>
                        <div className="sm:col-span-3">
                          <Link
                            to={`/transfers/${transfer.id}`}
                            className="text-blue-700 hover:underline"
                          >
                            Ver detalle e historial →
                          </Link>
                        </div>
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
