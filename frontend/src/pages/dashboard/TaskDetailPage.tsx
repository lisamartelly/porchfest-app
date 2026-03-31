import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import {
  EventTaskItem,
  EventTaskStatus,
  TaskContact,
  AdminUser,
} from "./types";

interface TaskDetailResponse extends EventTaskItem {
  history: Array<EventTaskItem & { event_name?: string; event_date?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  to_do: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
};

const STATUSES: EventTaskStatus[] = ["to_do", "in_progress", "blocked", "done"];

export default function TaskDetailPage() {
  const { eventTaskId } = useParams<{ eventTaskId: string }>();
  const { user } = useAuthStore();
  const { activeOrgRole } = useOrgStore();
  const isSuperDuperAdmin = user?.role === "super-duper-admin";
  const isOrganizer = activeOrgRole === "owner" || activeOrgRole === "organizer" || isSuperDuperAdmin;

  const [taskDetail, setTaskDetail] = useState<TaskDetailResponse | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  const [localName, setLocalName] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    notes: "",
  });
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    notes: "",
  });

  const fetchTaskDetail = useCallback(async () => {
    if (!eventTaskId) return;
    setLoading(true);
    try {
      const data = await api.get(`/api/admin/tasks/event-tasks/${eventTaskId}`);
      setTaskDetail(data);
    } catch (error) {
      console.error("Error fetching task detail:", error);
    } finally {
      setLoading(false);
    }
  }, [eventTaskId]);

  const { activeOrgId } = useOrgStore();

  const fetchAdminUsers = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      const users: AdminUser[] = await api.get(`/api/admin/users?org_id=${activeOrgId}`);
      const ownersAndOrganizers = (users || []).filter(
        (u) => u.org_role === "owner" || u.org_role === "organizer"
      );
      setAdminUsers(ownersAndOrganizers);
    } catch {
      setAdminUsers([]);
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (eventTaskId) {
      fetchTaskDetail();
      fetchAdminUsers();
    }
  }, [eventTaskId, fetchTaskDetail, fetchAdminUsers]);

  useEffect(() => {
    if (taskDetail) {
      setLocalName(taskDetail.name || "");
      setLocalNotes(taskDetail.notes || "");
    }
  }, [taskDetail]);

  const patchField = async (updates: Record<string, unknown>) => {
    if (!eventTaskId) return;
    try {
      const updated = await api.patch(
        `/api/admin/tasks/event-tasks/${eventTaskId}`,
        updates
      );
      setTaskDetail((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleRecurringToggle = async (recurring: boolean) => {
    if (!taskDetail) return;
    try {
      await api.patch(`/api/admin/tasks/${taskDetail.task_id}`, { recurring });
      setTaskDetail((prev) => (prev ? { ...prev, recurring } : null));
    } catch (error) {
      console.error("Error updating recurring:", error);
    }
  };

  const handleNameChange = (value: string) => {
    setLocalName(value);
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => {
      patchField({ name: value || null });
    }, 600);
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      patchField({ notes: value || null });
    }, 600);
  };

  const handleAddContact = async () => {
    if (!eventTaskId || !newContact.name.trim()) return;
    try {
      const contact = await api.post(
        `/api/admin/tasks/event-tasks/${eventTaskId}/contacts`,
        {
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          business: newContact.business || null,
          notes: newContact.notes || null,
        }
      );
      setTaskDetail((prev) =>
        prev
          ? { ...prev, contacts: [...(prev.contacts || []), contact] }
          : null
      );
      setNewContact({ name: "", email: "", phone: "", business: "", notes: "" });
      setAddingContact(false);
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const handleUpdateContact = async (contactId: number) => {
    try {
      const updated = await api.patch(
        `/api/admin/tasks/contacts/${contactId}`,
        editContactForm
      );
      setTaskDetail((prev) =>
        prev
          ? {
              ...prev,
              contacts: prev.contacts.map((c) =>
                c.id === contactId ? updated : c
              ),
            }
          : null
      );
      setEditingContactId(null);
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await api.delete(`/api/admin/tasks/contacts/${contactId}`);
      setTaskDetail((prev) =>
        prev
          ? {
              ...prev,
              contacts: prev.contacts.filter((c) => c.id !== contactId),
            }
          : null
      );
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };

  if (!isOrganizer) {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600" />
      </div>
    );
  }

  if (!taskDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Task not found.</p>
        <Link
          to="/admin?section=tasks"
          className="text-porch-600 hover:text-porch-700 mt-2 inline-block"
        >
          Back to Tasks
        </Link>
      </div>
    );
  }

  const dueStr = taskDetail.due_date
    ? new Date(taskDetail.due_date).toISOString().split("T")[0]
    : "";

  const pastHistory = (taskDetail.history || []).filter(
    (item) => item.id !== taskDetail.id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin?section=tasks"
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Back to Tasks
        </Link>
      </div>

      {/* Editable current task */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name
          </label>
          <input
            type="text"
            value={localName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={taskDetail.task_name}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
          />
          {localName && localName !== taskDetail.task_name && (
            <p className="text-xs text-gray-400 mt-1">
              Template: {taskDetail.task_name}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={taskDetail.status}
              onChange={(e) => patchField({ status: e.target.value })}
              className="input-field"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taskDetail.recurring}
                onChange={(e) => handleRecurringToggle(e.target.checked)}
                className="w-4 h-4 text-porch-600 rounded border-gray-300 focus:ring-porch-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Recurring
              </span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              value={taskDetail.assigned_user_id || ""}
              onChange={(e) =>
                patchField({
                  assigned_user_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="input-field"
            >
              <option value="">Unassigned</option>
              {adminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueStr}
              onChange={(e) =>
                patchField({ due_date: e.target.value || null })
              }
              className="input-field"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="input-field min-h-[100px]"
            placeholder="Add notes about this task..."
          />
        </div>

        {/* Contacts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Contacts</h3>
            {!addingContact && (
              <button
                onClick={() => setAddingContact(true)}
                className="text-sm text-porch-600 hover:text-porch-800 font-medium"
              >
                + Add Contact
              </button>
            )}
          </div>

          {taskDetail.contacts && taskDetail.contacts.length > 0 && (
            <div className="space-y-2 mb-3">
              {taskDetail.contacts.map((c: TaskContact) => (
                <div
                  key={c.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {editingContactId === c.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editContactForm.name}
                          onChange={(e) =>
                            setEditContactForm({
                              ...editContactForm,
                              name: e.target.value,
                            })
                          }
                          className="input-field text-sm"
                          placeholder="Name *"
                        />
                        <input
                          type="email"
                          value={editContactForm.email}
                          onChange={(e) =>
                            setEditContactForm({
                              ...editContactForm,
                              email: e.target.value,
                            })
                          }
                          className="input-field text-sm"
                          placeholder="Email"
                        />
                        <input
                          type="tel"
                          value={editContactForm.phone}
                          onChange={(e) =>
                            setEditContactForm({
                              ...editContactForm,
                              phone: e.target.value,
                            })
                          }
                          className="input-field text-sm"
                          placeholder="Phone"
                        />
                        <input
                          type="text"
                          value={editContactForm.business}
                          onChange={(e) =>
                            setEditContactForm({
                              ...editContactForm,
                              business: e.target.value,
                            })
                          }
                          className="input-field text-sm"
                          placeholder="Business"
                        />
                      </div>
                      <input
                        type="text"
                        value={editContactForm.notes}
                        onChange={(e) =>
                          setEditContactForm({
                            ...editContactForm,
                            notes: e.target.value,
                          })
                        }
                        className="input-field text-sm"
                        placeholder="Notes"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateContact(c.id)}
                          className="text-sm text-porch-600 hover:text-porch-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingContactId(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.name}
                          {c.business && (
                            <span className="text-gray-500 font-normal">
                              {" "}
                              — {c.business}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-x-4 text-sm text-gray-500 mt-0.5">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </div>
                        {c.notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            {c.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingContactId(c.id);
                            setEditContactForm({
                              name: c.name,
                              email: c.email || "",
                              phone: c.phone || "",
                              business: c.business || "",
                              notes: c.notes || "",
                            });
                          }}
                          className="text-xs text-gray-400 hover:text-porch-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {addingContact && (
            <div className="p-3 bg-porch-50 rounded-lg border border-porch-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact({ ...newContact, name: e.target.value })
                  }
                  className="input-field text-sm"
                  placeholder="Name *"
                />
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  className="input-field text-sm"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                  className="input-field text-sm"
                  placeholder="Phone"
                />
                <input
                  type="text"
                  value={newContact.business}
                  onChange={(e) =>
                    setNewContact({ ...newContact, business: e.target.value })
                  }
                  className="input-field text-sm"
                  placeholder="Business"
                />
              </div>
              <input
                type="text"
                value={newContact.notes}
                onChange={(e) =>
                  setNewContact({ ...newContact, notes: e.target.value })
                }
                className="input-field text-sm"
                placeholder="Notes"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddContact}
                  disabled={!newContact.name.trim()}
                  className="px-3 py-1.5 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Add Contact
                </button>
                <button
                  onClick={() => {
                    setAddingContact(false);
                    setNewContact({
                      name: "",
                      email: "",
                      phone: "",
                      business: "",
                      notes: "",
                    });
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical event tasks (excluding current) */}
      {pastHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Task History
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Previous instances of this task across events
          </p>
          <div className="space-y-2">
            {pastHistory.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHistoryId(
                      expandedHistoryId === item.id ? null : item.id
                    )
                  }
                  className="w-full text-left p-4 bg-gray-50 hover:bg-porch-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">
                      {expandedHistoryId === item.id ? "▼" : "▶"}
                    </span>
                    <span className="font-medium text-gray-900">
                      {item.event_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.event_date
                        ? new Date(item.event_date).toLocaleDateString()
                        : ""}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[item.status] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                </button>
                {expandedHistoryId === item.id && (
                  <div className="p-4 border-t border-gray-200 space-y-3">
                    {item.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Notes
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {item.notes}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Assigned
                        </p>
                        <p className="text-gray-900 mt-0.5">
                          {[item.assigned_user_first_name, item.assigned_user_last_name].filter(Boolean).join(" ") || item.assigned_user_email || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Due Date
                        </p>
                        <p className="text-gray-900 mt-0.5">
                          {item.due_date
                            ? new Date(item.due_date).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                    {item.contacts && item.contacts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          Contacts
                        </p>
                        <div className="space-y-2">
                          {item.contacts.map((c: TaskContact) => (
                            <div
                              key={c.id}
                              className="p-2 bg-gray-50 rounded text-sm"
                            >
                              <p className="font-medium text-gray-900">
                                {c.name}
                                {c.business && (
                                  <span className="text-gray-500">
                                    {" "}
                                    — {c.business}
                                  </span>
                                )}
                              </p>
                              {(c.email || c.phone) && (
                                <p className="text-gray-500 text-xs mt-0.5">
                                  {[c.email, c.phone]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
