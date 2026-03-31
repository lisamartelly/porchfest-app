import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../lib/dateUtils";

interface OrgEventInfo {
  organization: { id: string; name: string; slug: string };
  event: {
    id: string;
    name: string;
    date: string;
  } | null;
}

export default function BandLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgEvent, setOrgEvent] = useState<OrgEventInfo | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    setSending(true);
    setError(null);

    try {
      await api.post("/api/bands/auth/magic-link", { slug, email });
      setSent(true);
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setSending(false);
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

  if (sent) {
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black mb-4">Check Your Email</h1>
          <p className="text-gray-700 mb-2 leading-relaxed">
            If a band with the email <strong className="text-black">{email}</strong> has
            applied to <strong>{orgEvent.event.name}</strong>, you'll receive an
            email with a link to edit your information.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            The link expires in 1 hour and can only be used once.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-black mb-3">
            Edit Your Band Info
          </h1>
          <p className="text-gray-600 text-lg">
            {orgEvent.event.name}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {orgEvent.organization.name} &middot;{" "}
            {formatDate(orgEvent.event.date)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600 mb-6 leading-relaxed">
            Enter the email address you used when you applied. We'll send you a
            link to edit your band information.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-porch-500 focus:border-porch-500 focus:bg-white transition-all"
                placeholder="your@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-porch-600 hover:bg-porch-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
