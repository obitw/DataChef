import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import HealthBadge from "./HealthBadge";

const navItems = [
  { to: "/datasources", label: "Datasources" },
  { to: "/jobs", label: "Jobs" },
  { to: "/groups", label: "Groupes" },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-xl font-bold text-indigo-600">DataChef</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200 space-y-3">
          <HealthBadge />
          <button
            onClick={logout}
            className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
