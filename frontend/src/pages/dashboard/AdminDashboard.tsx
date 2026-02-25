import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import {
  BandApplication,
  PorchApplication,
  Status,
  EventSettings,
} from "./types";
import StatsGrid from "./components/StatsGrid";
import BandCard from "./components/BandCard";
import PorchCard from "./components/PorchCard";
import EventSettingsEditor from "./components/EventSettings";
import VisualScheduler from "./components/VisualScheduler";

type FilterStatus =
  | "all"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

type Section =
  | "overview"
  | "bands"
  | "porches"
  | "assignments"
  | "my-reviews"
  | "scheduler"
  | "events"
  | "organizations"
  | "manage-admins";

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  organizations: { id: string; name: string }[];
}

interface EventWithOrg {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  organization_id: string;
  organization?: { id: string; name: string };
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  reviewer_emails: string[];
  reviewers_assigned: boolean;
}

type BandSortOption =
  | "band_name"
  | "created_at"
  | "status"
  | "porch_assignment"
  | "reviewer"
  | "rating";

type PorchSortOption = "address" | "created_at" | "status" | "owner_name";

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") || "overview") as Section;
  const { user } = useAuthStore();

  const [bands, setBands] = useState<BandApplication[]>([]);
  const [porches, setPorches] = useState<PorchApplication[]>([]);
  const [approvedPorches, setApprovedPorches] = useState<PorchApplication[]>(
    [],
  );
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [bandSearch, setBandSearch] = useState("");
  const [bandSort, setBandSort] = useState<BandSortOption>("created_at");
  const [porchSort, setPorchSort] = useState<PorchSortOption>("address");

  // Reviewer assignment state
  const [reviewerEmailsInput, setReviewerEmailsInput] = useState("");
  const [assigningReviewers, setAssigningReviewers] = useState(false);
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [myReviewBands, setMyReviewBands] = useState<BandApplication[]>([]);

  // Super-duper-admin state
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [myEvents, setMyEvents] = useState<EventWithOrg[]>([]);
  const [myOrgs, setMyOrgs] = useState<OrgSummary[]>([]);

  // New org form
  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    description: "",
    website: "",
    contact_email: "",
  });
  const [orgFormError, setOrgFormError] = useState<string | null>(null);
  const [orgFormSuccess, setOrgFormSuccess] = useState(false);

  // New admin form
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    role: "admin",
    organization_id: "",
  });
  const [adminFormError, setAdminFormError] = useState<string | null>(null);
  const [adminFormSuccess, setAdminFormSuccess] = useState(false);

  // Selected event for editing
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // New event form
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    date: "",
    start_time: "12:00",
    end_time: "18:00",
    description: "",
    organization_id: "",
  });
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  const [eventFormSuccess, setEventFormSuccess] = useState(false);

  const isSuperDuperAdmin = user?.role === "super-duper-admin";

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (section === "my-reviews") {
      fetchMyReviews();
    }
    if (section === "organizations" && isSuperDuperAdmin) {
      fetchOrganizations();
    }
    if (section === "manage-admins" && isSuperDuperAdmin) {
      fetchAdminUsers();
      fetchOrganizations();
    }
    if (section === "events") {
      fetchMyEvents();
      fetchMyOrgs();
    }
  }, [section]);

  const fetchData = async () => {
    try {
      const [bandData, porchData, eventData, reviewerData] = await Promise.all([
        api.get("/api/admin/bands"),
        api.get("/api/admin/porches"),
        api.get("/api/admin/event"),
        api.get("/api/admin/reviewers"),
      ]);
      setBands(bandData || []);
      setPorches(porchData || []);
      setApprovedPorches(
        (porchData || []).filter(
          (p: PorchApplication) => p.status === "approved",
        ),
      );
      setEventSettings(eventData);
      setReviewers(reviewerData || []);
      if (eventData?.reviewer_emails) {
        setReviewerEmailsInput(eventData.reviewer_emails.join(", "));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReviews = async () => {
    try {
      const myBands = await api.get("/api/admin/bands/my-reviews");
      setMyReviewBands(myBands || []);
    } catch (error) {
      console.error("Error fetching my reviews:", error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.get("/api/admin/organizations");
      setOrganizations(orgs || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const users = await api.get("/api/admin/users");
      setAdminUsers(users || []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  const fetchMyEvents = async () => {
    try {
      const events = await api.get("/api/admin/my-events");
      setMyEvents(events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchMyOrgs = async () => {
    try {
      const orgs = await api.get("/api/admin/my-organizations");
      setMyOrgs(orgs || []);
    } catch (error) {
      console.error("Error fetching orgs:", error);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgFormError(null);
    setOrgFormSuccess(false);
    try {
      await api.post("/api/admin/organizations", newOrgForm);
      setOrgFormSuccess(true);
      setNewOrgForm({ name: "", slug: "", city: "", state: "", description: "", website: "", contact_email: "" });
      fetchOrganizations();
    } catch (error) {
      setOrgFormError((error as Error).message || "Failed to create organization");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);
    setAdminFormSuccess(false);
    try {
      await api.post("/api/admin/users", newAdminForm);
      setAdminFormSuccess(true);
      setNewAdminForm({ email: "", password: "", role: "admin", organization_id: "" });
      fetchAdminUsers();
    } catch (error) {
      setAdminFormError((error as Error).message || "Failed to create admin");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventFormError(null);
    setEventFormSuccess(false);
    try {
      await api.post("/api/admin/events", newEventForm);
      setEventFormSuccess(true);
      setNewEventForm({ name: "", date: "", start_time: "12:00", end_time: "18:00", description: "", organization_id: "" });
      fetchMyEvents();
    } catch (error) {
      setEventFormError((error as Error).message || "Failed to create event");
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

  const updateEventById = async (eventId: string, updates: Partial<EventSettings>) => {
    try {
      const updated = await api.patch(`/api/admin/events/${eventId}`, updates);
      setMyEvents(myEvents.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
      if (eventSettings?.id === eventId) {
        setEventSettings(updated);
      }
    } catch (error) {
      console.error("Error updating event:", error);
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
        { status },
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
    set_end_time: string | null,
  ) => {
    setSchedulingError(null);
    try {
      const updatedBand = await api.patch(
        `/api/admin/bands/${bandId}/schedule`,
        { assigned_porch_id, set_start_time, set_end_time },
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

  const saveReviewerEmails = async () => {
    const emails = reviewerEmailsInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    await updateEventSettings({ reviewer_emails: emails });
  };

  const assignReviewers = async () => {
    setAssigningReviewers(true);
    try {
      // First save the reviewer emails
      const emails = reviewerEmailsInput
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      await updateEventSettings({ reviewer_emails: emails });

      // Then assign reviewers to bands
      const result = await api.post("/api/admin/bands/assign-reviewers", {});
      setBands(result.bands || []);

      // Refresh reviewers list
      const reviewerData = await api.get("/api/admin/reviewers");
      setReviewers(reviewerData || []);

      // Update event settings to reflect assignment
      const eventData = await api.get("/api/admin/event");
      setEventSettings(eventData);
    } catch (error) {
      console.error("Error assigning reviewers:", error);
    } finally {
      setAssigningReviewers(false);
    }
  };

  const updateBandReview = async (
    bandId: string,
    rating: number | null,
    notes: string | null,
  ) => {
    try {
      const updatedBand = await api.patch(`/api/admin/bands/${bandId}/review`, {
        reviewer_rating: rating,
        reviewer_notes: notes,
      });
      setBands(bands.map((b) => (b.id === bandId ? updatedBand : b)));
      setMyReviewBands(
        myReviewBands.map((b) => (b.id === bandId ? updatedBand : b)),
      );
    } catch (error) {
      console.error("Error updating band review:", error);
    }
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

    // Filter by reviewer
    if (reviewerFilter !== "all") {
      result = result.filter(
        (b) => b.assigned_reviewer_email === reviewerFilter,
      );
    }

    // Filter by search query
    if (bandSearch.trim()) {
      const query = bandSearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.band_name.toLowerCase().includes(query) ||
          b.contact_name.toLowerCase().includes(query) ||
          b.genre.toLowerCase().includes(query) ||
          b.contact_email.toLowerCase().includes(query),
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
            parsedB.streetName,
          );
          if (streetCompare !== 0) return streetCompare;
          // Then sort by house number descending
          return parsedB.houseNumber - parsedA.houseNumber;
        }
        case "reviewer": {
          const reviewerA = a.assigned_reviewer_email || "zzz";
          const reviewerB = b.assigned_reviewer_email || "zzz";
          return reviewerA.localeCompare(reviewerB);
        }
        case "rating": {
          const ratingA = a.reviewer_rating || 0;
          const ratingB = b.reviewer_rating || 0;
          return ratingB - ratingA; // Higher ratings first
        }
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [bands, filter, bandSearch, bandSort, porches, reviewerFilter]);

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
            parsedB.streetName,
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
    (b) => b.status === "approved",
  ).length;
  const approvedPorchesCount = porches.filter(
    (p) => p.status === "approved",
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
      assignments: {
        title: "Reviewer Assignments",
        description: "Assign band applications to admin reviewers",
      },
      "my-reviews": {
        title: "My Reviews",
        description: "Review bands assigned to you",
      },
      scheduler: {
        title: "Visual Scheduler",
        description:
          "Drag to select time slots on a porch row, then choose a band",
      },
      events: {
        title: "Events",
        description: "Create and manage events for your organizations",
      },
      organizations: {
        title: "Organizations",
        description: "Create and manage porchfest organizations",
      },
      "manage-admins": {
        title: "Manage Admins",
        description: "Create admin users and assign them to organizations",
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

                {/* Reviewer Filter */}
                {reviewers.length > 0 && (
                  <select
                    value={reviewerFilter}
                    onChange={(e) => setReviewerFilter(e.target.value)}
                    className="input-field w-full lg:w-48"
                  >
                    <option value="all">All Reviewers</option>
                    {reviewers.map((email) => (
                      <option key={email} value={email}>
                        {email.split("@")[0]}
                      </option>
                    ))}
                  </select>
                )}

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
                  <option value="reviewer">Sort: Reviewer</option>
                  <option value="rating">Sort: Rating (High to Low)</option>
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
                    showReviewerInfo={
                      eventSettings?.reviewers_assigned || false
                    }
                    onReviewUpdate={updateBandReview}
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

      case "assignments":
        return (
          <div className="space-y-6">
            {/* Reviewer Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                👥 Configure Reviewers
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the email addresses of admins who will review band
                applications. Separate multiple emails with commas.
              </p>
              <textarea
                value={reviewerEmailsInput}
                onChange={(e) => setReviewerEmailsInput(e.target.value)}
                placeholder="admin1@example.com, admin2@example.com, admin3@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500 mb-4"
                rows={3}
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={saveReviewerEmails}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Save Reviewer List
                </button>
                <button
                  onClick={assignReviewers}
                  disabled={assigningReviewers || !reviewerEmailsInput.trim()}
                  className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assigningReviewers ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Assigning...
                    </>
                  ) : (
                    <>🎲 Randomly Assign Bands to Reviewers</>
                  )}
                </button>
              </div>
              {eventSettings?.reviewers_assigned && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✅ Reviewers have been assigned. Bands are distributed equally
                  among reviewers.
                </div>
              )}
            </div>

            {/* Assignment Summary */}
            {eventSettings?.reviewers_assigned && reviewers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-4">
                  📊 Assignment Summary
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewers.map((email) => {
                    const assignedBands = bands.filter(
                      (b) => b.assigned_reviewer_email === email,
                    );
                    const reviewedCount = assignedBands.filter(
                      (b) => b.reviewer_rating !== null,
                    ).length;
                    return (
                      <div
                        key={email}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <p className="font-medium text-gray-900 truncate">
                          {email.split("@")[0]}
                        </p>
                        <p className="text-sm text-gray-500">{email}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="bg-porch-100 text-porch-700 px-2 py-0.5 rounded">
                            {assignedBands.length} bands
                          </span>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {reviewedCount} reviewed
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case "my-reviews":
        return (
          <div className="space-y-4">
            {myReviewBands.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                {eventSettings?.reviewers_assigned
                  ? "No bands have been assigned to you for review."
                  : "Reviewer assignments have not been made yet. Check the Assignments section."}
              </div>
            ) : (
              <>
                <div className="bg-porch-50 border border-porch-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-porch-700">
                    You have <strong>{myReviewBands.length}</strong> bands to
                    review. Rate each band and add notes to help with the
                    selection process.
                  </p>
                </div>
                {myReviewBands.map((band) => (
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
                    showReviewerInfo={true}
                    onReviewUpdate={updateBandReview}
                    isMyReview={true}
                    currentUserEmail={user?.email}
                  />
                ))}
              </>
            )}
          </div>
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

      case "events":
        return (
          <div className="space-y-6">
            {/* Create New Event */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Create New Event
              </h3>

              {eventFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {eventFormError}
                </div>
              )}
              {eventFormSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Event created successfully!
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization *
                  </label>
                  <select
                    value={newEventForm.organization_id}
                    onChange={(e) =>
                      setNewEventForm({ ...newEventForm, organization_id: e.target.value })
                    }
                    className="input-field"
                    required
                  >
                    <option value="">Select organization...</option>
                    {myOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      value={newEventForm.name}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, name: e.target.value })
                      }
                      className="input-field"
                      placeholder="e.g. Somerville Porchfest 2026"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newEventForm.date}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, date: e.target.value })
                      }
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newEventForm.start_time}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, start_time: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newEventForm.end_time}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, end_time: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newEventForm.description}
                    onChange={(e) =>
                      setNewEventForm({ ...newEventForm, description: e.target.value })
                    }
                    className="input-field min-h-[80px]"
                    placeholder="Brief description of the event"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
                >
                  Create Event
                </button>
              </form>
            </div>

            {/* Existing Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Your Events
              </h3>
              {myEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events yet. Create one above.</p>
              ) : (
                <div className="space-y-3">
                  {myEvents.map((event) => (
                    <div key={event.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedEventId(
                            selectedEventId === event.id ? null : event.id
                          )
                        }
                        className="w-full text-left p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-porch-300 hover:bg-porch-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{event.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(event.date).toLocaleDateString()} &middot;{" "}
                              {event.start_time} - {event.end_time}
                              {event.organization && (
                                <> &middot; {event.organization.name}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.is_active && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Active
                              </span>
                            )}
                            <span className="text-gray-400 text-sm">
                              {selectedEventId === event.id ? "▼" : "▶"}
                            </span>
                          </div>
                        </div>
                      </button>

                      {selectedEventId === event.id && (
                        <div className="mt-2 ml-2 border-l-2 border-porch-200 pl-4">
                          <EventSettingsEditor
                            event={event as unknown as EventSettings}
                            onSave={(updates) => updateEventById(event.id, updates)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "organizations":
        if (!isSuperDuperAdmin) return <div className="text-gray-500">Access denied.</div>;
        return (
          <div className="space-y-6">
            {/* Create New Organization */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Create New Organization
              </h3>

              {orgFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {orgFormError}
                </div>
              )}
              {orgFormSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Organization created successfully!
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newOrgForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "");
                        setNewOrgForm({ ...newOrgForm, name, slug });
                      }}
                      className="input-field"
                      placeholder="e.g. Somerville Porchfest"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={newOrgForm.slug}
                      onChange={(e) =>
                        setNewOrgForm({ ...newOrgForm, slug: e.target.value })
                      }
                      className="input-field"
                      placeholder="somerville-porchfest"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={newOrgForm.city}
                      onChange={(e) =>
                        setNewOrgForm({ ...newOrgForm, city: e.target.value })
                      }
                      className="input-field"
                      placeholder="Somerville"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={newOrgForm.state}
                      onChange={(e) =>
                        setNewOrgForm({ ...newOrgForm, state: e.target.value })
                      }
                      className="input-field"
                      placeholder="MA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={newOrgForm.contact_email}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, contact_email: e.target.value })
                    }
                    className="input-field"
                    placeholder="info@example.org"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={newOrgForm.website}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, website: e.target.value })
                    }
                    className="input-field"
                    placeholder="https://example.org"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newOrgForm.description}
                    onChange={(e) =>
                      setNewOrgForm({ ...newOrgForm, description: e.target.value })
                    }
                    className="input-field min-h-[80px]"
                    placeholder="About this porchfest organization..."
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
                >
                  Create Organization
                </button>
              </form>
            </div>

            {/* Existing Organizations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                All Organizations
              </h3>
              {organizations.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No organizations yet. Create one above.
                </p>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-gray-500">
                            {org.city && org.state
                              ? `${org.city}, ${org.state}`
                              : org.city || org.state || "No location set"}
                            {" "}&middot; <span className="font-mono text-xs">{org.slug}</span>
                          </p>
                          {org.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "manage-admins":
        if (!isSuperDuperAdmin) return <div className="text-gray-500">Access denied.</div>;
        return (
          <div className="space-y-6">
            {/* Create New Admin */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Create New Admin
              </h3>

              {adminFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {adminFormError}
                </div>
              )}
              {adminFormSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Admin user created successfully!
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, email: e.target.value })
                      }
                      className="input-field"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={newAdminForm.password}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, password: e.target.value })
                      }
                      className="input-field"
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      value={newAdminForm.role}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, role: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="admin">Admin</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Organization
                    </label>
                    <select
                      value={newAdminForm.organization_id}
                      onChange={(e) =>
                        setNewAdminForm({
                          ...newAdminForm,
                          organization_id: e.target.value,
                        })
                      }
                      className="input-field"
                    >
                      <option value="">None</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
                >
                  Create Admin
                </button>
              </form>
            </div>

            {/* Existing Admin Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                All Users
              </h3>
              {adminUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Organizations
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900">
                            {u.email}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.role === "super-duper-admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : u.role === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {u.organizations.length > 0
                              ? u.organizations.map((o) => o.name).join(", ")
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
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
