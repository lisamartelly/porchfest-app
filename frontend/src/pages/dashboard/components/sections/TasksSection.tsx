import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../lib/api";
import { EventTaskItem } from "../../types";

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
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
};

export default function TasksSection() {
  const navigate = useNavigate();
  const [event, setEvent] = useState<ActiveEvent | null>(null);
  const [eventTasks, setEventTasks] = useState<EventTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveEventTasks();
  }, []);

  const fetchActiveEventTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/admin/tasks/active-event-tasks");
      setEvent(data.event || null);
      setEventTasks(data.event_tasks || []);
    } catch (error) {
      console.error("Error fetching active event tasks:", error);
      setEvent(null);
      setEventTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (eventTask: EventTaskItem) => {
    navigate(`/admin/tasks/${eventTask.id}`);
  };

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
        <h3 className="font-semibold text-lg text-gray-900 mb-1">
          {event.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {event.date && new Date(event.date).toLocaleDateString()} — Tasks
          ordered by due date
        </p>

        {eventTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No tasks for this event yet. Add tasks via the Events section by
            selecting this event.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventTasks.map((et) => (
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
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {et.assigned_user_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {et.due_date
                        ? new Date(et.due_date).toLocaleDateString()
                        : "—"}
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
