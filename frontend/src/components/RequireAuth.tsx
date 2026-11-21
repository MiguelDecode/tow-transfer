import { Navigate, Outlet } from "react-router";
import { useMe } from "../hooks/useAuth";

export default function RequireAuth() {
  const me = useMe();

  if (me.isPending) {
    return <p className="p-6 text-slate-600">Cargando…</p>;
  }

  if (me.isError) {
    return (
      <p className="p-6 text-red-700">
        No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.
      </p>
    );
  }

  if (!me.data) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
