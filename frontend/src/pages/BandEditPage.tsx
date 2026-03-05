import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL ?? "";

interface BandData {
  id: number;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  genre: string;
  member_count: string;
  music_sample_link: string;
  bio: string;
  set_length: string;
  venmo_handle: string;
  instagram: string;
  spotify: string;
  soundcloud: string;
  bandcamp: string;
  facebook: string;
  website: string;
  scheduling_notes: string;
  equipment_consent: string;
  payment_consent: string;
  timeline_consent: string;
  photo_key: string | null;
  questions_comments: string;
}

export default function BandEditPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [bandJwt, setBandJwt] = useState<string | null>(null);
  const [band, setBand] = useState<BandData | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    questions_comments: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifyError("No token provided. Please use the link from your email.");
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/bands/auth/magic-link/verify?token=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Invalid link");
        }
        const data = await res.json();
        setBand(data.band);
        setBandJwt(data.token);

        setFormData({
          band_name: data.band.band_name || "",
          contact_name: data.band.contact_name || "",
          contact_email: data.band.contact_email || "",
          contact_phone: data.band.contact_phone || "",
          genre: data.band.genre || "",
          member_count: data.band.member_count || "",
          music_sample_link: data.band.music_sample_link || "",
          bio: data.band.bio || "",
          set_length: data.band.set_length || "",
          venmo_handle: data.band.venmo_handle || "",
          instagram: data.band.instagram || "",
          spotify: data.band.spotify || "",
          soundcloud: data.band.soundcloud || "",
          bandcamp: data.band.bandcamp || "",
          facebook: data.band.facebook || "",
          website: data.band.website || "",
          scheduling_notes: data.band.scheduling_notes || "",
          equipment_consent: data.band.equipment_consent || "",
          payment_consent: data.band.payment_consent || "",
          timeline_consent: data.band.timeline_consent || "",
          questions_comments: data.band.questions_comments || "",
        });
      } catch (err) {
        setVerifyError(
          (err as Error).message || "This link is invalid or has expired."
        );
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!band || !bandJwt) return;

    setSaving(true);
    setError(null);

    if (
      formData.equipment_consent !== "agree" ||
      formData.payment_consent !== "agree" ||
      formData.timeline_consent !== "agree"
    ) {
      setError("You must agree to all requirements.");
      setSaving(false);
      return;
    }

    try {
      let photoKey = band.photo_key;

      if (photoFile) {
        const uploadRes = await fetch(
          `${API_URL}/api/bands/auth/upload-url?filename=${encodeURIComponent(photoFile.name)}&contentType=${encodeURIComponent(photoFile.type)}`,
          { headers: { Authorization: `Bearer ${bandJwt}` } }
        );
        if (!uploadRes.ok) throw new Error("Failed to get upload URL");
        const uploadData = await uploadRes.json();

        await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: photoFile,
          headers: { "Content-Type": photoFile.type },
        });
        photoKey = uploadData.key;
      }

      const res = await fetch(`${API_URL}/api/bands/auth/${band.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bandJwt}`,
        },
        body: JSON.stringify({
          ...formData,
          photo_key: photoKey,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save changes");
      }

      setSaved(true);
    } catch (err) {
      setError((err as Error).message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Verifying your link...</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">&#x2717;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Link Invalid
          </h1>
          <p className="text-gray-600">{verifyError}</p>
        </div>
      </div>
    );
  }

  if (saved) {
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
          <h1 className="text-3xl font-bold text-black mb-4">Changes Saved!</h1>
          <p className="text-gray-700 leading-relaxed">
            Your band information for <strong>{formData.band_name}</strong> has
            been updated successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-black mb-3">
            Edit Band Information
          </h1>
          <p className="text-gray-600 text-lg">
            Update your info for <strong>{band?.band_name}</strong>
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
                  onChange={(e) =>
                    setFormData({ ...formData, band_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Name{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Email Address{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Point of Contact Phone Number{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Music style/genre for map listing (1-4 words){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="e.g. Indie Folk, Jazz Fusion"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Number of band members{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.member_count}
                  onChange={(e) =>
                    setFormData({ ...formData, member_count: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Link to music sample (Spotify, YouTube, Bandcamp, etc){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.music_sample_link}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      music_sample_link: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://..."
                  required
                />
              </div>
            </div>
          </section>

          {/* Photo Upload */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-black mb-6">Band Photo</h2>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Upload a new band photo (optional)
              </label>
              {band?.photo_key && !photoFile && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Current photo:</p>
                  <img
                    src={`https://${import.meta.env.VITE_S3_BUCKET || "porchfest-band-photos-dev"}.s3.${import.meta.env.VITE_AWS_REGION || "us-east-2"}.amazonaws.com/${band.photo_key}`}
                    alt="Current band photo"
                    className="w-40 h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
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
                    onChange={(e) =>
                      setPhotoFile(e.target.files?.[0] || null)
                    }
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
                    New photo: {photoFile.name}
                  </p>
                )}
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
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all min-h-[150px]"
                required
              />
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
                <input
                  type="text"
                  value={formData.set_length}
                  onChange={(e) =>
                    setFormData({ ...formData, set_length: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="e.g. 1 hour, 45 minutes"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Venmo for Tips
                </label>
                <input
                  type="text"
                  value={formData.venmo_handle}
                  onChange={(e) =>
                    setFormData({ ...formData, venmo_handle: e.target.value })
                  }
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
              Provide any links you'd like included on the website listing.
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Spotify
                </label>
                <input
                  type="url"
                  value={formData.spotify}
                  onChange={(e) =>
                    setFormData({ ...formData, spotify: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://open.spotify.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  SoundCloud
                </label>
                <input
                  type="url"
                  value={formData.soundcloud}
                  onChange={(e) =>
                    setFormData({ ...formData, soundcloud: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://soundcloud.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Bandcamp
                </label>
                <input
                  type="url"
                  value={formData.bandcamp}
                  onChange={(e) =>
                    setFormData({ ...formData, bandcamp: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://yourband.bandcamp.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.facebook}
                  onChange={(e) =>
                    setFormData({ ...formData, facebook: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Band website/other
                </label>
                <input
                  type="url"
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
              Let us know if you have other commitments on the day of Porchfest.
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
                  Bands are in charge of bringing their own sound equipment.
                  Hosts will provide an outlet/access to electricity.{" "}
                  <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="equipment_consent"
                      value="agree"
                      checked={formData.equipment_consent === "agree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          equipment_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                      required
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
                      This is not okay and Porchfest is not a good fit for
                      me/my band :(
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-medium text-black mb-4 leading-relaxed">
                  Porchfest is not able to pay bands. Bands play for tips only.{" "}
                  <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="payment_consent"
                      value="agree"
                      checked={formData.payment_consent === "agree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                      required
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
                      This is not okay and Porchfest is not a good fit for
                      me/my band :(
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-medium text-black mb-4 leading-relaxed">
                  You will not hear an application decision until June!{" "}
                  <span className="text-red-500">*</span>
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-amber-100 transition-colors">
                    <input
                      type="radio"
                      name="timeline_consent"
                      value="agree"
                      checked={formData.timeline_consent === "agree"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeline_consent: e.target.value,
                        })
                      }
                      className="w-5 h-5 text-porch-600"
                      required
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
                      This is not okay and Porchfest is not a good fit for
                      me/my band :(
                    </span>
                  </label>
                </div>
              </div>
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
