import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface OrgEventInfo {
  organization: { id: string; name: string; slug: string };
  event: {
    id: string;
    name: string;
    date: string;
    start_time: string;
    end_time: string;
    description: string | null;
  } | null;
  band_applications_open: boolean;
  porch_applications_open: boolean;
  porch_applications_open_date: string | null;
  porch_applications_close_date: string | null;
}

export default function PorchApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgEvent, setOrgEvent] = useState<OrgEventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const fetchEventInfo = useCallback(async () => {
    try {
      const data = await api.get(`/api/events/org/${slug}`);
      setOrgEvent(data);
    } catch {
      setLoadError("Organization not found.");
    } finally {
      setLoadingEvent(false);
    }
  }, [slug]);
  
  useEffect(() => {
    if (!slug) {
      setLoadError("No organization specified.");
      setLoadingEvent(false);
      return;
    }
    fetchEventInfo();
  }, [slug, fetchEventInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/porches/apply", {
        ...formData,
        event_id: orgEvent!.event!.id,
      });
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message || "Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    );
  }

  if (loadError || !orgEvent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">&#x2717;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Organization Not Found
          </h1>
          <p className="text-gray-600">
            {loadError || "We couldn't find this organization. Please check the URL and try again."}
          </p>
        </div>
      </div>
    );
  }

  if (!orgEvent.event) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">&#x1F4C5;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            No Active Event
          </h1>
          <p className="text-gray-600">
            <strong>{orgEvent.organization.name}</strong> doesn't have an active
            event right now. Check back later!
          </p>
        </div>
      </div>
    );
  }

  if (!orgEvent.porch_applications_open) {
    const hasWindow =
      orgEvent.porch_applications_open_date ||
      orgEvent.porch_applications_close_date;
    const windowMessage = hasWindow ? (
      <>
        Application window:{" "}
        {orgEvent.porch_applications_open_date
          ? new Date(
              orgEvent.porch_applications_open_date,
            ).toLocaleDateString()
          : "TBD"}
        {" – "}
        {orgEvent.porch_applications_close_date
          ? new Date(
              orgEvent.porch_applications_close_date,
            ).toLocaleDateString()
          : "TBD"}
      </>
    ) : (
      <>Application window will be set soon.</>
    );

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">&#x1F512;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Applications Closed
          </h1>
          <p className="text-gray-600">
            Porch applications for <strong>{orgEvent.event.name}</strong>.{" "}
            {windowMessage}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">&#x2713;</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Application Submitted!
        </h1>
        <p className="text-gray-600 mb-8">
          Thanks for offering your porch for{" "}
          <strong>{orgEvent.event.name}</strong>! We'll review your application
          and get back to you at <strong>{formData.email}</strong>.
        </p>
        <button onClick={() => navigate("/")} className="btn-primary">
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
            Host a performance at {orgEvent.event.name}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {orgEvent.organization.name} &middot;{" "}
            {new Date(orgEvent.event.date).toLocaleDateString()}
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
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
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
                setFormData({
                  ...formData,
                  accessibility_notes: e.target.value,
                })
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
          </div>
        </form>
      </div>
    </div>
  );
}
