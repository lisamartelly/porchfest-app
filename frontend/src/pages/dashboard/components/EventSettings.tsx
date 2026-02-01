import { useState } from "react";
import { EventSettings as EventSettingsType } from "../types";
import TimeSelect from "./TimeSelect";
import { formatTime } from "../utils";

interface EventSettingsProps {
  event: EventSettingsType;
  onSave: (updates: Partial<EventSettingsType>) => Promise<void>;
}

export default function EventSettings({ event, onSave }: EventSettingsProps) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.start_time);
  const [endTime, setEndTime] = useState(event.end_time);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasChanges =
    name !== event.name ||
    date !== event.date ||
    startTime !== event.start_time ||
    endTime !== event.end_time;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        date,
        start_time: startTime,
        end_time: endTime,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg text-gray-900">
            🎪 Event Settings
          </h2>
          <p className="text-sm text-gray-500">
            {event.name} • {event.date} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-porch-600 hover:text-porch-700 font-medium"
        >
          {expanded ? "▼ Collapse" : "▶ Edit"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 pt-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="w-full px-4 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <TimeSelect
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
              minTime="06:00"
              maxTime="22:00"
              stepMinutes={30}
            />

            <TimeSelect
              label="End Time"
              value={endTime}
              onChange={setEndTime}
              minTime="06:00"
              maxTime="23:00"
              stepMinutes={30}
            />
          </div>
        </div>
      )}
    </div>
  );
}
