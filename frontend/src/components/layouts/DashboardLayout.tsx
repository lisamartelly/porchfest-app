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
  ownerOnly?: boolean;
}

const SIDEBAR_KEY = "sidebar_collapsed";

export default function DashboardLayout() {
  const { user, signOut } = useAuthStore();
  const {
    organizations,
    activeOrgId,
    activeOrgRole,
    loading: orgLoading,
    initialize: initOrg,
    setActiveOrg,
  } = useOrgStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "true"
  );
  const currentSection = searchParams.get("section") || "overview";
  const isSuperDuperAdmin = user?.role === "super-duper-admin";
  const isOwner = activeOrgRole === "owner" || isSuperDuperAdmin;

  useEffect(() => {
    initOrg();
  }, [initOrg]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

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
    { to: "/admin?section=manage-users", section: "manage-users", label: "Manage Users", icon: "👤", ownerOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.superDuperAdminOnly && !isSuperDuperAdmin) return false;
    if (item.ownerOnly && !isOwner) return false;
    return true;
  });

  const isActive = (item: NavItem) => {
    if (item.section === "overview") {
      return location.pathname === "/admin" && !searchParams.get("section");
    }
    return currentSection === item.section;
  };

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const mainMargin = collapsed ? "ml-16" : "ml-64";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${sidebarWidth} bg-white border-r border-gray-200 fixed h-full flex flex-col transition-all duration-200`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between flex-shrink-0">
          <Link to="/admin" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-porch-500 to-porch-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base">🎵</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-porch-800 truncate">
                Porchfest
              </span>
            )}
          </Link>
          <button
            onClick={toggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Org switcher */}
        {!orgLoading && organizations.length > 0 && !collapsed && (
          <div className="px-3 pb-2 flex-shrink-0">
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

        {!collapsed && (
          <div className="px-4 py-2 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {visibleNavItems.map((item) => (
            <Link
              key={item.section}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item)
                  ? "bg-porch-100 text-porch-700"
                  : "text-gray-600 hover:bg-gray-100"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-porch-200 rounded-full flex items-center justify-center">
                <span className="text-porch-700 font-semibold text-xs">
                  {(user?.first_name?.charAt(0) || user?.email?.charAt(0) || "").toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => {
                  useOrgStore.getState().reset();
                  signOut();
                }}
                title="Sign Out"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors text-xs"
              >
                ↩
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-porch-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-porch-700 font-semibold text-sm">
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
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Change Password
                </button>
                <button
                  onClick={() => {
                    useOrgStore.getState().reset();
                    signOut();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      <main className={`flex-1 ${mainMargin} transition-all duration-200`}>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
