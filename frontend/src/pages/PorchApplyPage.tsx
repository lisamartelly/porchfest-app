import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function PorchApplyPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    owner_name: "",
    email: "",
    address: "",
    city: "",
    capacity: 20,
    has_power: false,
    parking_notes: "",
    accessibility_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/porches/apply", formData);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message || "Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Application Submitted!
        </h1>
        <p className="text-gray-600 mb-8">
          Thanks for offering your porch for Porchfest! We'll review your
          application and get back to you at <strong>{formData.email}</strong>.
        </p>
        <button onClick={() => navigate("/login")} className="btn-primary">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Offer Your Porch
        </h1>
        <p className="text-gray-600 mt-1">
          Tell us about your porch to host performances
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={formData.owner_name}
            onChange={(e) =>
              setFormData({ ...formData, owner_name: e.target.value })
            }
            className="input-field"
            placeholder="Jane Smith"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="input-field"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="input-field"
            placeholder="123 Main Street"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="input-field"
            placeholder="Cambridge"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audience Capacity
          </label>
          <p className="text-sm text-gray-500 mb-2">
            How many people can comfortably gather to watch?
          </p>
          <input
            type="number"
            min="5"
            max="200"
            value={formData.capacity}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: parseInt(e.target.value) || 20,
              })
            }
            className="input-field w-32"
          />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.has_power}
              onChange={(e) =>
                setFormData({ ...formData, has_power: e.target.checked })
              }
              className="w-5 h-5 text-porch-600 rounded border-gray-300 focus:ring-porch-500"
            />
            <div>
              <span className="font-medium text-gray-700">
                Power outlet available
              </span>
              <p className="text-sm text-gray-500">
                Can bands plug in amplifiers or equipment?
              </p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parking Notes
          </label>
          <textarea
            value={formData.parking_notes}
            onChange={(e) =>
              setFormData({ ...formData, parking_notes: e.target.value })
            }
            className="input-field min-h-[80px]"
            placeholder="Street parking available, nearby lot at..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accessibility Notes
          </label>
          <textarea
            value={formData.accessibility_notes}
            onChange={(e) =>
              setFormData({ ...formData, accessibility_notes: e.target.value })
            }
            className="input-field min-h-[80px]"
            placeholder="Steps to porch, wheelchair accessibility, etc."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-secondary disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Application"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}
