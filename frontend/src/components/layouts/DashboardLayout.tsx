import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import ChangePasswordModal from "../ChangePasswordModal";

interface NavItem {
  to: string;
  section: string;
  label: string;
  icon: string;
  superDuperAdminOnly?: boolean;
}

export default function DashboardLayout() {
  const { user, signOut } = useAuthStore();
  const {
    organizations,
    activeOrgId,
    loading: orgLoading,
    initialize: initOrg,
    setActiveOrg,
  } = useOrgStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const currentSection = searchParams.get("section") || "overview";
  const isSuperDuperAdmin = user?.role === "super-duper-admin";

  useEffect(() => {
    initOrg();
  }, [initOrg]);

  const navItems: NavItem[] = [
    { to: "/admin", section: "overview", label: "Overview", icon: "🏠" },
    { to: "/admin?section=bands", section: "bands", label: "Bands", icon: "🎸" },
    { to: "/admin?section=porches", section: "porches", label: "Porches", icon: "🏡" },
    { to: "/admin?section=assignments", section: "assignments", label: "Assignments", icon: "👥" },
    { to: "/admin?section=my-reviews", section: "my-reviews", label: "My Reviews", icon: "⭐" },
    { to: "/admin?section=scheduler", section: "scheduler", label: "Scheduler", icon: "📅" },
    { to: "/admin?section=events", section: "events", label: "Events", icon: "🗓️" },
    { to: "/admin?section=tasks", section: "tasks", label: "Tasks", icon: "✅" },
    { to: "/admin?section=organizations", section: "organizations", label: "Organizations", icon: "🏢", superDuperAdminOnly: true },
    { to: "/admin?section=manage-admins", section: "manage-admins", label: "Manage Admins", icon: "🔑", superDuperAdminOnly: true },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.superDuperAdminOnly || isSuperDuperAdmin
  );

  const isActive = (item: NavItem) => {
    if (item.section === "overview") {
      return location.pathname === "/admin" && !searchParams.get("section");
    }
    return currentSection === item.section;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
        <div className="p-6">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-porch-500 to-porch-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🎵</span>
            </div>
            <span className="text-xl font-bold text-porch-800">
              Porchfest
            </span>
          </Link>
        </div>

        {!orgLoading && organizations.length > 0 && (
          <div className="px-4 pb-3">
            {organizations.length === 1 ? (
              <div className="px-3 py-2 bg-porch-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                  Organization
                </p>
                <p className="text-sm font-medium text-porch-800 truncate">
                  {organizations[0].name}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                  Organization
                </label>
                <select
                  value={activeOrgId ?? ""}
                  onChange={(e) => setActiveOrg(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-medium text-porch-800 bg-porch-50 border border-porch-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-porch-500 cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Admin Panel
          </p>
        </div>

        <nav className="px-4 space-y-1">
          {visibleNavItems.map((item) => (
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-porch-200 rounded-full flex items-center justify-center">
              <span className="text-porch-700 font-semibold">
                {(user?.first_name?.charAt(0) || user?.email?.charAt(0) || "").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={() => {
                useOrgStore.getState().reset();
                signOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      <main className="flex-1 ml-64">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
