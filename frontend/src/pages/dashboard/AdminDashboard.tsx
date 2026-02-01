import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import VisualScheduler from "./components/VisualScheduler";

type FilterStatus =
  | "all"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

type Section = "overview" | "bands" | "porches" | "scheduler" | "settings";

type BandSortOption =
  | "band_name"
  | "created_at"
  | "status"
  | "porch_assignment";

type PorchSortOption = "address" | "created_at" | "status" | "owner_name";

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") || "overview") as Section;

  const [bands, setBands] = useState<BandApplication[]>([]);
  const [porches, setPorches] = useState<PorchApplication[]>([]);
  const [approvedPorches, setApprovedPorches] = useState<PorchApplication[]>(
    []
  );
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [bandSearch, setBandSearch] = useState("");
  const [bandSort, setBandSort] = useState<BandSortOption>("created_at");
  const [porchSort, setPorchSort] = useState<PorchSortOption>("address");

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

  // Parse address into street name and house number for sorting
  const parseAddress = (address: string | null) => {
    if (!address) return { houseNumber: 0, streetName: "zzz" }; // unassigned goes last
    const match = address.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        houseNumber: parseInt(match[1], 10),
        streetName: match[2].toLowerCase(),
      };
    }
    return { houseNumber: 0, streetName: address.toLowerCase() };
  };

  // Status priority for sorting (pending first, then under_review, approved, rejected)
  const statusPriority: Record<Status, number> = {
    pending: 0,
    under_review: 1,
    approved: 2,
    rejected: 3,
  };

  // Filtered and sorted bands
  const filteredAndSortedBands = useMemo(() => {
    let result = [...bands];

    // Filter by status
    if (filter !== "all") {
      result = result.filter((b) => b.status === filter);
    }

    // Filter by search query
    if (bandSearch.trim()) {
      const query = bandSearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.band_name.toLowerCase().includes(query) ||
          b.contact_name.toLowerCase().includes(query) ||
          b.genre.toLowerCase().includes(query) ||
          b.contact_email.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (bandSort) {
        case "band_name":
          return a.band_name.localeCompare(b.band_name);
        case "status":
          return (
            statusPriority[a.status as Status] -
            statusPriority[b.status as Status]
          );
        case "porch_assignment": {
          const porchA = getPorchAddress(a.assigned_porch_id);
          const porchB = getPorchAddress(b.assigned_porch_id);
          const parsedA = parseAddress(porchA);
          const parsedB = parseAddress(porchB);
          // First sort by street name alphabetically
          const streetCompare = parsedA.streetName.localeCompare(
            parsedB.streetName
          );
          if (streetCompare !== 0) return streetCompare;
          // Then sort by house number descending
          return parsedB.houseNumber - parsedA.houseNumber;
        }
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [bands, filter, bandSearch, bandSort, porches]);

  // Parse address into street name and house number for sorting
  const parsePorchAddress = (address: string) => {
    const match = address.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        houseNumber: parseInt(match[1], 10),
        streetName: match[2].toLowerCase(),
      };
    }
    return { houseNumber: 0, streetName: address.toLowerCase() };
  };

  // Filtered and sorted porches
  const filteredAndSortedPorches = useMemo(() => {
    let result = [...porches];

    // Filter by status
    if (filter !== "all") {
      result = result.filter((p) => p.status === filter);
    }

    // Sort
    result.sort((a, b) => {
      switch (porchSort) {
        case "address": {
          const parsedA = parsePorchAddress(a.address);
          const parsedB = parsePorchAddress(b.address);
          // First sort by street name alphabetically
          const streetCompare = parsedA.streetName.localeCompare(
            parsedB.streetName
          );
          if (streetCompare !== 0) return streetCompare;
          // Then sort by house number ascending
          return parsedA.houseNumber - parsedB.houseNumber;
        }
        case "owner_name":
          return a.owner_name.localeCompare(b.owner_name);
        case "status":
          return (
            statusPriority[a.status as Status] -
            statusPriority[b.status as Status]
          );
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [porches, filter, porchSort]);

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

  const sectionTitles: Record<Section, { title: string; description: string }> =
    {
      overview: {
        title: "Admin Dashboard",
        description: "Review applications and manage the festival",
      },
      bands: {
        title: "Band Applications",
        description: "Review and manage band applications",
      },
      porches: {
        title: "Porch Applications",
        description: "Review and manage porch host applications",
      },
      scheduler: {
        title: "Visual Scheduler",
        description:
          "Drag to select time slots on a porch row, then choose a band",
      },
      settings: {
        title: "Event Settings",
        description: "Configure festival date, time, and details",
      },
    };

  const renderContent = () => {
    switch (section) {
      case "overview":
        return (
          <StatsGrid
            pendingBands={pendingBands}
            pendingPorches={pendingPorches}
            approvedBands={approvedBandsCount}
            approvedPorches={approvedPorchesCount}
          />
        );

      case "bands":
        return (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search bands by name, contact, genre, or email..."
                    value={bandSearch}
                    onChange={(e) => setBandSearch(e.target.value)}
                    className="input-field w-full pl-10"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterStatus)}
                  className="input-field w-full lg:w-48"
                >
                  <option value="all">All Status ({bands.length})</option>
                  <option value="pending">
                    Pending (
                    {bands.filter((b) => b.status === "pending").length})
                  </option>
                  <option value="under_review">
                    Under Review (
                    {bands.filter((b) => b.status === "under_review").length})
                  </option>
                  <option value="approved">
                    Approved (
                    {bands.filter((b) => b.status === "approved").length})
                  </option>
                  <option value="rejected">
                    Rejected (
                    {bands.filter((b) => b.status === "rejected").length})
                  </option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={bandSort}
                  onChange={(e) =>
                    setBandSort(e.target.value as BandSortOption)
                  }
                  className="input-field w-full lg:w-52"
                >
                  <option value="created_at">Sort: Newest First</option>
                  <option value="band_name">Sort: Band Name (A-Z)</option>
                  <option value="status">Sort: Status</option>
                  <option value="porch_assignment">
                    Sort: Porch Assignment
                  </option>
                </select>
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-500">
                Showing {filteredAndSortedBands.length} of {bands.length} bands
                {bandSearch && ` matching "${bandSearch}"`}
              </div>
            </div>

            {filteredAndSortedBands.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                {bandSearch ? (
                  <>
                    No bands found matching "{bandSearch}"
                    <button
                      onClick={() => setBandSearch("")}
                      className="block mx-auto mt-2 text-porch-600 hover:text-porch-700 font-medium"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  "No bands to display"
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAndSortedBands.map((band) => (
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
            )}
          </>
        );

      case "porches":
        return (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Status Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterStatus)}
                  className="input-field w-full lg:w-48"
                >
                  <option value="all">All Status ({porches.length})</option>
                  <option value="pending">
                    Pending (
                    {porches.filter((p) => p.status === "pending").length})
                  </option>
                  <option value="under_review">
                    Under Review (
                    {porches.filter((p) => p.status === "under_review").length})
                  </option>
                  <option value="approved">
                    Approved (
                    {porches.filter((p) => p.status === "approved").length})
                  </option>
                  <option value="rejected">
                    Rejected (
                    {porches.filter((p) => p.status === "rejected").length})
                  </option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={porchSort}
                  onChange={(e) =>
                    setPorchSort(e.target.value as PorchSortOption)
                  }
                  className="input-field w-full lg:w-56"
                >
                  <option value="address">Sort: Street Name & Number</option>
                  <option value="owner_name">Sort: Owner Name (A-Z)</option>
                  <option value="status">Sort: Status</option>
                  <option value="created_at">Sort: Newest First</option>
                </select>
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-500">
                Showing {filteredAndSortedPorches.length} of {porches.length}{" "}
                porches
              </div>
            </div>

            {filteredAndSortedPorches.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                No porches to display
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAndSortedPorches.map((porch) => (
                  <PorchCard
                    key={porch.id}
                    porch={porch}
                    scheduledBands={getBandsAtPorch(porch.id)}
                    onStatusChange={updatePorchStatus}
                    eventStartTime={eventSettings?.start_time || "12:00"}
                    eventEndTime={eventSettings?.end_time || "18:00"}
                  />
                ))}
              </div>
            )}
          </>
        );

      case "scheduler":
        return (
          <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden">
            {approvedPorches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No approved porches available. Approve some porches first to
                start scheduling.
              </div>
            ) : (
              <VisualScheduler
                bands={bands}
                porches={approvedPorches}
                eventStartTime={eventSettings?.start_time || "12:00"}
                eventEndTime={eventSettings?.end_time || "18:00"}
                onScheduleBand={scheduleBand}
              />
            )}
          </div>
        );

      case "settings":
        return eventSettings ? (
          <EventSettingsComponent
            event={eventSettings}
            onSave={updateEventSettings}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Loading event settings...
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">
          {sectionTitles[section].title}
        </h1>
        <p className="text-gray-600 mt-1">
          {sectionTitles[section].description}
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
