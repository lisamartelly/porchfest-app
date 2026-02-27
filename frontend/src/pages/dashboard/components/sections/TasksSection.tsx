import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import {
  EventWithOrg,
  OrgSummary,
  TaskTemplate,
  EventTaskItem,
  TaskContact,
  AdminUser,
} from "../../types";

export default function TasksSection() {
  const [myEvents, setMyEvents] = useState<EventWithOrg[]>([]);
  const [, setMyOrgs] = useState<OrgSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [orgTasks, setOrgTasks] = useState<TaskTemplate[]>([]);
  const [eventTasks, setEventTasks] = useState<EventTaskItem[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [historyTaskId, setHistoryTaskId] = useState<number | null>(null);
  const [historyItems, setHistoryItems] = useState<EventTaskItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskRecurring, setEditTaskRecurring] = useState(false);

  const [addingEventTaskId, setAddingEventTaskId] = useState<number | null>(null);

  const [contactForm, setContactForm] = useState<{
    eventTaskId: number | null;
    name: string;
    email: string;
    phone: string;
    business: string;
    notes: string;
  }>({ eventTaskId: null, name: "", email: "", phone: "", business: "", notes: "" });

  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    notes: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [events, orgs] = await Promise.all([
        api.get("/api/admin/my-events"),
        api.get("/api/admin/my-organizations"),
      ]);
      setMyEvents(events || []);
      setMyOrgs(orgs || []);

      try {
        const users = await api.get("/api/admin/users");
        setAdminUsers(users || []);
      } catch {
        setAdminUsers([]);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchOrgTasks = useCallback(async (orgId: number) => {
    try {
      const tasks = await api.get(`/api/admin/tasks/org/${orgId}`);
      setOrgTasks(tasks || []);
    } catch (error) {
      console.error("Error fetching org tasks:", error);
    }
  }, []);

  const fetchEventTasks = useCallback(async (eventId: number) => {
    try {
      const tasks = await api.get(`/api/admin/tasks/event/${eventId}`);
      setEventTasks(tasks || []);
    } catch (error) {
      console.error("Error fetching event tasks:", error);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgTasks(selectedOrgId);
    }
  }, [selectedOrgId, fetchOrgTasks]);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventTasks(selectedEventId);
      const event = myEvents.find((e) => e.id === selectedEventId);
      if (event && event.organization_id !== selectedOrgId) {
        setSelectedOrgId(event.organization_id);
      }
    }
  }, [selectedEventId, fetchEventTasks, myEvents]);

  const handleSelectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    setExpandedTaskId(null);
    setHistoryTaskId(null);
    setGenerateMessage(null);
    const event = myEvents.find((e) => e.id === eventId);
    if (event) {
      setSelectedOrgId(event.organization_id);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim() || !selectedOrgId) return;
    setAddingTask(true);
    try {
      await api.post("/api/admin/tasks", {
        organization_id: selectedOrgId,
        name: newTaskName.trim(),
        recurring: newTaskRecurring,
      });
      setNewTaskName("");
      setNewTaskRecurring(false);
      fetchOrgTasks(selectedOrgId);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleUpdateTask = async (taskId: number) => {
    try {
      await api.patch(`/api/admin/tasks/${taskId}`, {
        name: editTaskName,
        recurring: editTaskRecurring,
      });
      setEditingTaskId(null);
      if (selectedOrgId) fetchOrgTasks(selectedOrgId);
      if (selectedEventId) fetchEventTasks(selectedEventId);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Delete this task and all its event instances?")) return;
    try {
      await api.delete(`/api/admin/tasks/${taskId}`);
      if (selectedOrgId) fetchOrgTasks(selectedOrgId);
      if (selectedEventId) fetchEventTasks(selectedEventId);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAddEventTask = async (parentTaskId: number) => {
    if (!selectedEventId) return;
    try {
      await api.post("/api/admin/tasks/event-tasks", {
        task_id: parentTaskId,
        event_id: selectedEventId,
      });
      setAddingEventTaskId(null);
      fetchEventTasks(selectedEventId);
    } catch (error) {
      console.error("Error adding event task:", error);
    }
  };

  const handleUpdateEventTask = async (
    etId: number,
    updates: { name?: string | null; notes?: string | null; assigned_user_id?: number | null; due_date?: string | null }
  ) => {
    try {
      const updated = await api.patch(`/api/admin/tasks/event-tasks/${etId}`, updates);
      setEventTasks((prev) => prev.map((et) => (et.id === etId ? updated : et)));
    } catch (error) {
      console.error("Error updating event task:", error);
    }
  };

  const handleDeleteEventTask = async (etId: number) => {
    if (!confirm("Remove this task from the event?")) return;
    try {
      await api.delete(`/api/admin/tasks/event-tasks/${etId}`);
      setEventTasks((prev) => prev.filter((et) => et.id !== etId));
    } catch (error) {
      console.error("Error deleting event task:", error);
    }
  };

  const handleAddContact = async (eventTaskId: number) => {
    if (!contactForm.name.trim()) return;
    try {
      const contact = await api.post(
        `/api/admin/tasks/event-tasks/${eventTaskId}/contacts`,
        {
          name: contactForm.name,
          email: contactForm.email || null,
          phone: contactForm.phone || null,
          business: contactForm.business || null,
          notes: contactForm.notes || null,
        }
      );
      setEventTasks((prev) =>
        prev.map((et) =>
          et.id === eventTaskId
            ? { ...et, contacts: [...(et.contacts || []), contact] }
            : et
        )
      );
      setContactForm({ eventTaskId: null, name: "", email: "", phone: "", business: "", notes: "" });
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const handleUpdateContact = async (contactId: number, eventTaskId: number) => {
    try {
      const updated = await api.patch(`/api/admin/tasks/contacts/${contactId}`, editContactForm);
      setEventTasks((prev) =>
        prev.map((et) =>
          et.id === eventTaskId
            ? {
                ...et,
                contacts: et.contacts.map((c: TaskContact) =>
                  c.id === contactId ? updated : c
                ),
              }
            : et
        )
      );
      setEditingContactId(null);
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleDeleteContact = async (contactId: number, eventTaskId: number) => {
    try {
      await api.delete(`/api/admin/tasks/contacts/${contactId}`);
      setEventTasks((prev) =>
        prev.map((et) =>
          et.id === eventTaskId
            ? { ...et, contacts: et.contacts.filter((c: TaskContact) => c.id !== contactId) }
            : et
        )
      );
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };

  const handleGenerateFromPrevious = async () => {
    if (!selectedEventId) return;
    setGenerateMessage(null);
    try {
      const result = await api.post(
        `/api/admin/tasks/generate/${selectedEventId}`,
        {}
      );
      setGenerateMessage(result.message);
      setEventTasks(result.event_tasks);
    } catch (error) {
      setGenerateMessage((error as Error).message || "Failed to generate tasks");
    }
  };

  const handleViewHistory = async (taskId: number) => {
    if (historyTaskId === taskId) {
      setHistoryTaskId(null);
      return;
    }
    setHistoryTaskId(taskId);
    setLoadingHistory(true);
    try {
      const history = await api.get(`/api/admin/tasks/${taskId}/history`);
      setHistoryItems(history || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const unlinkedTasks = orgTasks.filter(
    (t) => !eventTasks.some((et) => et.task_id === t.id)
  );

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Select Event
        </h3>
        <select
          value={selectedEventId || ""}
          onChange={(e) =>
            e.target.value ? handleSelectEvent(Number(e.target.value)) : setSelectedEventId(null)
          }
          className="input-field max-w-md"
        >
          <option value="">Choose an event...</option>
          {myEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({new Date(event.date).toLocaleDateString()})
              {event.organization ? ` — ${event.organization.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && selectedOrgId && (
        <>
          {/* Generate from Previous + Create Task */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">
                Task Templates
              </h3>
              <button
                onClick={handleGenerateFromPrevious}
                className="px-4 py-2 bg-porch-100 text-porch-700 rounded-lg hover:bg-porch-200 transition-colors text-sm font-medium"
              >
                Generate from Previous Event
              </button>
            </div>

            {generateMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  generateMessage.startsWith("Generated")
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {generateMessage}
              </div>
            )}

            {/* New task form */}
            <div className="flex items-end gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Task Name
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Book sound equipment"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTaskRecurring}
                  onChange={(e) => setNewTaskRecurring(e.target.checked)}
                  className="w-4 h-4 text-porch-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Recurring</span>
              </label>
              <button
                onClick={handleCreateTask}
                disabled={addingTask || !newTaskName.trim()}
                className="px-4 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Org task list */}
            {orgTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No task templates yet. Create one above.
              </p>
            ) : (
              <div className="space-y-2">
                {orgTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {editingTaskId === task.id ? (
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="text"
                          value={editTaskName}
                          onChange={(e) => setEditTaskName(e.target.value)}
                          className="input-field flex-1"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateTask(task.id)
                          }
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editTaskRecurring}
                            onChange={(e) =>
                              setEditTaskRecurring(e.target.checked)
                            }
                            className="w-4 h-4 text-porch-600 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-600">
                            Recurring
                          </span>
                        </label>
                        <button
                          onClick={() => handleUpdateTask(task.id)}
                          className="text-sm text-porch-600 hover:text-porch-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">
                            {task.name}
                          </span>
                          {task.recurring && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              Recurring
                            </span>
                          )}
                          {eventTasks.some(
                            (et) => et.task_id === task.id
                          ) && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewHistory(task.id)}
                            className="text-sm text-gray-500 hover:text-porch-600"
                            title="View history"
                          >
                            History
                          </button>
                          <button
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditTaskName(task.name);
                              setEditTaskRecurring(task.recurring);
                            }}
                            className="text-sm text-gray-500 hover:text-porch-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-sm text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* History panel */}
            {historyTaskId && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Task History:{" "}
                  {orgTasks.find((t) => t.id === historyTaskId)?.name}
                </h4>
                {loadingHistory ? (
                  <p className="text-sm text-blue-700">Loading...</p>
                ) : historyItems.length === 0 ? (
                  <p className="text-sm text-blue-700">
                    No history — this task hasn't been used in any events yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded border border-blue-100"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900">
                            {item.event_name}
                          </span>
                          <span className="text-gray-500">
                            {item.event_date
                              ? new Date(item.event_date).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.notes}
                          </p>
                        )}
                        {item.assigned_user_email && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned to: {item.assigned_user_email}
                          </p>
                        )}
                        {item.contacts && item.contacts.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.contacts.length} contact(s)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add unlinked tasks to event */}
          {unlinkedTasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Add Existing Task to Event
              </h3>
              <div className="space-y-2">
                {unlinkedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{task.name}</span>
                      {task.recurring && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Recurring
                        </span>
                      )}
                    </div>
                    {addingEventTaskId === task.id ? (
                      <span className="text-sm text-gray-500">Adding...</span>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingEventTaskId(task.id);
                          handleAddEventTask(task.id);
                        }}
                        className="text-sm text-porch-600 hover:text-porch-800 font-medium"
                      >
                        + Add to Event
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Task List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">
              Event Tasks
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({eventTasks.length})
              </span>
            </h3>

            {eventTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No tasks for this event yet. Create a task template above or
                generate from a previous event.
              </p>
            ) : (
              <div className="space-y-3">
                {eventTasks.map((et) => (
                  <EventTaskCard
                    key={et.id}
                    eventTask={et}
                    isExpanded={expandedTaskId === et.id}
                    onToggle={() =>
                      setExpandedTaskId(
                        expandedTaskId === et.id ? null : et.id
                      )
                    }
                    adminUsers={adminUsers}
                    onUpdate={handleUpdateEventTask}
                    onDelete={handleDeleteEventTask}
                    contactForm={contactForm}
                    onContactFormChange={setContactForm}
                    onAddContact={handleAddContact}
                    editingContactId={editingContactId}
                    editContactForm={editContactForm}
                    onStartEditContact={(contact: TaskContact) => {
                      setEditingContactId(contact.id);
                      setEditContactForm({
                        name: contact.name,
                        email: contact.email || "",
                        phone: contact.phone || "",
                        business: contact.business || "",
                        notes: contact.notes || "",
                      });
                    }}
                    onCancelEditContact={() => setEditingContactId(null)}
                    onEditContactFormChange={setEditContactForm}
                    onUpdateContact={handleUpdateContact}
                    onDeleteContact={handleDeleteContact}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Task Card sub-component
// ---------------------------------------------------------------------------

interface EventTaskCardProps {
  eventTask: EventTaskItem;
  isExpanded: boolean;
  onToggle: () => void;
  adminUsers: AdminUser[];
  onUpdate: (
    id: number,
    updates: { name?: string | null; notes?: string | null; assigned_user_id?: number | null; due_date?: string | null }
  ) => void;
  onDelete: (id: number) => void;
  contactForm: {
    eventTaskId: number | null;
    name: string;
    email: string;
    phone: string;
    business: string;
    notes: string;
  };
  onContactFormChange: (form: {
    eventTaskId: number | null;
    name: string;
    email: string;
    phone: string;
    business: string;
    notes: string;
  }) => void;
  onAddContact: (eventTaskId: number) => void;
  editingContactId: number | null;
  editContactForm: {
    name: string;
    email: string;
    phone: string;
    business: string;
    notes: string;
  };
  onStartEditContact: (contact: TaskContact) => void;
  onCancelEditContact: () => void;
  onEditContactFormChange: (form: {
    name: string;
    email: string;
    phone: string;
    business: string;
    notes: string;
  }) => void;
  onUpdateContact: (contactId: number, eventTaskId: number) => void;
  onDeleteContact: (contactId: number, eventTaskId: number) => void;
}

function EventTaskCard({
  eventTask,
  isExpanded,
  onToggle,
  adminUsers,
  onUpdate,
  onDelete,
  contactForm,
  onContactFormChange,
  onAddContact,
  editingContactId,
  editContactForm,
  onStartEditContact,
  onCancelEditContact,
  onEditContactFormChange,
  onUpdateContact,
  onDeleteContact,
}: EventTaskCardProps) {
  const [localName, setLocalName] = useState(eventTask.name || "");
  const [nameTimer, setNameTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [localNotes, setLocalNotes] = useState(eventTask.notes || "");
  const [notesTimer, setNotesTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (value: string) => {
    setLocalName(value);
    if (nameTimer) clearTimeout(nameTimer);
    const timer = setTimeout(() => {
      onUpdate(eventTask.id, { name: value || null });
    }, 600);
    setNameTimer(timer);
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (notesTimer) clearTimeout(notesTimer);
    const timer = setTimeout(() => {
      onUpdate(eventTask.id, { notes: value || null });
    }, 600);
    setNotesTimer(timer);
  };

  const dueStr = eventTask.due_date
    ? new Date(eventTask.due_date).toISOString().split("T")[0]
    : "";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 bg-gray-50 hover:bg-porch-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">
              {isExpanded ? "▼" : "▶"}
            </span>
            <div>
              <span className="font-medium text-gray-900">
                {eventTask.name || eventTask.task_name}
              </span>
              {eventTask.name && eventTask.name !== eventTask.task_name && (
                <span className="text-xs text-gray-400 ml-2">
                  ({eventTask.task_name})
                </span>
              )}
            </div>
            {eventTask.recurring && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Recurring
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {eventTask.assigned_user_email && (
              <span>{eventTask.assigned_user_email}</span>
            )}
            {eventTask.due_date && (
              <span>
                Due:{" "}
                {new Date(eventTask.due_date).toLocaleDateString()}
              </span>
            )}
            <span>
              {eventTask.contacts?.length || 0} contact(s)
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-200">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input-field"
              placeholder={eventTask.task_name}
            />
          </div>

          {/* Metadata */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={eventTask.assigned_user_id || ""}
                onChange={(e) =>
                  onUpdate(eventTask.id, {
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
                    {u.email}
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
                  onUpdate(eventTask.id, {
                    due_date: e.target.value || null,
                  })
                }
                className="input-field"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Add notes about this task..."
            />
          </div>

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800">
                Contacts
              </h4>
              {contactForm.eventTaskId !== eventTask.id && (
                <button
                  onClick={() =>
                    onContactFormChange({
                      eventTaskId: eventTask.id,
                      name: "",
                      email: "",
                      phone: "",
                      business: "",
                      notes: "",
                    })
                  }
                  className="text-sm text-porch-600 hover:text-porch-800 font-medium"
                >
                  + Add Contact
                </button>
              )}
            </div>

            {eventTask.contacts && eventTask.contacts.length > 0 && (
              <div className="space-y-2 mb-3">
                {eventTask.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {editingContactId === contact.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editContactForm.name}
                            onChange={(e) =>
                              onEditContactFormChange({
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
                              onEditContactFormChange({
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
                              onEditContactFormChange({
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
                              onEditContactFormChange({
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
                            onEditContactFormChange({
                              ...editContactForm,
                              notes: e.target.value,
                            })
                          }
                          className="input-field text-sm"
                          placeholder="Notes"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              onUpdateContact(contact.id, eventTask.id)
                            }
                            className="text-sm text-porch-600 hover:text-porch-800 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={onCancelEditContact}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {contact.name}
                            {contact.business && (
                              <span className="text-gray-500 font-normal">
                                {" "}
                                — {contact.business}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mt-0.5">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.phone && <span>{contact.phone}</span>}
                          </div>
                          {contact.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => onStartEditContact(contact)}
                            className="text-xs text-gray-400 hover:text-porch-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              onDeleteContact(contact.id, eventTask.id)
                            }
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

            {/* Add contact form */}
            {contactForm.eventTaskId === eventTask.id && (
              <div className="p-3 bg-porch-50 rounded-lg border border-porch-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) =>
                      onContactFormChange({
                        ...contactForm,
                        name: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                    placeholder="Name *"
                  />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      onContactFormChange({
                        ...contactForm,
                        email: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) =>
                      onContactFormChange({
                        ...contactForm,
                        phone: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                    placeholder="Phone"
                  />
                  <input
                    type="text"
                    value={contactForm.business}
                    onChange={(e) =>
                      onContactFormChange({
                        ...contactForm,
                        business: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                    placeholder="Business"
                  />
                </div>
                <input
                  type="text"
                  value={contactForm.notes}
                  onChange={(e) =>
                    onContactFormChange({
                      ...contactForm,
                      notes: e.target.value,
                    })
                  }
                  className="input-field text-sm"
                  placeholder="Notes"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onAddContact(eventTask.id)}
                    disabled={!contactForm.name.trim()}
                    className="px-3 py-1.5 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Add Contact
                  </button>
                  <button
                    onClick={() =>
                      onContactFormChange({
                        eventTaskId: null,
                        name: "",
                        email: "",
                        phone: "",
                        business: "",
                        notes: "",
                      })
                    }
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete event task */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => onDelete(eventTask.id)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Remove from event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
