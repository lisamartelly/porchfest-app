import { useState } from "react";
import { PorchApplication } from "../types";

interface EditPorchModalProps {
  porch: PorchApplication;
  onClose: () => void;
  onSave: (porchId: number, data: Partial<PorchApplication>) => Promise<void>;
}

export default function EditPorchModal({ porch, onClose, onSave }: EditPorchModalProps) {
  const [form, setForm] = useState({
    owner_name: porch.owner_name,
    email: porch.email,
    phone: porch.phone || "",
    address: porch.address,
    city: porch.city || "",
    capacity: porch.capacity != null ? String(porch.capacity) : "",
    has_power: porch.has_power,
    parking_notes: porch.parking_notes || "",
    accessibility_notes: porch.accessibility_notes || "",
    space_description: porch.space_description || "",
    has_band_in_mind: porch.has_band_in_mind || "",
    music_preferences: porch.music_preferences || "",
    band_count_preference: porch.band_count_preference || "",
    rain_date_available: porch.rain_date_available || "",
    comments: porch.comments || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data: Record<string, string | number | boolean | null> = {};

      const stringFields = [
        "owner_name", "email", "phone", "address", "city",
        "parking_notes", "accessibility_notes", "space_description",
        "has_band_in_mind", "music_preferences", "band_count_preference",
        "rain_date_available", "comments",
      ] as const;

      for (const key of stringFields) {
        const formVal = form[key];
        const original = porch[key];
        const originalStr = original === null || original === undefined ? "" : String(original);
        if (formVal !== originalStr) {
          data[key] = formVal || null;
        }
      }

      if (form.has_power !== porch.has_power) {
        data.has_power = form.has_power;
      }

      const capacityNum = form.capacity ? parseInt(form.capacity, 10) : null;
      if (capacityNum !== porch.capacity) {
        data.capacity = capacityNum;
      }

      if (Object.keys(data).length === 0) {
        onClose();
        return;
      }

      await onSave(porch.id, data);
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
          <h2 className="text-lg font-bold text-gray-900">Edit Porch</h2>
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

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Owner Name" value={form.owner_name} onChange={(v) => handleChange("owner_name", v)} required />
            <Field label="Email" value={form.email} onChange={(v) => handleChange("email", v)} type="email" required />
            <Field label="Phone" value={form.phone} onChange={(v) => handleChange("phone", v)} />
            <Field label="Address" value={form.address} onChange={(v) => handleChange("address", v)} required />
            <Field label="City" value={form.city} onChange={(v) => handleChange("city", v)} />
            <Field label="Capacity" value={form.capacity} onChange={(v) => handleChange("capacity", v)} type="number" />
          </div>

          {/* Power */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_power"
              checked={form.has_power}
              onChange={(e) => handleChange("has_power", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-porch-600 focus:ring-porch-500"
            />
            <label htmlFor="has_power" className="text-sm font-medium text-gray-700">
              Has power available
            </label>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Has Band in Mind</label>
              <select
                value={form.has_band_in_mind}
                onChange={(e) => handleChange("has_band_in_mind", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              >
                <option value="">Not specified</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rain Date Available</label>
              <select
                value={form.rain_date_available}
                onChange={(e) => handleChange("rain_date_available", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
              >
                <option value="">Not specified</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>
          </div>

          <TextArea label="Music Preferences" value={form.music_preferences} onChange={(v) => handleChange("music_preferences", v)} rows={2} />
          <TextArea label="Band Count / Duration Preference" value={form.band_count_preference} onChange={(v) => handleChange("band_count_preference", v)} rows={2} />
          <TextArea label="Space Description" value={form.space_description} onChange={(v) => handleChange("space_description", v)} rows={2} />
          <TextArea label="Parking Notes" value={form.parking_notes} onChange={(v) => handleChange("parking_notes", v)} rows={2} />
          <TextArea label="Accessibility Notes" value={form.accessibility_notes} onChange={(v) => handleChange("accessibility_notes", v)} rows={2} />
          <TextArea label="Comments" value={form.comments} onChange={(v) => handleChange("comments", v)} rows={2} />
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
            disabled={saving}
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
