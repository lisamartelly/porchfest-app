import { useState } from "react";
import { PorchApplication, BandApplication, Status } from "../types";
import { getStatusStyles, formatStatus } from "../utils";
import StatusSelect from "./StatusSelect";

interface PorchCardProps {
  porch: PorchApplication;
  scheduledBands: BandApplication[];
  onStatusChange: (porchId: number, status: Status) => void;
  eventStartTime?: string;
  eventEndTime?: string;
}

const BAND_COLORS = [
  { bg: "bg-amber-400", text: "text-amber-900" },
  { bg: "bg-orange-400", text: "text-orange-900" },
  { bg: "bg-rose-400", text: "text-rose-900" },
  { bg: "bg-pink-400", text: "text-pink-900" },
  { bg: "bg-red-300", text: "text-red-900" },
];

const getBandColor = (index: number) => BAND_COLORS[index % BAND_COLORS.length];

const timeToMinutes = (time: string | null): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatTime12 = (time: string | null): string => {
  if (!time) return "";
  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minStr} ${period}`;
};

const formatChoice = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const formatSubmittedDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// --- Inline SVG Icons ---

function IconUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconMail({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function IconPhone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function IconMusic({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  );
}

function IconHome({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconChat({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function IconCloudRain({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
    </svg>
  );
}

function IconMic({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

// --- Component ---

type Tab = "contact" | "music" | "details" | "comments";

export default function PorchCard({
  porch,
  scheduledBands,
  onStatusChange,
  eventStartTime = "12:00",
  eventEndTime = "18:00",
}: PorchCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contact");

  const eventStartMinutes = timeToMinutes(eventStartTime);
  const eventEndMinutes = timeToMinutes(eventEndTime);
  const totalMinutes = eventEndMinutes - eventStartMinutes;

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

  const sortedBands = [...scheduledBands].sort((a, b) => {
    return timeToMinutes(a.set_start_time) - timeToMinutes(b.set_start_time);
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: "Contact", icon: <IconUser className="w-3.5 h-3.5" /> },
    { id: "music", label: "Music Prefs", icon: <IconMusic className="w-3.5 h-3.5" /> },
    { id: "details", label: "Porch Details", icon: <IconHome className="w-3.5 h-3.5" /> },
    { id: "comments", label: "Comments", icon: <IconChat className="w-3.5 h-3.5" /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "contact":
        return (
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="flex items-center gap-2.5">
              <IconMail className="w-4 h-4 text-gray-400" />
              <a
                href={`mailto:${porch.email}`}
                className="text-porch-600 hover:text-porch-700 underline underline-offset-2"
              >
                {porch.email}
              </a>
            </div>
            {porch.phone && (
              <div className="flex items-center gap-2.5">
                <IconPhone className="w-4 h-4 text-gray-400" />
                <a
                  href={`tel:${porch.phone}`}
                  className="text-porch-600 hover:text-porch-700 underline underline-offset-2"
                >
                  {porch.phone}
                </a>
              </div>
            )}
            {porch.rain_date_available && (
              <div className="flex items-center gap-2.5">
                <IconCloudRain className="w-4 h-4 text-gray-400" />
                <span>Rain date available: <span className="font-medium">{formatChoice(porch.rain_date_available)}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <IconCalendar className="w-4 h-4 text-gray-400" />
              <span>Submitted {formatSubmittedDate(porch.created_at)}</span>
            </div>
          </div>
        );

      case "music":
        return (
          <div className="text-sm text-gray-700">
            {porch.music_preferences ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {porch.music_preferences}
              </p>
            ) : (
              <p className="italic text-gray-400">
                No music preferences specified.
              </p>
            )}
          </div>
        );

      case "details":
        return (
          <div className="space-y-3 text-sm text-gray-700">
            {porch.space_description && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">
                  Space description
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {porch.space_description}
                </p>
              </div>
            )}
            {porch.band_count_preference && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">
                  Band / duration preference
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {porch.band_count_preference}
                </p>
              </div>
            )}
            {porch.parking_notes && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">
                  Parking notes
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {porch.parking_notes}
                </p>
              </div>
            )}
            {porch.accessibility_notes && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">
                  Accessibility notes
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {porch.accessibility_notes}
                </p>
              </div>
            )}
            {!porch.space_description &&
              !porch.band_count_preference &&
              !porch.parking_notes &&
              !porch.accessibility_notes && (
                <p className="italic text-gray-400">
                  No porch details provided.
                </p>
              )}
          </div>
        );

      case "comments":
        return (
          <div className="text-sm text-gray-700">
            {porch.comments ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {porch.comments}
              </p>
            ) : (
              <p className="italic text-gray-400">No comments.</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-porch-100 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-lg text-gray-900">
                {porch.address}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusStyles(porch.status)}`}
              >
                {formatStatus(porch.status)}
              </span>
              {porch.has_band_in_mind === "yes" && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  band in mind
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {porch.owner_name}
              {porch.city && <span className="text-gray-400"> · {porch.city}</span>}
            </p>
          </div>
          <StatusSelect
            value={porch.status}
            onChange={(status) => onStatusChange(porch.id, status)}
          />
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mt-5 mb-4 border-b border-gray-100 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                activeTab === tab.id
                  ? "bg-porch-600 text-white border-porch-600 shadow-sm"
                  : "bg-white text-porch-700 border-porch-200 hover:bg-porch-50 hover:border-porch-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[80px] mb-5">
          {renderTabContent()}
        </div>

        {/* Schedule timeline */}
        {scheduledBands.length > 0 ? (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Schedule ({scheduledBands.length}{" "}
              {scheduledBands.length === 1 ? "band" : "bands"})
            </h4>

            <div className="relative">
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

              <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden mt-5">
                {hourMarkers.map((marker) => (
                  <div
                    key={marker.time}
                    className="absolute top-0 bottom-0 w-px bg-gray-300"
                    style={{ left: `${marker.position}%` }}
                  />
                ))}

                {sortedBands.map((band, index) => {
                  const startMinutes = timeToMinutes(band.set_start_time);
                  const endMinutes = timeToMinutes(band.set_end_time);
                  const left =
                    ((startMinutes - eventStartMinutes) / totalMinutes) * 100;
                  const width =
                    ((endMinutes - startMinutes) / totalMinutes) * 100;
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
                      <span
                        className={`text-xs font-semibold ${color.text} truncate`}
                      >
                        {band.band_name}
                      </span>
                    </div>
                  );
                })}
              </div>

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
                        {formatTime12(band.set_start_time)} -{" "}
                        {formatTime12(band.set_end_time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-gray-100 text-sm text-gray-400 italic">
            No performances scheduled yet
          </div>
        )}
      </div>
    </div>
  );
}
