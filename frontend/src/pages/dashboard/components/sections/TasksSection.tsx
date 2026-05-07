import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../lib/api";
import { formatDate } from "../../../../lib/dateUtils";
import { useOrgStore } from "../../../../stores/orgStore";
import { EventTaskItem, EventTaskCategory, AdminUser } from "../../types";
import FilterPill from "../../../../components/ui/FilterPill";
import InlineSelect from "../../../../components/ui/InlineSelect";
import StatusPill, { TASK_STATUSES } from "../../../../components/ui/StatusPill";

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

  const handleInlineStatusChange = async (eventTaskId: number, status: string) => {
    try {
      await api.patch(`/api/admin/tasks/event-tasks/${eventTaskId}`, { status });
      setEventTasks((prev) =>
        prev.map((et) => (et.id === eventTaskId ? { ...et, status } : et))
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
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
          <form onSubmit={handleAddTask} className="mb-5 bg-white rounded-2xl shadow-sm border border-porch-100 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-porch-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Task
            </h4>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Task Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-all"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-all"
                  />
                </div>
                <InlineSelect
                  label="Assigned To"
                  value={newTaskAssignedUserId}
                  onChange={setNewTaskAssignedUserId}
                  placeholder="Unassigned"
                  options={[
                    { value: "", label: "Unassigned" },
                    ...adminUsers.map((u) => ({
                      value: String(u.id),
                      label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
                    })),
                  ]}
                />
                <InlineSelect
                  label="Category"
                  value={newTaskCategory}
                  onChange={setNewTaskCategory}
                  placeholder="None"
                  options={[
                    { value: "", label: "None" },
                    ...CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABELS[c],
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Notes
                </label>
                <textarea
                  placeholder="Any additional details..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={submitting || !newTaskName.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-porch-600 text-white text-sm font-medium rounded-full hover:bg-porch-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    Adding...
                  </>
                ) : "Add Task"}
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        {eventTasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <FilterPill
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="All Statuses"
              color="porch"
              options={[
                { value: "", label: "All Statuses" },
                ...Object.entries(STATUS_LABELS).map(([val, label]) => ({
                  value: val,
                  label,
                })),
              ]}
            />
            <FilterPill
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="All Categories"
              color="orange"
              options={[
                { value: "", label: "All Categories" },
                ...CATEGORIES.map((c) => ({
                  value: c,
                  label: CATEGORY_LABELS[c],
                })),
              ]}
            />
            <FilterPill
              value={filterAssigned}
              onChange={setFilterAssigned}
              placeholder="All Assignees"
              searchable
              color="rose"
              options={[
                { value: "", label: "All Assignees" },
                { value: "unassigned", label: "Unassigned" },
                ...assignedUserOptions.map((u) => ({
                  value: u.id,
                  label: u.label,
                })),
              ]}
            />
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setFilterCategory("");
                  setFilterAssigned("");
                }}
                className="text-xs text-porch-600 hover:text-porch-800 font-medium ml-1"
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <StatusPill
                          value={et.status || "to_do"}
                          onChange={(v) => handleInlineStatusChange(et.id, v)}
                          options={TASK_STATUSES}
                        />
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
