import { Outlet, Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function DashboardLayout() {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentSection = searchParams.get("section") || "overview";

  const navItems = [
    { to: "/admin", section: "overview", label: "Overview", icon: "🏠" },
    { to: "/admin?section=bands", section: "bands", label: "Bands", icon: "🎸" },
    { to: "/admin?section=porches", section: "porches", label: "Porches", icon: "🏡" },
    { to: "/admin?section=scheduler", section: "scheduler", label: "Scheduler", icon: "📅" },
    { to: "/admin?section=settings", section: "settings", label: "Event Settings", icon: "⚙️" },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.section === "overview") {
      return location.pathname === "/admin" && !searchParams.get("section");
    }
    return currentSection === item.section;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-porch-500 to-porch-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🎵</span>
            </div>
            <span className="font-display text-xl font-bold text-porch-800">
              Porchfest
            </span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Admin Panel
          </p>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.section}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item)
                  ? "bg-porch-100 text-porch-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-porch-200 rounded-full flex items-center justify-center">
              <span className="text-porch-700 font-semibold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
