import { useState } from "react";
import { BandApplication, PorchApplication } from "../types";
import TimeSelect from "./TimeSelect";
import InlineSelect from "../../../components/ui/InlineSelect";

interface SchedulingFormProps {
  band: BandApplication;
  approvedPorches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  onSchedule: (
    bandId: number,
    porchId: number | null,
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
  const [porchId, setPorchId] = useState<string>(band.assigned_porch_id ? String(band.assigned_porch_id) : "");
  const [startTime, setStartTime] = useState(band.set_start_time || "");
  const [endTime, setEndTime] = useState(band.set_end_time || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSchedule(
        band.id,
        porchId ? Number(porchId) : null,
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
      <InlineSelect
        label="Porch"
        value={porchId}
        onChange={setPorchId}
        placeholder="Select a porch..."
        options={[
          { value: "", label: "Select a porch..." },
          ...approvedPorches.map((porch) => ({
            value: String(porch.id),
            label: `${porch.address} (${porch.capacity || "?"} capacity)`,
          })),
        ]}
      />

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
