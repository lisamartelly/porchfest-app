import { PorchApplication, BandApplication, Status } from "../types";
import { getStatusStyles, formatStatus } from "../utils";
import StatusSelect from "./StatusSelect";

interface PorchCardProps {
  porch: PorchApplication;
  scheduledBands: BandApplication[];
  onStatusChange: (porchId: string, status: Status) => void;
  eventStartTime?: string;
  eventEndTime?: string;
}

// Generate distinct colors for bands based on index
const BAND_COLORS = [
  { bg: "bg-amber-400", text: "text-amber-900" },
  { bg: "bg-emerald-400", text: "text-emerald-900" },
  { bg: "bg-sky-400", text: "text-sky-900" },
  { bg: "bg-rose-400", text: "text-rose-900" },
  { bg: "bg-violet-400", text: "text-violet-900" },
  { bg: "bg-orange-400", text: "text-orange-900" },
  { bg: "bg-teal-400", text: "text-teal-900" },
  { bg: "bg-pink-400", text: "text-pink-900" },
];

const getBandColor = (index: number) => BAND_COLORS[index % BAND_COLORS.length];

// Convert time string to minutes from midnight
const timeToMinutes = (time: string | null): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Format time to 12-hour format
const formatTime12 = (time: string | null): string => {
  if (!time) return "";
  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minStr} ${period}`;
};

export default function PorchCard({
  porch,
  scheduledBands,
  onStatusChange,
  eventStartTime = "12:00",
  eventEndTime = "18:00",
}: PorchCardProps) {
  const eventStartMinutes = timeToMinutes(eventStartTime);
  const eventEndMinutes = timeToMinutes(eventEndTime);
  const totalMinutes = eventEndMinutes - eventStartMinutes;

  // Generate hour markers
  const hourMarkers: { time: string; label: string; position: number }[] = [];
  const startHour = Math.floor(eventStartMinutes / 60);
  const endHour = Math.ceil(eventEndMinutes / 60);
  
  for (let hour = startHour; hour <= endHour; hour++) {
    const minutes = hour * 60;
    if (minutes >= eventStartMinutes && minutes <= eventEndMinutes) {
      const position = ((minutes - eventStartMinutes) / totalMinutes) * 100;
      const displayHour = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      hourMarkers.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        label: `${displayHour}${period}`,
        position,
      });
    }
  }

  // Sort bands by start time
  const sortedBands = [...scheduledBands].sort((a, b) => {
    return timeToMinutes(a.set_start_time) - timeToMinutes(b.set_start_time);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
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

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span>👤 {porch.owner_name}</span>
              <a href={`mailto:${porch.email}`} className="hover:text-porch-600 transition-colors">
                📧 {porch.email}
              </a>
            </div>

            {/* Visual Timeline */}
            {scheduledBands.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                  Schedule ({scheduledBands.length} {scheduledBands.length === 1 ? "band" : "bands"})
                </p>
                
                {/* Timeline Container */}
                <div className="relative">
                  {/* Hour Markers */}
                  <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
                    {hourMarkers.map((marker) => (
                      <span
                        key={marker.time}
                        className="absolute transform -translate-x-1/2"
                        style={{ left: `${marker.position}%` }}
                      >
                        {marker.label}
                      </span>
                    ))}
                  </div>

                  {/* Timeline Track */}
                  <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden mt-5">
                    {/* Hour grid lines */}
                    {hourMarkers.map((marker) => (
                      <div
                        key={marker.time}
                        className="absolute top-0 bottom-0 w-px bg-gray-300"
                        style={{ left: `${marker.position}%` }}
                      />
                    ))}

                    {/* Band Blocks */}
                    {sortedBands.map((band, index) => {
                      const startMinutes = timeToMinutes(band.set_start_time);
                      const endMinutes = timeToMinutes(band.set_end_time);
                      const left = ((startMinutes - eventStartMinutes) / totalMinutes) * 100;
                      const width = ((endMinutes - startMinutes) / totalMinutes) * 100;
                      const color = getBandColor(index);

                      return (
                        <div
                          key={band.id}
                          className={`absolute top-1 bottom-1 ${color.bg} rounded-md flex items-center px-2 overflow-hidden shadow-sm`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: "40px",
                          }}
                          title={`${band.band_name}: ${formatTime12(band.set_start_time)} - ${formatTime12(band.set_end_time)}`}
                        >
                          <span className={`text-xs font-semibold ${color.text} truncate`}>
                            {band.band_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Band Legend */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {sortedBands.map((band, index) => {
                      const color = getBandColor(index);
                      return (
                        <div
                          key={band.id}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          <div className={`w-2.5 h-2.5 rounded-sm ${color.bg}`} />
                          <span className="font-medium">{band.band_name}</span>
                          <span className="text-gray-400">
                            {formatTime12(band.set_start_time)} - {formatTime12(band.set_end_time)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-400 italic">
                No performances scheduled yet
              </div>
            )}
          </div>

          <StatusSelect
            value={porch.status}
            onChange={(status) => onStatusChange(porch.id, status)}
          />
        </div>
      </div>
    </div>
  );
}
