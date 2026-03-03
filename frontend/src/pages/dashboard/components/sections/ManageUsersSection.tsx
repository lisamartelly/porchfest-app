import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { useOrgStore } from "../../../../stores/orgStore";

interface OrgUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  org_role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  organizer: "Organizer",
  reviewer: "Reviewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  organizer: "bg-blue-100 text-blue-700",
  reviewer: "bg-amber-100 text-amber-700",
};

interface EditState {
  email: string;
  first_name: string;
  last_name: string;
  org_role: string;
  new_password: string;
}

export default function ManageUsersSection() {
  const { activeOrgId } = useOrgStore();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    org_role: "organizer",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditState>({
    email: "",
    first_name: "",
    last_name: "",
    org_role: "organizer",
    new_password: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      const data = await api.get(`/api/admin/users?org_id=${activeOrgId}`);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [activeOrgId]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!activeOrgId) {
      setFormError("No organization selected");
      return;
    }
    try {
      await api.post("/api/admin/users", {
        ...newUserForm,
        organization_id: activeOrgId,
      });
      setFormSuccess(true);
      setNewUserForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        org_role: "organizer",
      });
      fetchUsers();
    } catch (error) {
      setFormError((error as Error).message || "Failed to create user");
    }
  };

  const startEditing = (u: OrgUser) => {
    setEditingUserId(u.id);
    setEditForm({
      email: u.email,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      org_role: u.org_role,
      new_password: "",
    });
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!activeOrgId || !editingUserId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: Record<string, string> = {
        email: editForm.email,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        org_role: editForm.org_role,
      };
      if (editForm.new_password) {
        payload.new_password = editForm.new_password;
      }
      const updated: OrgUser = await api.patch(
        `/api/admin/users/${editingUserId}?org_id=${activeOrgId}`,
        payload
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUserId(null);
    } catch (error) {
      setEditError((error as Error).message || "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">Add User</h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            User added successfully!
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={newUserForm.first_name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, first_name: e.target.value })
                }
                className="input-field"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={newUserForm.last_name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, last_name: e.target.value })
                }
                className="input-field"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, email: e.target.value })
                }
                className="input-field"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, password: e.target.value })
                }
                className="input-field"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={newUserForm.org_role}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, org_role: e.target.value })
              }
              className="input-field max-w-xs"
            >
              <option value="owner">Owner</option>
              <option value="organizer">Organizer</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
          >
            Add User
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">Users</h3>
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Added
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td
                      className="py-3 px-4 text-gray-900"
                      colSpan={editingUserId === u.id ? 5 : undefined}
                    >
                      {editingUserId === u.id ? (
                        <div className="py-2">
                          {editError && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                              {editError}
                            </div>
                          )}
                          <div className="grid md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                value={editForm.first_name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, first_name: e.target.value })
                                }
                                className="input-field text-sm"
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                value={editForm.last_name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, last_name: e.target.value })
                                }
                                className="input-field text-sm"
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Email
                              </label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, email: e.target.value })
                                }
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Role
                              </label>
                              <select
                                value={editForm.org_role}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, org_role: e.target.value })
                                }
                                className="input-field text-sm"
                              >
                                <option value="owner">Owner</option>
                                <option value="organizer">Organizer</option>
                                <option value="reviewer">Reviewer</option>
                              </select>
                            </div>
                          </div>
                          <div className="mb-3 max-w-sm">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={editForm.new_password}
                              onChange={(e) =>
                                setEditForm({ ...editForm, new_password: e.target.value })
                              }
                              className="input-field text-sm"
                              placeholder="Leave blank to keep current"
                              minLength={6}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={editSaving}
                              className="px-4 py-1.5 bg-porch-600 text-white text-sm font-medium rounded-lg hover:bg-porch-700 disabled:opacity-50 transition-colors"
                            >
                              {editSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        [u.first_name, u.last_name].filter(Boolean).join(" ") || "—"
                      )}
                    </td>
                    {editingUserId !== u.id && (
                      <>
                        <td className="py-3 px-4 text-gray-900">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ROLE_COLORS[u.org_role] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {ROLE_LABELS[u.org_role] || u.org_role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => startEditing(u)}
                            className="text-porch-600 hover:text-porch-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
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
