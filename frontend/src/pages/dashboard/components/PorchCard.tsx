import { useState } from "react";
import { PorchApplication, BandApplication, Status } from "../types";
import { formatTime, getStatusStyles, formatStatus } from "../utils";
import StatusSelect from "./StatusSelect";

interface PorchCardProps {
  porch: PorchApplication;
  scheduledBands: BandApplication[];
  onStatusChange: (porchId: string, status: Status) => void;
}

export default function PorchCard({
  porch,
  scheduledBands,
  onStatusChange,
}: PorchCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {porch.address}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getStatusStyles(porch.status)}`}
            >
              {formatStatus(porch.status)}
            </span>
          </div>

          <p className="text-gray-600 mb-2">{porch.city}</p>

          {scheduledBands.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Scheduled Performances ({scheduledBands.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {scheduledBands.map((band) => (
                  <div
                    key={band.id}
                    className="flex items-center gap-2 text-sm bg-porch-50 text-porch-700 px-3 py-1.5 rounded-lg"
                  >
                    <span className="font-medium">{band.band_name}</span>
                    <span className="text-porch-500">•</span>
                    <span className="text-porch-600">
                      {formatTime(band.set_start_time)} -{" "}
                      {formatTime(band.set_end_time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            <span>👤 {porch.owner_name}</span>
            <span>📧 {porch.email}</span>
            <span>👥 Capacity: {porch.capacity || "?"}</span>
            <span>{porch.has_power ? "⚡ Has power" : "🔋 No power"}</span>
            <span>📅 {new Date(porch.created_at).toLocaleDateString()}</span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-porch-600 hover:text-porch-700 font-medium"
          >
            {expanded ? "▼ Hide Details" : "▶ Show All Details"}
          </button>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {porch.parking_notes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Parking Notes:
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {porch.parking_notes}
                  </p>
                </div>
              )}
              {porch.accessibility_notes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Accessibility:
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {porch.accessibility_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <StatusSelect
          value={porch.status}
          onChange={(status) => onStatusChange(porch.id, status)}
        />
      </div>
    </div>
  );
}
