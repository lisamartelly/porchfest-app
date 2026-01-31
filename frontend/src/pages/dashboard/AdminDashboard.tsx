import { useState, useEffect } from "react";
import { api } from "../../lib/supabase";

// Band application type
interface BandApplication {
  id: string;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  genre: string;
  member_count: string;
  music_sample_link: string;
  bio: string;
  set_length: string;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  has_photo: boolean;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

// Porch application type
interface PorchApplication {
  id: string;
  owner_name: string;
  email: string;
  address: string;
  city: string;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [bands, setBands] = useState<BandApplication[]>([]);
  const [porches, setPorches] = useState<PorchApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bands" | "porches">("bands");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [expandedBand, setExpandedBand] = useState<string | null>(null);
  const [expandedPorch, setExpandedPorch] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bandData, porchData] = await Promise.all([
        api.get("/api/admin/bands"),
        api.get("/api/admin/porches"),
      ]);
      setBands(bandData || []);
      setPorches(porchData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBandStatus = async (bandId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`/api/admin/bands/${bandId}/status`, { status });
      setBands(bands.map((b) => (b.id === bandId ? { ...b, status } : b)));
    } catch (error) {
      console.error("Error updating band status:", error);
    }
  };

  const updatePorchStatus = async (porchId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`/api/admin/porches/${porchId}/status`, { status });
      setPorches(porches.map((p) => (p.id === porchId ? { ...p, status } : p)));
    } catch (error) {
      console.error("Error updating porch status:", error);
    }
  };

  const filteredBands = filter === "all" ? bands : bands.filter((b) => b.status === filter);
  const filteredPorches = filter === "all" ? porches : porches.filter((p) => p.status === filter);

  const pendingBands = bands.filter((b) => b.status === "pending").length;
  const pendingPorches = porches.filter((p) => p.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Review applications and manage the festival</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Bands</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingBands}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Porches</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingPorches}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Bands</h3>
          <p className="text-3xl font-bold text-green-600">
            {bands.filter((b) => b.status === "approved").length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Porches</h3>
          <p className="text-3xl font-bold text-green-600">
            {porches.filter((p) => p.status === "approved").length}
          </p>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("bands")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "bands"
                ? "bg-porch-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bands ({bands.length})
          </button>
          <button
            onClick={() => setActiveTab("porches")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "porches"
                ? "bg-porch-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Porches ({porches.length})
          </button>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="input-field w-48"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {activeTab === "bands" ? (
          filteredBands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No bands to display</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredBands.map((band) => (
                <div key={band.id} className="p-6">
                  {/* Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{band.band_name}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            band.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : band.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {band.status}
                        </span>
                      </div>

                      <p className="text-sm text-porch-600 mb-2">{band.genre}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <span>👤 {band.contact_name}</span>
                        <span>👥 {band.member_count} members</span>
                        <span>⏱️ {band.set_length}</span>
                        <span>📅 {new Date(band.created_at).toLocaleDateString()}</span>
                      </div>

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
                          <a href={band.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">
                            Instagram
                          </a>
                        )}
                        {band.spotify && (
                          <a href={band.spotify} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">
                            Spotify
                          </a>
                        )}
                        {band.website && (
                          <a href={band.website} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">
                            Website
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedBand(expandedBand === band.id ? null : band.id)}
                        className="text-sm text-porch-600 hover:text-porch-700 font-medium"
                      >
                        {expandedBand === band.id ? "▼ Hide Details" : "▶ Show All Details"}
                      </button>
                    </div>

                    {band.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBandStatus(band.id, "approved")}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => updateBandStatus(band.id, "rejected")}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedBand === band.id && (
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Contact Info */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-gray-500">Name:</span> {band.contact_name}</p>
                            <p><span className="text-gray-500">Email:</span> <a href={`mailto:${band.contact_email}`} className="text-porch-600">{band.contact_email}</a></p>
                            <p><span className="text-gray-500">Phone:</span> <a href={`tel:${band.contact_phone}`} className="text-porch-600">{band.contact_phone}</a></p>
                          </div>
                        </div>

                        {/* Performance Info */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Performance Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-gray-500">Members:</span> {band.member_count}</p>
                            <p><span className="text-gray-500">Ideal Set Length:</span> {band.set_length}</p>
                            <p><span className="text-gray-500">Venmo:</span> {band.venmo_handle || "Not provided"}</p>
                            <p><span className="text-gray-500">Has Photo:</span> {band.has_photo ? "Yes" : "No"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Bio</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{band.bio}</p>
                      </div>

                      {/* Social Links */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Social Media & Links</h4>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <a href={band.music_sample_link} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-porch-100 text-porch-700 rounded-full hover:bg-porch-200">
                            🎵 Music Sample
                          </a>
                          {band.instagram && (
                            <a href={band.instagram} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200">
                              Instagram
                            </a>
                          )}
                          {band.spotify && (
                            <a href={band.spotify} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200">
                              Spotify
                            </a>
                          )}
                          {band.soundcloud && (
                            <a href={band.soundcloud} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200">
                              SoundCloud
                            </a>
                          )}
                          {band.bandcamp && (
                            <a href={band.bandcamp} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
                              Bandcamp
                            </a>
                          )}
                          {band.facebook && (
                            <a href={band.facebook} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
                              Facebook
                            </a>
                          )}
                          {band.website && (
                            <a href={band.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                              Website
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Scheduling Notes */}
                      {band.scheduling_notes && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Scheduling Notes</h4>
                          <p className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg">{band.scheduling_notes}</p>
                        </div>
                      )}

                      {/* Questions/Comments */}
                      {band.questions_comments && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Questions/Comments</h4>
                          <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg">{band.questions_comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredPorches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No porches to display</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPorches.map((porch) => (
              <div key={porch.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{porch.address}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          porch.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : porch.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {porch.status}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-2">{porch.city}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      <span>👤 {porch.owner_name}</span>
                      <span>📧 {porch.email}</span>
                      <span>👥 Capacity: {porch.capacity || "?"}</span>
                      <span>{porch.has_power ? "⚡ Has power" : "🔋 No power"}</span>
                      <span>📅 {new Date(porch.created_at).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => setExpandedPorch(expandedPorch === porch.id ? null : porch.id)}
                      className="text-sm text-porch-600 hover:text-porch-700 font-medium"
                    >
                      {expandedPorch === porch.id ? "▼ Hide Details" : "▶ Show All Details"}
                    </button>

                    {expandedPorch === porch.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {porch.parking_notes && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Parking Notes:</span>
                            <p className="text-sm text-gray-600 mt-1">{porch.parking_notes}</p>
                          </div>
                        )}
                        {porch.accessibility_notes && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Accessibility:</span>
                            <p className="text-sm text-gray-600 mt-1">{porch.accessibility_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {porch.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePorchStatus(porch.id, "approved")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => updatePorchStatus(porch.id, "rejected")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
