import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import TransferTable from "../components/TransferTable";
import { useMe } from "../hooks/useAuth";
import { useCenters } from "../hooks/useCenters";
import { useDrivers } from "../hooks/useDrivers";
import { useTransfers } from "../hooks/useTransfers";
import { statusLabels, urgencyLabels } from "../lib/labels";
import type { TransferStatus, Urgency } from "../lib/types";

const PAGE_SIZE = 10;
const statuses = Object.keys(statusLabels) as TransferStatus[];
const urgencies = Object.keys(urgencyLabels) as Urgency[];

const fieldClass =
  "mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm";
const buttonClass =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50";

function positiveInt(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {children}
      </select>
    </div>
  );
}

export default function TransfersPage() {
  const me = useMe();
  const role = me.data?.role;
  const isStaff = role === "ADMIN" || role === "MANAGER";

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters live in the URL, so reloading or sharing the link keeps them.
  const rawStatus = searchParams.get("status");
  const rawUrgency = searchParams.get("urgency");
  const status = statuses.find((s) => s === rawStatus);
  const urgency = urgencies.find((u) => u === rawUrgency);
  const centerId = positiveInt(searchParams.get("centerId"));
  const driverId = positiveInt(searchParams.get("driverId"));
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const centers = useCenters();
  const drivers = useDrivers(isStaff);
  const { data, isPending, isError, isFetching } = useTransfers({
    status,
    urgency,
    centerId,
    driverId,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }

  // Changing a filter goes back to the first page.
  const setFilter = (key: string) => (value: string) =>
    updateParams({ [key]: value || null, page: null });

  const title = role === "REQUESTER" ? "Mis traslados" : "Traslados";
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const hasFilters =
    status !== undefined ||
    urgency !== undefined ||
    centerId !== undefined ||
    driverId !== undefined ||
    q !== "";

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {role && role !== "DRIVER" && (
          <Link
            to="/transfers/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nuevo traslado
          </Link>
        )}
      </div>

      <div className="mt-4 mb-4 flex flex-wrap items-end gap-4">
        <FilterSelect
          id="status"
          label="Estado"
          value={status ?? ""}
          onChange={setFilter("status")}
        >
          <option value="">Todos</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="urgency"
          label="Urgencia"
          value={urgency ?? ""}
          onChange={setFilter("urgency")}
        >
          <option value="">Todas</option>
          {urgencies.map((value) => (
            <option key={value} value={value}>
              {urgencyLabels[value]}
            </option>
          ))}
        </FilterSelect>

        {isStaff && (
          <FilterSelect
            id="centerId"
            label="Centro"
            value={centerId ? String(centerId) : ""}
            onChange={setFilter("centerId")}
          >
            <option value="">Todos</option>
            {(centers.data ?? []).map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </FilterSelect>
        )}

        {isStaff && (
          <FilterSelect
            id="driverId"
            label="Gruista"
            value={driverId ? String(driverId) : ""}
            onChange={setFilter("driverId")}
          >
            <option value="">Todos</option>
            {(drivers.data ?? []).map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </FilterSelect>
        )}

        <form
          role="search"
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            updateParams({
              q: typeof value === "string" ? value.trim() : null,
              page: null,
            });
          }}
        >
          <div>
            <label
              htmlFor="q"
              className="block text-sm font-medium text-slate-700"
            >
              Buscar
            </label>
            <input
              id="q"
              name="q"
              key={q}
              defaultValue={q}
              placeholder="Matrícula, chasis, marca o modelo"
              className={`${fieldClass} w-72`}
            />
          </div>
          <button type="submit" className={buttonClass}>
            Buscar
          </button>
        </form>

        {hasFilters && (
          <button
            type="button"
            className="pb-2 text-sm text-blue-700 hover:underline"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            Quitar filtros
          </button>
        )}

        {isFetching && !isPending && (
          <span className="pb-2 text-sm text-slate-500">Actualizando…</span>
        )}
      </div>

      {isPending && <p className="text-slate-600">Cargando traslados…</p>}

      {isError && (
        <p
          role="alert"
          className="rounded bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          No se pudieron cargar los traslados. Inténtalo de nuevo.
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-slate-600">
          {hasFilters
            ? "No hay traslados que coincidan con los filtros."
            : "Todavía no hay traslados."}
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <TransferTable transfers={data.items} staffView={isStaff} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-slate-600">
              {data.total} {data.total === 1 ? "traslado" : "traslados"} ·
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Anterior
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
