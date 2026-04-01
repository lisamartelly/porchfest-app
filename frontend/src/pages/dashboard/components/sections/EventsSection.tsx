import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { formatDate } from "../../../../lib/dateUtils";
import { useOrgStore } from "../../../../stores/orgStore";
import { EventSettings, EventWithOrg } from "../../types";
import EventSettingsEditor from "../EventSettings";

interface EventsSectionProps {
  eventSettings: EventSettings | null;
  onEventSettingsUpdate: (settings: EventSettings) => void;
}

export default function EventsSection({
  eventSettings,
  onEventSettingsUpdate,
}: EventsSectionProps) {
  const { activeOrgId } = useOrgStore();
  const [myEvents, setMyEvents] = useState<EventWithOrg[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    date: "",
    start_time: "12:00",
    end_time: "18:00",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchMyEvents = useCallback(async () => {
    try {
      const events: EventWithOrg[] = await api.get("/api/admin/my-events");
      if (activeOrgId) {
        setMyEvents((events || []).filter((e) => e.organization_id === activeOrgId));
      } else {
        setMyEvents(events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!activeOrgId) {
      setFormError("No organization selected");
      return;
    }
    try {
      await api.post("/api/admin/events", {
        ...newEventForm,
        organization_id: activeOrgId,
      });
      setFormSuccess(true);
      setNewEventForm({
        name: "",
        date: "",
        start_time: "12:00",
        end_time: "18:00",
        description: "",
      });
      fetchMyEvents();
    } catch (error) {
      setFormError(
        (error as Error).message || "Failed to create event",
      );
    }
  };

  const updateEventById = async (
    eventId: number,
    updates: Partial<EventSettings>,
  ) => {
    try {
      const updated = await api.patch(
        `/api/admin/events/${eventId}`,
        updates,
      );
      setMyEvents(
        myEvents.map((e) => (e.id === eventId ? { ...e, ...updated } : e)),
      );
      if (eventSettings?.id === eventId) {
        onEventSettingsUpdate(updated);
      }
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const setEventActive = async (eventId: number) => {
    try {
      const updated = await api.patch(`/api/admin/events/${eventId}`, {
        is_active: true,
      });
      if (eventSettings?.id === eventId) {
        onEventSettingsUpdate(updated);
      }
      fetchMyEvents();
    } catch (error) {
      console.error("Error setting active event:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Create New Event
        </h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Event created successfully!
          </div>
        )}

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                value={newEventForm.name}
                onChange={(e) =>
                  setNewEventForm({ ...newEventForm, name: e.target.value })
                }
                className="input-field"
                placeholder="e.g. Somerville Porchfest 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={newEventForm.date}
                onChange={(e) =>
                  setNewEventForm({ ...newEventForm, date: e.target.value })
                }
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={newEventForm.start_time}
                onChange={(e) =>
                  setNewEventForm({
                    ...newEventForm,
                    start_time: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={newEventForm.end_time}
                onChange={(e) =>
                  setNewEventForm({
                    ...newEventForm,
                    end_time: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newEventForm.description}
              onChange={(e) =>
                setNewEventForm({
                  ...newEventForm,
                  description: e.target.value,
                })
              }
              className="input-field min-h-[80px]"
              placeholder="Brief description of the event"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
          >
            Create Event
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Your Events
        </h3>
        {myEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No events yet. Create one above.
          </p>
        ) : (
          <div className="space-y-3">
            {myEvents.map((event) => (
              <div key={event.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEventId(
                      selectedEventId === event.id ? null : event.id,
                    )
                  }
                  className="w-full text-left p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-porch-300 hover:bg-porch-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(event.date)} &middot;{" "}
                        {event.start_time} - {event.end_time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventActive(event.id);
                          }}
                          className="px-2 py-1 text-xs font-medium text-porch-600 hover:text-porch-700 hover:bg-porch-50 rounded-full transition-colors"
                        >
                          Set as active
                        </button>
                      )}
                      <span className="text-gray-400 text-sm">
                        {selectedEventId === event.id ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>
                </button>

                {selectedEventId === event.id && (
                  <div className="mt-2 ml-2 border-l-2 border-porch-200 pl-4">
                    <EventSettingsEditor
                      event={event as unknown as EventSettings}
                      onSave={(updates) => updateEventById(event.id, updates)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
