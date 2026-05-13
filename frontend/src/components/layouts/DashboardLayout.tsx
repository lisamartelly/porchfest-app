import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import ChangePasswordModal from "../ChangePasswordModal";
import InlineSelect from "../ui/InlineSelect";

interface NavItem {
  to: string;
  section: string;
  label: string;
  icon: React.ReactNode;
  superDuperAdminOnly?: boolean;
  ownerOnly?: boolean;
  organizerOnly?: boolean;
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
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
  const defaultSection = activeOrgRole === "reviewer" ? "my-reviews" : "overview";
  const currentSection = searchParams.get("section") || defaultSection;
  const isSuperDuperAdmin = user?.role === "super-duper-admin";
  const isOwner = activeOrgRole === "owner" || isSuperDuperAdmin;
  const isOrganizer = activeOrgRole === "owner" || activeOrgRole === "organizer" || isSuperDuperAdmin;

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
    { to: "/admin", section: "overview", label: "Overview", icon: <NavIcon d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />, organizerOnly: true },
    { to: "/admin?section=bands", section: "bands", label: "Bands", icon: <NavIcon d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />, organizerOnly: true },
    { to: "/admin?section=porches", section: "porches", label: "Porches", icon: <NavIcon d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />, organizerOnly: true },
    { to: "/admin?section=assignments", section: "assignments", label: "Assignments", icon: <NavIcon d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />, organizerOnly: true },
    { to: "/admin?section=my-reviews", section: "my-reviews", label: "My Reviews", icon: <NavIcon d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /> },
    { to: "/admin?section=scheduler", section: "scheduler", label: "Scheduler", icon: <NavIcon d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />, organizerOnly: true },
    { to: "/admin?section=map", section: "map", label: "Map", icon: <NavIcon d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />, organizerOnly: true },
    { to: "/admin?section=events", section: "events", label: "Events", icon: <NavIcon d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />, organizerOnly: true },
    { to: "/admin?section=tasks", section: "tasks", label: "Tasks", icon: <NavIcon d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />, organizerOnly: true },
    { to: "/admin?section=organizations", section: "organizations", label: "Organizations", icon: <NavIcon d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />, superDuperAdminOnly: true },
    { to: "/admin?section=manage-users", section: "manage-users", label: "Manage Users", icon: <NavIcon d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />, ownerOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.superDuperAdminOnly && !isSuperDuperAdmin) return false;
    if (item.ownerOnly && !isOwner) return false;
    if (item.organizerOnly && !isOrganizer) return false;
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
        <div className="p-4 flex flex-col items-stretch flex-shrink-0">
          <div className="flex items-start justify-between">
            <Link to="/admin" className="flex-1 min-w-0">
              <img
                src="/logo.png"
                alt="Porchfest Pal"
                className={`object-contain ${collapsed ? "w-10 h-10" : "w-full"}`}
              />
            </Link>
            <button
              onClick={toggleCollapse}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0 ml-1"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
            {collapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            )}
            </button>
          </div>
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
              <InlineSelect
                label="Organization"
                value={String(activeOrgId ?? "")}
                onChange={(v) => setActiveOrg(Number(v))}
                className="w-full"
                options={organizations.map((org) => ({
                  value: String(org.id),
                  label: org.name,
                }))}
              />
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
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
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
