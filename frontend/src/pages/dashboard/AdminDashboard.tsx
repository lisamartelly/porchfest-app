import { useState, useEffect } from "react";
import { api } from "../../lib/supabase";
import {
  BandApplication,
  PorchApplication,
  Status,
  EventSettings,
} from "./types";
import StatsGrid from "./components/StatsGrid";
import BandCard from "./components/BandCard";
import PorchCard from "./components/PorchCard";
import EventSettingsComponent from "./components/EventSettings";

type FilterStatus =
  | "all"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export default function AdminDashboard() {
  const [bands, setBands] = useState<BandApplication[]>([]);
  const [porches, setPorches] = useState<PorchApplication[]>([]);
  const [approvedPorches, setApprovedPorches] = useState<PorchApplication[]>(
    []
  );
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bands" | "porches">("bands");
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [schedulingError, setSchedulingError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bandData, porchData, eventData] = await Promise.all([
        api.get("/api/admin/bands"),
        api.get("/api/admin/porches"),
        api.get("/api/admin/event"),
      ]);
      setBands(bandData || []);
      setPorches(porchData || []);
      setApprovedPorches(
        (porchData || []).filter(
          (p: PorchApplication) => p.status === "approved"
        )
      );
      setEventSettings(eventData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateEventSettings = async (updates: Partial<EventSettings>) => {
    try {
      const updated = await api.patch("/api/admin/event", updates);
      setEventSettings(updated);
    } catch (error) {
      console.error("Error updating event settings:", error);
    }
  };

  const updateBandStatus = async (bandId: string, status: Status) => {
    try {
      const updatedBand = await api.patch(`/api/admin/bands/${bandId}/status`, {
        status,
      });
      setBands(bands.map((b) => (b.id === bandId ? updatedBand : b)));
    } catch (error) {
      console.error("Error updating band status:", error);
    }
  };

  const updatePorchStatus = async (porchId: string, status: Status) => {
    try {
      const updatedPorch = await api.patch(
        `/api/admin/porches/${porchId}/status`,
        { status }
      );
      setPorches(porches.map((p) => (p.id === porchId ? updatedPorch : p)));
      if (status === "approved") {
        const porch = porches.find((p) => p.id === porchId);
        if (porch) {
          setApprovedPorches([
            ...approvedPorches,
            { ...porch, status: "approved" },
          ]);
        }
      } else {
        setApprovedPorches(approvedPorches.filter((p) => p.id !== porchId));
      }
    } catch (error) {
      console.error("Error updating porch status:", error);
    }
  };

  const scheduleBand = async (
    bandId: string,
    assigned_porch_id: string | null,
    set_start_time: string | null,
    set_end_time: string | null
  ) => {
    setSchedulingError(null);
    try {
      const updatedBand = await api.patch(
        `/api/admin/bands/${bandId}/schedule`,
        { assigned_porch_id, set_start_time, set_end_time }
      );
      setBands(bands.map((b) => (b.id === bandId ? updatedBand : b)));
    } catch (error: unknown) {
      const err = error as Error;
      setSchedulingError(err.message || "Failed to schedule band");
      throw error;
    }
  };

  const getPorchAddress = (porchId: string | null) => {
    if (!porchId) return null;
    const porch = porches.find((p) => p.id === porchId);
    return porch?.address || null;
  };

  const getBandsAtPorch = (porchId: string) => {
    return bands
      .filter((b) => b.assigned_porch_id === porchId && b.set_start_time)
      .sort((a, b) => {
        if (!a.set_start_time || !b.set_start_time) return 0;
        return a.set_start_time.localeCompare(b.set_start_time);
      });
  };

  const filteredBands =
    filter === "all" ? bands : bands.filter((b) => b.status === filter);
  const filteredPorches =
    filter === "all" ? porches : porches.filter((p) => p.status === filter);

  const pendingBands = bands.filter((b) => b.status === "pending").length;
  const pendingPorches = porches.filter((p) => p.status === "pending").length;
  const approvedBandsCount = bands.filter(
    (b) => b.status === "approved"
  ).length;
  const approvedPorchesCount = porches.filter(
    (p) => p.status === "approved"
  ).length;

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
        <h1 className="font-display text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Review applications and manage the festival
        </p>
      </div>

      {eventSettings && (
        <EventSettingsComponent
          event={eventSettings}
          onSave={updateEventSettings}
        />
      )}

      <StatsGrid
        pendingBands={pendingBands}
        pendingPorches={pendingPorches}
        approvedBands={approvedBandsCount}
        approvedPorches={approvedPorchesCount}
      />

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
          onChange={(e) => setFilter(e.target.value as FilterStatus)}
          className="input-field w-48"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {activeTab === "bands" ? (
          filteredBands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No bands to display
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredBands.map((band) => (
                <BandCard
                  key={band.id}
                  band={band}
                  approvedPorches={approvedPorches}
                  eventStartTime={eventSettings?.start_time || "12:00"}
                  eventEndTime={eventSettings?.end_time || "18:00"}
                  onStatusChange={updateBandStatus}
                  onSchedule={scheduleBand}
                  getPorchAddress={getPorchAddress}
                  schedulingError={schedulingError}
                />
              ))}
            </div>
          )
        ) : filteredPorches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No porches to display
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPorches.map((porch) => (
              <PorchCard
                key={porch.id}
                porch={porch}
                scheduledBands={getBandsAtPorch(porch.id)}
                onStatusChange={updatePorchStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
