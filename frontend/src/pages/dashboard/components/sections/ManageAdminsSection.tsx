import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";
import { OrgSummary, AdminUser } from "../../types";

export default function ManageAdminsSection() {
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    role: "user",
    organization_id: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    fetchAdminUsers();
    fetchOrganizations();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const users = await api.get("/api/admin/users");
      setAdminUsers(users || []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.get("/api/admin/organizations");
      setOrganizations(orgs || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    try {
      await api.post("/api/admin/users", newAdminForm);
      setFormSuccess(true);
      setNewAdminForm({
        email: "",
        password: "",
        role: "user",
        organization_id: "",
      });
      fetchAdminUsers();
    } catch (error) {
      setFormError(
        (error as Error).message || "Failed to create admin",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Create New Admin
        </h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Admin user created successfully!
          </div>
        )}

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={newAdminForm.email}
                onChange={(e) =>
                  setNewAdminForm({
                    ...newAdminForm,
                    email: e.target.value,
                  })
                }
                className="input-field"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={newAdminForm.password}
                onChange={(e) =>
                  setNewAdminForm({
                    ...newAdminForm,
                    password: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={newAdminForm.role}
                onChange={(e) =>
                  setNewAdminForm({
                    ...newAdminForm,
                    role: e.target.value,
                  })
                }
                className="input-field"
              >
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Organization
              </label>
              <select
                value={newAdminForm.organization_id}
                onChange={(e) =>
                  setNewAdminForm({
                    ...newAdminForm,
                    organization_id: e.target.value,
                  })
                }
                className="input-field"
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
          >
            Create Admin
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">All Users</h3>
        {adminUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Organizations
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === "super-duper-admin"
                            ? "bg-purple-100 text-purple-700"
                            : u.role === "user"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {u.organizations.length > 0
                        ? u.organizations.map((o) => o.name).join(", ")
                        : "\u2014"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
