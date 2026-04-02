import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
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
  band_applications_open_date: string | null;
  band_applications_close_date: string | null;
  porch_applications_open_date: string | null;
  porch_applications_close_date: string | null;
}

export default function BandApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgEvent, setOrgEvent] = useState<OrgEventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    band_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    genre: "",
    member_count: "",
    music_sample_link: "",
    bio: "",
    set_length: "",
    venmo_handle: "",
    instagram: "",
    spotify: "",
    soundcloud: "",
    bandcamp: "",
    facebook: "",
    website: "",
    scheduling_notes: "",
    equipment_consent: "",
    payment_consent: "",
    timeline_consent: "",
    confirm_equipment: false,
    confirm_no_pay: false,
    confirm_timeline: false,
    questions_comments: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
    band_name: 255,
    contact_name: 255,
    contact_email: 255,
    contact_phone: 50,
    genre: 100,
    member_count: 100,
    set_length: 100,
    venmo_handle: 100,
    instagram: 100,
    spotify: 100,
    soundcloud: 100,
    bandcamp: 100,
    facebook: 100,
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.band_name.trim()) errors.band_name = "Band name is required.";
    if (!formData.contact_name.trim()) errors.contact_name = "Contact name is required.";
    if (!formData.contact_email.trim()) errors.contact_email = "Email is required.";
    if (!formData.contact_phone.trim()) errors.contact_phone = "Phone number is required.";
    if (!formData.genre.trim()) errors.genre = "Genre is required.";
    if (!formData.member_count.trim()) errors.member_count = "Member count is required.";
    if (!formData.music_sample_link.trim()) errors.music_sample_link = "Music sample link is required.";
    if (!formData.bio.trim()) errors.bio = "Bio is required.";
    if (!formData.set_length.trim()) errors.set_length = "Set length is required.";
    if (!photoFile) errors.photo = "A band photo is required.";
    if (formData.equipment_consent !== "agree") errors.equipment_consent = "You must agree to bring your own equipment.";
    if (formData.payment_consent !== "agree") errors.payment_consent = "You must agree to the payment terms.";
    if (formData.timeline_consent !== "agree") errors.timeline_consent = "You must agree to the timeline.";
    if (!formData.confirm_equipment) errors.confirm_equipment = "Please confirm all acknowledgements.";
    if (!formData.confirm_no_pay) errors.confirm_no_pay = "Please confirm all acknowledgements.";
    if (!formData.confirm_timeline) errors.confirm_timeline = "Please confirm all acknowledgements.";

    for (const [field, max] of Object.entries(FIELD_LIMITS)) {
      const val = formData[field as keyof typeof formData];
      if (typeof val === "string" && val.length > max && !errors[field]) {
        errors[field] = `Must be ${max} characters or fewer.`;
      }
    }

    return errors;
  };

  const fetchEventInfo = useCallback(async () => {
    try {
      const data = await api.get(`/api/events/org/${slug}`);
      setOrgEvent(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLoadError("Organization not found.");
      } else {
        setLoadError("Something went wrong. Please try again in a moment.");
      }
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
      let photoKey: string | null = null;

      if (photoFile) {
        const uploadData = await api.get(
          `/api/bands/upload-url?filename=${encodeURIComponent(photoFile.name)}&contentType=${encodeURIComponent(photoFile.type)}`
        );
        await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: photoFile,
          headers: { "Content-Type": photoFile.type },
        });
        photoKey = uploadData.key;
      }

      await api.post("/api/bands/apply", {
        ...formData,
        event_id: orgEvent!.event!.id,
        photo_key: photoKey,
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

  if (!orgEvent.band_applications_open) {
    const hasWindow =
      orgEvent.band_applications_open_date ||
      orgEvent.band_applications_close_date;
    const windowMessage = hasWindow ? (
      <>
        Application window:{" "}
        {orgEvent.band_applications_open_date
          ? formatDate(orgEvent.band_applications_open_date)
          : "TBD"}
        {" – "}
        {orgEvent.band_applications_close_date
          ? formatDate(orgEvent.band_applications_close_date)
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
            Band applications for <strong>{orgEvent.event.name}</strong>.{" "}
            {windowMessage}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black mb-4">
            Application Submitted!
          </h1>
          <p className="text-gray-700 mb-8 leading-relaxed">
            Thanks for applying to <strong>{orgEvent.event.name}</strong>! We'll
            review your application and get back to you at{" "}
            <strong className="text-black">{formData.contact_email}</strong>.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-black mb-3">
            Band Application
          </h1>
          <p className="text-gray-600 text-lg">
            Apply to perform at {orgEvent.event.name}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {orgEvent.organization.name} &middot;{" "}
            {formatDate(orgEvent.event.date)}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">
              Basic Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Name of Band/Stage Name{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.band_name}
                  onChange={(e) => {
                    setFormData({ ...formData, band_name: e.target.value });
                    clearFieldError("band_name");
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.band_name ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.band_name && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.band_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Name{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_name: e.target.value });
                    clearFieldError("contact_name");
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.contact_name ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.contact_name && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.contact_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Email Address{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_email: e.target.value });
                    clearFieldError("contact_email");
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.contact_email ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.contact_email && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.contact_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Phone Number{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_phone: e.target.value });
                    clearFieldError("contact_phone");
                  }}
                  maxLength={50}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.contact_phone ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.contact_phone && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.contact_phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Music style/genre for map listing (1-4 words){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => {
                    setFormData({ ...formData, genre: e.target.value });
                    clearFieldError("genre");
                  }}
                  maxLength={100}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.genre ? "border-red-400" : "border-gray-300"}`}
                  placeholder="e.g. Indie Folk, Jazz Fusion"
                />
                {fieldErrors.genre && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.genre}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Number of band members{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.member_count}
                  onChange={(e) => {
                    setFormData({ ...formData, member_count: e.target.value });
                    clearFieldError("member_count");
                  }}
                  maxLength={100}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.member_count ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.member_count && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.member_count}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Link to music sample (Spotify, YouTube, Bandcamp, etc){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.music_sample_link}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      music_sample_link: e.target.value,
                    });
                    clearFieldError("music_sample_link");
                  }}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.music_sample_link ? "border-red-400" : "border-gray-300"}`}
                  placeholder="https://..."
                />
                {fieldErrors.music_sample_link && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.music_sample_link}</p>}
              </div>
            </div>
          </section>

          {/* Photo Upload */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">Band Photo</h2>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Upload a band photo for use on our website and social media{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-1 text-sm text-gray-600">
                      <span className="font-semibold text-porch-600">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setPhotoFile(e.target.files?.[0] || null);
                      clearFieldError("photo");
                    }}
                    className="hidden"
                  />
                </label>
                {photoFile && (
                  <p className="mt-3 text-sm text-green-700 font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Selected: {photoFile.name}
                  </p>
                )}
                {fieldErrors.photo && <p data-field-error className="mt-2 text-sm text-red-600">{fieldErrors.photo}</p>}
              </div>
            </div>
          </section>

          {/* Bio */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">Band Bio</h2>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Musician/Band Bio for Website and Social Media{" "}
                <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Please take this seriously! We often have bands wanting to change
                their bio after getting accepted because they threw something
                together for this application that they don't like. Take your
                time! We can't guarantee we will be able to make updates like this
                after the fact.
              </p>
              <textarea
                value={formData.bio}
                onChange={(e) => {
                  setFormData({ ...formData, bio: e.target.value });
                  clearFieldError("bio");
                }}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all min-h-[150px] ${fieldErrors.bio ? "border-red-400" : "border-gray-300"}`}
              />
              {fieldErrors.bio && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.bio}</p>}
            </div>
          </section>

          {/* Performance Details */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">
              Performance Details
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Set Length <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  What is the ideal set length you'd like to perform (up to 2
                  hours)? We cannot guarantee accommodating set length preferences
                  depending on the number of bands that participate, but it is
                  helpful to know how much material you have/would like to
                  perform.
                </p>
                <input
                  type="text"
                  value={formData.set_length}
                  onChange={(e) => {
                    setFormData({ ...formData, set_length: e.target.value });
                    clearFieldError("set_length");
                  }}
                  maxLength={100}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all ${fieldErrors.set_length ? "border-red-400" : "border-gray-300"}`}
                  placeholder="e.g. 1 hour, 45 minutes"
                />
                {fieldErrors.set_length && <p data-field-error className="mt-1 text-sm text-red-600">{fieldErrors.set_length}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Venmo for Tips
                </label>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  We will display this during Porchfest and on a band page online
                  to streamline band tips from attendees
                </p>
                <input
                  type="text"
                  value={formData.venmo_handle}
                  onChange={(e) =>
                    setFormData({ ...formData, venmo_handle: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="@yourvenmo"
                />
              </div>
            </div>
          </section>

          {/* Social Media Links */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Social Media & Streaming Links
            </h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              If you would like any links included on our website listing for your
              band, please provide them below. It is NOT required to complete all
              fields, just provide the ones you would like included.
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Spotify
                </label>
                <input
                  type="text"
                  value={formData.spotify}
                  onChange={(e) =>
                    setFormData({ ...formData, spotify: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://open.spotify.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  SoundCloud
                </label>
                <input
                  type="text"
                  value={formData.soundcloud}
                  onChange={(e) =>
                    setFormData({ ...formData, soundcloud: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://soundcloud.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Bandcamp
                </label>
                <input
                  type="text"
                  value={formData.bandcamp}
                  onChange={(e) =>
                    setFormData({ ...formData, bandcamp: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://yourband.bandcamp.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Facebook
                </label>
                <input
                  type="text"
                  value={formData.facebook}
                  onChange={(e) =>
                    setFormData({ ...formData, facebook: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Band website/other
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>

          {/* Scheduling Notes */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Day-of Scheduling Notes
            </h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Let us know if you have other commitments on the day of Porchfest
              that need to be scheduled around. Please note that it is pretty
              complicated to fit all of this together, so please be flexible and
              only list true conflicts.
            </p>

            <textarea
              value={formData.scheduling_notes}
              onChange={(e) =>
                setFormData({ ...formData, scheduling_notes: e.target.value })
              }
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all min-h-[100px]"
            />
          </section>

          {/* Consent Questions */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">
              Important Agreements
            </h2>

            <div className="space-y-8">
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-medium text-black mb-4 leading-relaxed">
                  Bands are in charge of bringing their own sound equipment to
                  Porchfest. Hosts/the event are not able to provide this. Hosts
                  will provide an outlet/access to electricity. Please indicate
                  that you understand this requirement and are prepared to supply
                  your own PA. <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="equipment_consent"
                      value="agree"
                      checked={formData.equipment_consent === "agree"}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          equipment_consent: e.target.value,
                        });
                        clearFieldError("equipment_consent");
                      }}
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      I understand and that's okay!
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="equipment_consent"
                      value="disagree"
                      checked={formData.equipment_consent === "disagree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          equipment_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      This is not okay and Porchfest is not a good fit for me/my
                      band :(
                    </span>
                  </label>
                </div>
                {fieldErrors.equipment_consent && <p data-field-error className="mt-2 text-sm text-red-600">{fieldErrors.equipment_consent}</p>}
              </div>

              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-medium text-black mb-4 leading-relaxed">
                  Porchfest is not able to pay bands. We wish we could! But we
                  have no budget and hundreds of performers! Bands play for tips
                  only. Please indicate that you understand and agree to this as
                  well! <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="payment_consent"
                      value="agree"
                      checked={formData.payment_consent === "agree"}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          payment_consent: e.target.value,
                        });
                        clearFieldError("payment_consent");
                      }}
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      I understand! This is also okay!
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="payment_consent"
                      value="disagree"
                      checked={formData.payment_consent === "disagree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      This is not okay and Porchfest is not a good fit for me/my
                      band :(
                    </span>
                  </label>
                </div>
                {fieldErrors.payment_consent && <p data-field-error className="mt-2 text-sm text-red-600">{fieldErrors.payment_consent}</p>}
              </div>

              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-medium text-black mb-4 leading-relaxed">
                  You will not hear an application decision until June! And it
                  will likely be later than that that you get your porch
                  assignment! Please indicate that you understand and will be
                  patient as we wait for all applications to come in before
                  reviewing. <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="timeline_consent"
                      value="agree"
                      checked={formData.timeline_consent === "agree"}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          timeline_consent: e.target.value,
                        });
                        clearFieldError("timeline_consent");
                      }}
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      I understand yet again! A-okay!
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="timeline_consent"
                      value="disagree"
                      checked={formData.timeline_consent === "disagree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeline_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                    />
                    <span className="text-black">
                      This is not okay and Porchfest is not a good fit for me/my
                      band :(
                    </span>
                  </label>
                </div>
                {fieldErrors.timeline_consent && <p data-field-error className="mt-2 text-sm text-red-600">{fieldErrors.timeline_consent}</p>}
              </div>
            </div>
          </section>

          {/* Confirmation Checkboxes */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Final Confirmation
            </h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Select below all of the things that you just agreed to! We just want
              to make sure everyone has the right expectations and therefore a
              great experience :) <span className="text-red-500">*</span>
            </p>

            <div className="space-y-4">
              <label className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border hover:border-porch-300 hover:bg-porch-50 transition-all ${fieldErrors.confirm_equipment ? "border-red-400" : "border-gray-200"}`}>
                <input
                  type="checkbox"
                  checked={formData.confirm_equipment}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirm_equipment: e.target.checked,
                    });
                    clearFieldError("confirm_equipment");
                  }}
                  className="w-5 h-5 text-porch-600 rounded border-gray-300"
                />
                <span className="text-black font-medium">
                  Bands are in charge of their own sound/PA
                </span>
              </label>
              <label className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border hover:border-porch-300 hover:bg-porch-50 transition-all ${fieldErrors.confirm_no_pay ? "border-red-400" : "border-gray-200"}`}>
                <input
                  type="checkbox"
                  checked={formData.confirm_no_pay}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirm_no_pay: e.target.checked,
                    });
                    clearFieldError("confirm_no_pay");
                  }}
                  className="w-5 h-5 text-porch-600 rounded border-gray-300"
                />
                <span className="text-black font-medium">
                  Porchfest does not pay bands directly
                </span>
              </label>
              <label className={`flex items-center gap-4 cursor-pointer p-4 rounded-lg border hover:border-porch-300 hover:bg-porch-50 transition-all ${fieldErrors.confirm_timeline ? "border-red-400" : "border-gray-200"}`}>
                <input
                  type="checkbox"
                  checked={formData.confirm_timeline}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirm_timeline: e.target.checked,
                    });
                    clearFieldError("confirm_timeline");
                  }}
                  className="w-5 h-5 text-porch-600 rounded border-gray-300"
                />
                <span className="text-black font-medium">
                  You will find out if you're selected in June
                </span>
              </label>
              {(fieldErrors.confirm_equipment || fieldErrors.confirm_no_pay || fieldErrors.confirm_timeline) && (
                <p data-field-error className="mt-1 text-sm text-red-600">Please confirm all acknowledgements.</p>
              )}
            </div>
          </section>

          {/* Questions/Comments */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">
              Questions / Comments
            </h2>

            <textarea
              value={formData.questions_comments}
              onChange={(e) =>
                setFormData({ ...formData, questions_comments: e.target.value })
              }
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all min-h-[100px]"
              placeholder="Any questions or comments for us?"
            />
          </section>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-porch-600 hover:bg-porch-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {saving ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
