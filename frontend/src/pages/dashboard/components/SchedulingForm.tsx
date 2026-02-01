import { useState } from "react";
import { BandApplication, PorchApplication } from "../types";
import TimeSelect from "./TimeSelect";

interface SchedulingFormProps {
  band: BandApplication;
  approvedPorches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  onSchedule: (
    bandId: string,
    porchId: string | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
}

export default function SchedulingForm({
  band,
  approvedPorches,
  eventStartTime,
  eventEndTime,
  onSchedule,
}: SchedulingFormProps) {
  const [porchId, setPorchId] = useState(band.assigned_porch_id || "");
  const [startTime, setStartTime] = useState(band.set_start_time || "");
  const [endTime, setEndTime] = useState(band.set_end_time || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSchedule(
        band.id,
        porchId || null,
        startTime || null,
        endTime || null
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSchedule(band.id, null, null, null);
      setPorchId("");
      setStartTime("");
      setEndTime("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Porch
        </label>
        <select
          value={porchId}
          onChange={(e) => setPorchId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
        >
          <option value="">Select a porch...</option>
          {approvedPorches.map((porch) => (
            <option key={porch.id} value={porch.id}>
              {porch.address} ({porch.capacity || "?"} capacity)
            </option>
          ))}
        </select>
      </div>

      <TimeSelect
        label="Start Time"
        value={startTime}
        onChange={setStartTime}
        minTime={eventStartTime}
        maxTime={eventEndTime}
        stepMinutes={5}
      />

      <TimeSelect
        label="End Time"
        value={endTime}
        onChange={setEndTime}
        minTime={eventStartTime}
        maxTime={eventEndTime}
        stepMinutes={5}
      />

      <div className="flex items-end gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !porchId || !startTime || !endTime}
          className="flex-1 px-4 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {band.assigned_porch_id && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
