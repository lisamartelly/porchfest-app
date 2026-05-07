import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../lib/api";
import { formatDate } from "../../../../lib/dateUtils";
import { useOrgStore } from "../../../../stores/orgStore";
import { EventTaskItem, EventTaskCategory, AdminUser } from "../../types";

interface ActiveEvent {
  id: number;
  name: string;
  date: string;
}

const STATUS_LABELS: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  to_do: "bg-gray-100 text-gray-700",
  in_progress: "bg-porch-100 text-porch-700",
  blocked: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
};

const CATEGORIES: EventTaskCategory[] = [
  "vendors", "bands", "porches", "permits", "volunteers", "website", "merch", "misc",
];

const CATEGORY_LABELS: Record<EventTaskCategory, string> = {
  vendors: "Vendors",
  bands: "Bands",
  porches: "Porches",
  permits: "Permits",
  volunteers: "Volunteers",
  website: "Website",
  merch: "Merch",
  misc: "Misc",
};

const CATEGORY_COLORS: Record<EventTaskCategory, string> = {
  vendors: "bg-porch-100 text-porch-700",
  bands: "bg-pink-100 text-pink-700",
  porches: "bg-orange-100 text-orange-700",
  permits: "bg-amber-100 text-amber-700",
  volunteers: "bg-rose-100 text-rose-700",
  website: "bg-porch-100 text-porch-800",
  merch: "bg-red-100 text-red-700",
  misc: "bg-slate-100 text-slate-600",
};

type SortField = "status" | "category" | "assigned" | "due_date";
type SortDir = "asc" | "desc";

function getAssigneeName(et: EventTaskItem): string {
  return (
    [et.assigned_user_first_name, et.assigned_user_last_name]
      .filter(Boolean)
      .join(" ") ||
    et.assigned_user_email ||
    ""
  );
}

export default function TasksSection() {
  const navigate = useNavigate();
  const { activeOrgId } = useOrgStore();
  const [event, setEvent] = useState<ActiveEvent | null>(null);
  const [eventTasks, setEventTasks] = useState<EventTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskAssignedUserId, setNewTaskAssignedUserId] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const orgQuery = activeOrgId ? `?org_id=${activeOrgId}` : "";

  const fetchActiveEventTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/admin/tasks/active-event-tasks${orgQuery}`);
      setEvent(data.event || null);
      setEventTasks(data.event_tasks || []);
    } catch (error) {
      console.error("Error fetching active event tasks:", error);
      setEvent(null);
      setEventTasks([]);
    } finally {
      setLoading(false);
    }
  }, [orgQuery]);

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
    fetchActiveEventTasks();
    fetchAdminUsers();
  }, [fetchActiveEventTasks, fetchAdminUsers]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post(`/api/admin/tasks/active-event-tasks${orgQuery}`, {
        name: newTaskName.trim(),
        due_date: newTaskDueDate || null,
        notes: newTaskNotes.trim() || null,
        assigned_user_id: newTaskAssignedUserId ? Number(newTaskAssignedUserId) : null,
        category: newTaskCategory || null,
      });
      setNewTaskName("");
      setNewTaskDueDate("");
      setNewTaskNotes("");
      setNewTaskAssignedUserId("");
      setNewTaskCategory("");
      setShowAddForm(false);
      fetchActiveEventTasks();
    } catch (error) {
      setFormError((error as Error).message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (eventTask: EventTaskItem) => {
    navigate(`/admin/tasks/${eventTask.id}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter
  const filtered = eventTasks.filter((et) => {
    if (filterStatus && et.status !== filterStatus) return false;
    if (filterCategory && (et.category || "") !== filterCategory) return false;
    if (filterAssigned) {
      if (filterAssigned === "unassigned") {
        if (et.assigned_user_id) return false;
      } else if (String(et.assigned_user_id) !== filterAssigned) {
        return false;
      }
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;

    if (sortField === "due_date") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return dir * a.due_date.localeCompare(b.due_date);
    }

    if (sortField === "status") {
      const order = ["to_do", "in_progress", "blocked", "done"];
      return dir * (order.indexOf(a.status) - order.indexOf(b.status));
    }

    if (sortField === "category") {
      const catA = a.category || "";
      const catB = b.category || "";
      if (!catA && !catB) return 0;
      if (!catA) return 1;
      if (!catB) return -1;
      return dir * catA.localeCompare(catB);
    }

    if (sortField === "assigned") {
      const nameA = getAssigneeName(a);
      const nameB = getAssigneeName(b);
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return dir * nameA.localeCompare(nameB);
    }

    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300">↕</span>;
    }
    return (
      <span className="ml-1 text-porch-600">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const hasActiveFilters = filterStatus || filterCategory || filterAssigned;

  // Unique assigned users in current tasks for filter dropdown
  const assignedUserOptions = Array.from(
    new Map(
      eventTasks
        .filter((et) => et.assigned_user_id)
        .map((et) => [
          et.assigned_user_id,
          { id: et.assigned_user_id!, label: getAssigneeName(et) },
        ])
    ).values()
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No active event found. Set an event as active in the Events section to
          manage tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {event.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {event.date && formatDate(event.date)} — {eventTasks.length} task{eventTasks.length !== 1 ? "s" : ""}
              {hasActiveFilters ? ` (${sorted.length} shown)` : ""}
            </p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setFormError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-porch-600 text-white hover:bg-porch-700 transition-colors"
          >
            {showAddForm ? "Cancel" : "+ Add Task"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddTask} className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {formError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Task name *"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
                autoFocus
                required
              />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
              />
              <select
                value={newTaskAssignedUserId}
                onChange={(e) => setNewTaskAssignedUserId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
              >
                <option value="">Assigned to...</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                  </option>
                ))}
              </select>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
              >
                <option value="">Category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Notes (optional)"
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                rows={2}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newTaskName.trim()}
                className="px-4 py-2 bg-porch-600 text-white text-sm font-medium rounded-lg hover:bg-porch-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Adding..." : "Add Task"}
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        {eventTasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filters:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-transparent"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {assignedUserOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setFilterCategory("");
                  setFilterAssigned("");
                }}
                className="text-xs text-porch-600 hover:text-porch-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {eventTasks.length === 0 && !showAddForm ? (
          <p className="text-gray-500 text-sm">
            No tasks for this event yet. Click "Add Task" above to get started.
          </p>
        ) : eventTasks.length === 0 ? null : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status<SortIcon field="status" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("category")}
                  >
                    Category<SortIcon field="category" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("assigned")}
                  >
                    Assigned<SortIcon field="assigned" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort("due_date")}
                  >
                    Due Date<SortIcon field="due_date" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      No tasks match the selected filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((et) => (
                    <tr
                      key={et.id}
                      onClick={() => handleRowClick(et)}
                      className="hover:bg-porch-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {et.name || et.task_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            STATUS_COLORS[et.status || "to_do"] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STATUS_LABELS[et.status || "to_do"] || et.status || "To Do"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {et.category ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              CATEGORY_COLORS[et.category]
                            }`}
                          >
                            {CATEGORY_LABELS[et.category]}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getAssigneeName(et) || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {et.due_date ? formatDate(et.due_date) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
