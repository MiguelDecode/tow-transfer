import { NavLink, Outlet } from "react-router";
import { useLogout, useMe } from "../hooks/useAuth";
import { roleLabels } from "../lib/labels";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-2 text-sm font-medium ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Layout() {
  const me = useMe();
  const logout = useLogout();
  const user = me.data;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold">Tow Transfer</span>
            <nav className="flex gap-1">
              <NavLink to="/transfers" className={linkClass}>
                Traslados
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <NavLink to="/account" className={linkClass}>
              {user.name} ·{" "}
              <span className="text-slate-500">{roleLabels[user.role]}</span>
            </NavLink>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
