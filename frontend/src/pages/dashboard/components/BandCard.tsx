import { useState } from "react";
import { BandApplication, PorchApplication, Status } from "../types";
import { formatTime, getStatusStyles, formatStatus } from "../utils";
import StatusSelect from "./StatusSelect";
import SchedulingForm from "./SchedulingForm";

interface BandCardProps {
  band: BandApplication;
  approvedPorches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  onStatusChange: (bandId: string, status: Status) => void;
  onSchedule: (
    bandId: string,
    porchId: string | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
  getPorchAddress: (porchId: string | null) => string | null;
  schedulingError: string | null;
}

export default function BandCard({
  band,
  approvedPorches,
  eventStartTime,
  eventEndTime,
  onStatusChange,
  onSchedule,
  getPorchAddress,
  schedulingError,
}: BandCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {band.band_name}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getStatusStyles(band.status)}`}
            >
              {formatStatus(band.status)}
            </span>
          </div>

          <p className="text-sm text-porch-600 mb-2">{band.genre}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            <span>👤 {band.contact_name}</span>
            <span>👥 {band.member_count} members</span>
            <span>⏱️ {band.set_length}</span>
            <span>📅 {new Date(band.created_at).toLocaleDateString()}</span>
          </div>

          {band.assigned_porch_id && band.set_start_time && (
            <div className="flex items-center gap-2 text-sm bg-porch-50 text-porch-700 px-3 py-2 rounded-lg mb-3 w-fit">
              <span>📍 {getPorchAddress(band.assigned_porch_id)}</span>
              <span>•</span>
              <span>
                {formatTime(band.set_start_time)} -{" "}
                {formatTime(band.set_end_time)}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <a
              href={band.music_sample_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-porch-600 hover:text-porch-700 underline"
            >
              🎵 Listen to Sample
            </a>
            {band.instagram && (
              <a
                href={band.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Instagram
              </a>
            )}
            {band.spotify && (
              <a
                href={band.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Spotify
              </a>
            )}
            {band.website && (
              <a
                href={band.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Website
              </a>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-porch-600 hover:text-porch-700 font-medium"
          >
            {expanded ? "▼ Hide Details" : "▶ Show All Details"}
          </button>
        </div>

        <StatusSelect
          value={band.status}
          onChange={(status) => onStatusChange(band.id, status)}
        />
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Contact Information
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Name:</span>{" "}
                  {band.contact_name}
                </p>
                <p>
                  <span className="text-gray-500">Email:</span>{" "}
                  <a
                    href={`mailto:${band.contact_email}`}
                    className="text-porch-600"
                  >
                    {band.contact_email}
                  </a>
                </p>
                <p>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <a
                    href={`tel:${band.contact_phone}`}
                    className="text-porch-600"
                  >
                    {band.contact_phone}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Performance Details
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Members:</span>{" "}
                  {band.member_count}
                </p>
                <p>
                  <span className="text-gray-500">Ideal Set Length:</span>{" "}
                  {band.set_length}
                </p>
                <p>
                  <span className="text-gray-500">Venmo:</span>{" "}
                  {band.venmo_handle || "Not provided"}
                </p>
                <p>
                  <span className="text-gray-500">Has Photo:</span>{" "}
                  {band.has_photo ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Bio</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {band.bio}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              Social Media & Links
            </h4>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href={band.music_sample_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-porch-100 text-porch-700 rounded-full hover:bg-porch-200"
              >
                🎵 Music Sample
              </a>
              {band.instagram && (
                <a
                  href={band.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200"
                >
                  Instagram
                </a>
              )}
              {band.spotify && (
                <a
                  href={band.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                >
                  Spotify
                </a>
              )}
              {band.soundcloud && (
                <a
                  href={band.soundcloud}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
                >
                  SoundCloud
                </a>
              )}
              {band.bandcamp && (
                <a
                  href={band.bandcamp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                >
                  Bandcamp
                </a>
              )}
              {band.facebook && (
                <a
                  href={band.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                >
                  Facebook
                </a>
              )}
              {band.website && (
                <a
                  href={band.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  Website
                </a>
              )}
            </div>
          </div>

          {band.scheduling_notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Scheduling Notes
              </h4>
              <p className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg">
                {band.scheduling_notes}
              </p>
            </div>
          )}

          {band.questions_comments && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Questions/Comments
              </h4>
              <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg">
                {band.questions_comments}
              </p>
            </div>
          )}

          {band.status === "approved" && (
            <div className="bg-porch-50 p-4 rounded-lg border border-porch-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📅 Schedule Performance
              </h4>

              {schedulingError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {schedulingError}
                </div>
              )}

              {band.assigned_porch_id &&
                band.set_start_time &&
                band.set_end_time && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-porch-200">
                    <p className="text-sm">
                      <span className="font-medium">Currently scheduled at:</span>{" "}
                      {getPorchAddress(band.assigned_porch_id)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatTime(band.set_start_time)} -{" "}
                      {formatTime(band.set_end_time)}
                    </p>
                  </div>
                )}

              <SchedulingForm
                band={band}
                approvedPorches={approvedPorches}
                eventStartTime={eventStartTime}
                eventEndTime={eventEndTime}
                onSchedule={onSchedule}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
