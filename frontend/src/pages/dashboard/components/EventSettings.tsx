import { useState, useRef } from "react";
import { EventSettings as EventSettingsType } from "../types";
import TimeSelect from "./TimeSelect";
import { api } from "../../../lib/api";

const toDateInput = (v: string | null): string => (v ? v.substring(0, 10) : "");
const toTimeInput = (v: string): string => (v ? v.substring(0, 5) : "");

function getPhotoUrl(key: string | null): string | null {
  if (!key) return null;
  const region = import.meta.env.VITE_AWS_REGION || "us-east-2";
  const bucket = import.meta.env.VITE_S3_BUCKET || "porchfest-band-photos-dev";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

interface EventSettingsProps {
  event: EventSettingsType;
  onSave: (updates: Partial<EventSettingsType>) => Promise<void>;
}

export default function EventSettings({ event, onSave }: EventSettingsProps) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(toDateInput(event.date));
  const [startTime, setStartTime] = useState(toTimeInput(event.start_time));
  const [endTime, setEndTime] = useState(toTimeInput(event.end_time));
  const [bandAppsOpen, setBandAppsOpen] = useState(toDateInput(event.band_applications_open));
  const [bandAppsClose, setBandAppsClose] = useState(toDateInput(event.band_applications_close));
  const [porchAppsOpen, setPorchAppsOpen] = useState(toDateInput(event.porch_applications_open));
  const [porchAppsClose, setPorchAppsClose] = useState(toDateInput(event.porch_applications_close));
  const [porchAppDescription, setPorchAppDescription] = useState(event.porch_app_description || "");
  const [porchAppPhotoKey, setPorchAppPhotoKey] = useState(event.porch_app_photo_key || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    name !== event.name ||
    date !== toDateInput(event.date) ||
    startTime !== toTimeInput(event.start_time) ||
    endTime !== toTimeInput(event.end_time) ||
    bandAppsOpen !== toDateInput(event.band_applications_open) ||
    bandAppsClose !== toDateInput(event.band_applications_close) ||
    porchAppsOpen !== toDateInput(event.porch_applications_open) ||
    porchAppsClose !== toDateInput(event.porch_applications_close) ||
    porchAppDescription !== (event.porch_app_description || "") ||
    porchAppPhotoKey !== (event.porch_app_photo_key || "");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { uploadUrl, key } = await api.get(
        `/api/admin/porch-app-photo/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
      );
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      setPorchAppPhotoKey(key);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        date,
        start_time: startTime,
        end_time: endTime,
        band_applications_open: bandAppsOpen || null,
        band_applications_close: bandAppsClose || null,
        porch_applications_open: porchAppsOpen || null,
        porch_applications_close: porchAppsClose || null,
        porch_app_description: porchAppDescription || null,
        porch_app_photo_key: porchAppPhotoKey || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const photoPreviewUrl = getPhotoUrl(porchAppPhotoKey);

  return (
    <div className="card p-6 my-3">
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

      {/* Application Periods */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          Application Periods
        </h3>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Band Applications</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Opens
              </label>
              <input
                type="date"
                value={bandAppsOpen}
                onChange={(e) => setBandAppsOpen(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Closes
              </label>
              <input
                type="date"
                value={bandAppsClose}
                onChange={(e) => setBandAppsClose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Porch Applications</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Opens
              </label>
              <input
                type="date"
                value={porchAppsOpen}
                onChange={(e) => setPorchAppsOpen(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Closes
              </label>
              <input
                type="date"
                value={porchAppsClose}
                onChange={(e) => setPorchAppsClose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Porch Application Form Configuration */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="font-medium text-gray-900 mb-4">
          Porch Application Form
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Customize the description and photo shown to applicants at the top of the porch application form.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={porchAppDescription}
            onChange={(e) => setPorchAppDescription(e.target.value)}
            placeholder="Welcome message, instructions, or details for porch hosts..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500 min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo
          </label>
          <div className="flex items-start gap-4">
            {photoPreviewUrl && (
              <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <img
                  src={photoPreviewUrl}
                  alt="Porch app photo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPorchAppPhotoKey("")}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  title="Remove photo"
                >
                  &times;
                </button>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {uploadingPhoto
                  ? "Uploading..."
                  : photoPreviewUrl
                    ? "Change Photo"
                    : "Upload Photo"}
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Shown at the top of the porch application form
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
