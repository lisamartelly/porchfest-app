import { useState, useRef } from "react";
import { BandApplication } from "../types";

interface EditBandModalProps {
  band: BandApplication;
  onClose: () => void;
  onSave: (bandId: number, data: Partial<BandApplication>) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";
const S3_BUCKET = import.meta.env.VITE_S3_BUCKET || "porchfest-band-photos-dev";
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-2";

function getPhotoUrl(key: string | null): string | null {
  if (!key) return null;
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export default function EditBandModal({ band, onClose, onSave }: EditBandModalProps) {
  const [form, setForm] = useState({
    band_name: band.band_name,
    contact_name: band.contact_name,
    contact_email: band.contact_email,
    contact_phone: band.contact_phone,
    genre: band.genre,
    member_count: band.member_count,
    music_sample_link: band.music_sample_link,
    bio: band.bio,
    set_length: band.set_length,
    venmo_handle: band.venmo_handle || "",
    instagram: band.instagram || "",
    spotify: band.spotify || "",
    soundcloud: band.soundcloud || "",
    bandcamp: band.bandcamp || "",
    facebook: band.facebook || "",
    website: band.website || "",
    scheduling_notes: band.scheduling_notes || "",
    questions_comments: band.questions_comments || "",
  });
  const [photoKey, setPhotoKey] = useState<string | null>(band.photo_key);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/bands/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
      );
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image");

      setPhotoKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(form)) {
        const original = band[key as keyof BandApplication];
        const originalStr = original === null || original === undefined ? "" : String(original);
        if (value !== originalStr) {
          data[key] = value || null;
        }
      }
      if (photoKey !== band.photo_key) {
        data.photo_key = photoKey;
      }

      if (Object.keys(data).length === 0) {
        onClose();
        return;
      }

      await onSave(band.id, data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Band</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-130px)] p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <div className="flex items-center gap-4">
              {photoKey ? (
                <img
                  src={getPhotoUrl(photoKey)!}
                  alt="Band"
                  className="w-20 h-20 rounded-lg object-cover ring-2 ring-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 ring-2 ring-gray-200 flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 text-sm font-medium bg-porch-50 text-porch-700 border border-porch-200 rounded-lg hover:bg-porch-100 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Change Photo"}
                </button>
                {photoKey && (
                  <button
                    type="button"
                    onClick={() => setPhotoKey(null)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Band Name" value={form.band_name} onChange={(v) => handleChange("band_name", v)} required />
            <Field label="Genre" value={form.genre} onChange={(v) => handleChange("genre", v)} required />
            <Field label="Contact Name" value={form.contact_name} onChange={(v) => handleChange("contact_name", v)} required />
            <Field label="Contact Email" value={form.contact_email} onChange={(v) => handleChange("contact_email", v)} type="email" required />
            <Field label="Contact Phone" value={form.contact_phone} onChange={(v) => handleChange("contact_phone", v)} required />
            <Field label="Member Count" value={form.member_count} onChange={(v) => handleChange("member_count", v)} required />
            <Field label="Set Length" value={form.set_length} onChange={(v) => handleChange("set_length", v)} required />
            <Field label="Venmo Handle" value={form.venmo_handle} onChange={(v) => handleChange("venmo_handle", v)} />
          </div>

          <Field label="Music Sample Link" value={form.music_sample_link} onChange={(v) => handleChange("music_sample_link", v)} required />

          <TextArea label="Bio" value={form.bio} onChange={(v) => handleChange("bio", v)} rows={3} />

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Instagram" value={form.instagram} onChange={(v) => handleChange("instagram", v)} placeholder="https://..." />
              <Field label="Spotify" value={form.spotify} onChange={(v) => handleChange("spotify", v)} placeholder="https://..." />
              <Field label="SoundCloud" value={form.soundcloud} onChange={(v) => handleChange("soundcloud", v)} placeholder="https://..." />
              <Field label="Bandcamp" value={form.bandcamp} onChange={(v) => handleChange("bandcamp", v)} placeholder="https://..." />
              <Field label="Facebook" value={form.facebook} onChange={(v) => handleChange("facebook", v)} placeholder="https://..." />
              <Field label="Website" value={form.website} onChange={(v) => handleChange("website", v)} placeholder="https://..." />
            </div>
          </div>

          {/* Notes */}
          <TextArea label="Scheduling Notes" value={form.scheduling_notes} onChange={(v) => handleChange("scheduling_notes", v)} rows={2} />
          <TextArea label="Questions/Comments" value={form.questions_comments} onChange={(v) => handleChange("questions_comments", v)} rows={2} />
        </form>

        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-porch-600 rounded-lg hover:bg-porch-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-colors"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-colors"
      />
    </div>
  );
}
