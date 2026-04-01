import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../lib/dateUtils";

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
  porch_app_description: string | null;
  porch_app_photo_url: string | null;
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
    phone: "",
    email: "",
    address: "",
    space_description: "",
    has_band_in_mind: "",
    music_preferences: "",
    band_count_preference: "",
    rain_date_available: "",
    comments: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      if (Object.keys(next).length === 0) setError(null);
      return next;
    });
  };

  const FIELD_LIMITS: Record<string, number> = {
    owner_name: 255,
    email: 255,
    phone: 50,
    address: 255,
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.owner_name.trim()) errors.owner_name = "Name is required.";
    if (!formData.phone.trim()) errors.phone = "Phone number is required.";
    if (!formData.email.trim()) errors.email = "Email is required.";
    if (!formData.address.trim()) errors.address = "Address is required.";

    for (const [field, max] of Object.entries(FIELD_LIMITS)) {
      const val = formData[field as keyof typeof formData];
      if (val.length > max && !errors[field]) {
        errors[field] = `Must be ${max} characters or fewer.`;
      }
    }

    return errors;
  };

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

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fill in all required fields before submitting.");
      setSaving(false);
      const firstErrorEl = document.querySelector("[data-field-error]");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFieldErrors({});

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

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
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
          ? formatDate(orgEvent.porch_applications_open_date)
          : "TBD"}
        {" – "}
        {orgEvent.porch_applications_close_date
          ? formatDate(orgEvent.porch_applications_close_date)
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
            Porch Application
          </h1>
          <p className="text-gray-600 mt-1">
            Host a performance at {orgEvent.event.name}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {orgEvent.organization.name} &middot;{" "}
            {formatDate(orgEvent.event.date)}
          </p>
        </div>

        {orgEvent.porch_app_photo_url && (
          <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
            <img
              src={orgEvent.porch_app_photo_url}
              alt={`${orgEvent.event.name} porch application`}
              className="w-full h-auto max-h-80 object-cover"
            />
          </div>
        )}

        {orgEvent.porch_app_description && (
          <div className="mb-6 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-700 whitespace-pre-wrap">
              {orgEvent.porch_app_description}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => updateField("owner_name", e.target.value)}
              maxLength={255}
              className={`input-field ${fieldErrors.owner_name ? "!border-red-400" : ""}`}
            />
            {fieldErrors.owner_name && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.owner_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              maxLength={50}
              className={`input-field ${fieldErrors.phone ? "!border-red-400" : ""}`}
            />
            {fieldErrors.phone && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              maxLength={255}
              className={`input-field ${fieldErrors.email ? "!border-red-400" : ""}`}
            />
            {fieldErrors.email && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Home/Porch Street Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              maxLength={255}
              className={`input-field ${fieldErrors.address ? "!border-red-400" : ""}`}
            />
            {fieldErrors.address && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brief description of your band-playing space (porch, yard, driveway, etc)
            </label>
            <textarea
              value={formData.space_description}
              onChange={(e) => updateField("space_description", e.target.value)}
              className="input-field min-h-[80px]"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-3">
              Do you already have a band/bands in mind that you want to have play at your house?
            </legend>
            <p className="text-sm text-gray-500 mb-3">
              Could be your own band or one you're connected to
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="has_band_in_mind"
                  value="yes"
                  checked={formData.has_band_in_mind === "yes"}
                  onChange={(e) => updateField("has_band_in_mind", e.target.value)}
                  className="mt-1 w-4 h-4 text-porch-600 border-gray-300 focus:ring-porch-500"
                />
                <span className="text-gray-700">
                  Yes <span className="text-sm text-gray-500">(please include band name in comments below and make sure they still submit an application so we have their info)</span>
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="has_band_in_mind"
                  value="no"
                  checked={formData.has_band_in_mind === "no"}
                  onChange={(e) => updateField("has_band_in_mind", e.target.value)}
                  className="w-4 h-4 text-porch-600 border-gray-300 focus:ring-porch-500"
                />
                <span className="text-gray-700">No</span>
              </label>
            </div>
          </fieldset>

          {formData.has_band_in_mind === "no" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                If NO to the above, do you have band/music preferences? We cannot make promises here but will definitely do our best.
              </label>
              <textarea
                value={formData.music_preferences}
                onChange={(e) => updateField("music_preferences", e.target.value)}
                className="input-field min-h-[80px]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many bands do you want to have play, or how long do you want to have music at your home? You can have just one band or multiple!
            </label>
            <textarea
              value={formData.band_count_preference}
              onChange={(e) => updateField("band_count_preference", e.target.value)}
              className="input-field min-h-[80px]"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-3">
              Are you also available to host on the following Sunday if the porchfest Saturday gets rained out?
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rain_date_available"
                  value="yes"
                  checked={formData.rain_date_available === "yes"}
                  onChange={(e) => updateField("rain_date_available", e.target.value)}
                  className="w-4 h-4 text-porch-600 border-gray-300 focus:ring-porch-500"
                />
                <span className="text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rain_date_available"
                  value="no"
                  checked={formData.rain_date_available === "no"}
                  onChange={(e) => updateField("rain_date_available", e.target.value)}
                  className="w-4 h-4 text-porch-600 border-gray-300 focus:ring-porch-500"
                />
                <span className="text-gray-700">No</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rain_date_available"
                  value="maybe"
                  checked={formData.rain_date_available === "maybe"}
                  onChange={(e) => updateField("rain_date_available", e.target.value)}
                  className="w-4 h-4 text-porch-600 border-gray-300 focus:ring-porch-500"
                />
                <span className="text-gray-700">Maybe</span>
              </label>
            </div>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Questions/comments/other things to note?
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => updateField("comments", e.target.value)}
              className="input-field min-h-[100px]"
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
