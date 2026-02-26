import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import {
  BandApplication,
  PorchApplication,
  Status,
  EventSettings,
  Section,
} from "./types";
import StatsGrid from "./components/StatsGrid";
import BandsSection from "./components/sections/BandsSection";
import PorchesSection from "./components/sections/PorchesSection";
import AssignmentsSection from "./components/sections/AssignmentsSection";
import MyReviewsSection from "./components/sections/MyReviewsSection";
import SchedulerSection from "./components/sections/SchedulerSection";
import EventsSection from "./components/sections/EventsSection";
import OrganizationsSection from "./components/sections/OrganizationsSection";
import ManageAdminsSection from "./components/sections/ManageAdminsSection";

const SECTION_META: Record<Section, { title: string; description: string }> = {
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
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [myReviewBands, setMyReviewBands] = useState<BandApplication[]>([]);

  const isSuperDuperAdmin = user?.role === "super-duper-admin";

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (section === "my-reviews") {
      fetchMyReviews();
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

  const updateEventSettings = useCallback(
    async (updates: Partial<EventSettings>) => {
      try {
        const updated = await api.patch("/api/admin/event", updates);
        setEventSettings(updated);
      } catch (error) {
        console.error("Error updating event settings:", error);
      }
    },
    [],
  );

  const updateBandStatus = useCallback(
    async (bandId: string, status: Status) => {
      try {
        const updatedBand = await api.patch(
          `/api/admin/bands/${bandId}/status`,
          { status },
        );
        setBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
      } catch (error) {
        console.error("Error updating band status:", error);
      }
    },
    [],
  );

  const updatePorchStatus = useCallback(
    async (porchId: string, status: Status) => {
      try {
        const updatedPorch = await api.patch(
          `/api/admin/porches/${porchId}/status`,
          { status },
        );
        setPorches((prev) =>
          prev.map((p) => (p.id === porchId ? updatedPorch : p)),
        );
        if (status === "approved") {
          setPorches((prev) => {
            const porch = prev.find((p) => p.id === porchId);
            if (porch) {
              setApprovedPorches((ap) => [
                ...ap,
                { ...porch, status: "approved" },
              ]);
            }
            return prev;
          });
        } else {
          setApprovedPorches((prev) => prev.filter((p) => p.id !== porchId));
        }
      } catch (error) {
        console.error("Error updating porch status:", error);
      }
    },
    [],
  );

  const scheduleBand = useCallback(
    async (
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
        setBands((prev) =>
          prev.map((b) => (b.id === bandId ? updatedBand : b)),
        );
      } catch (error: unknown) {
        const err = error as Error;
        setSchedulingError(err.message || "Failed to schedule band");
        throw error;
      }
    },
    [],
  );

  const getPorchAddress = useCallback(
    (porchId: string | null) => {
      if (!porchId) return null;
      const porch = porches.find((p) => p.id === porchId);
      return porch?.address || null;
    },
    [porches],
  );

  const updateBandReview = useCallback(
    async (bandId: string, rating: number | null, notes: string | null) => {
      try {
        const updatedBand = await api.patch(
          `/api/admin/bands/${bandId}/review`,
          { reviewer_rating: rating, reviewer_notes: notes },
        );
        setBands((prev) =>
          prev.map((b) => (b.id === bandId ? updatedBand : b)),
        );
        setMyReviewBands((prev) =>
          prev.map((b) => (b.id === bandId ? updatedBand : b)),
        );
      } catch (error) {
        console.error("Error updating band review:", error);
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-porch-600"></div>
      </div>
    );
  }

  const pendingBands = bands.filter((b) => b.status === "pending").length;
  const pendingPorches = porches.filter((p) => p.status === "pending").length;
  const approvedBandsCount = bands.filter(
    (b) => b.status === "approved",
  ).length;
  const approvedPorchesCount = porches.filter(
    (p) => p.status === "approved",
  ).length;

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
          <BandsSection
            bands={bands}
            approvedPorches={approvedPorches}
            eventSettings={eventSettings}
            schedulingError={schedulingError}
            reviewers={reviewers}
            onStatusChange={updateBandStatus}
            onSchedule={scheduleBand}
            getPorchAddress={getPorchAddress}
            onReviewUpdate={updateBandReview}
          />
        );

      case "porches":
        return (
          <PorchesSection
            porches={porches}
            bands={bands}
            eventSettings={eventSettings}
            onStatusChange={updatePorchStatus}
          />
        );

      case "assignments":
        return (
          <AssignmentsSection
            eventSettings={eventSettings}
            reviewers={reviewers}
            bands={bands}
            onBandsUpdate={setBands}
            onReviewersUpdate={setReviewers}
            onEventSettingsUpdate={setEventSettings}
            updateEventSettings={updateEventSettings}
          />
        );

      case "my-reviews":
        return (
          <MyReviewsSection
            myReviewBands={myReviewBands}
            approvedPorches={approvedPorches}
            eventSettings={eventSettings}
            schedulingError={schedulingError}
            currentUserEmail={user?.email}
            onStatusChange={updateBandStatus}
            onSchedule={scheduleBand}
            getPorchAddress={getPorchAddress}
            onReviewUpdate={updateBandReview}
          />
        );

      case "scheduler":
        return (
          <SchedulerSection
            bands={bands}
            approvedPorches={approvedPorches}
            eventSettings={eventSettings}
            onScheduleBand={scheduleBand}
          />
        );

      case "events":
        return (
          <EventsSection
            eventSettings={eventSettings}
            onEventSettingsUpdate={setEventSettings}
          />
        );

      case "organizations":
        if (!isSuperDuperAdmin)
          return <div className="text-gray-500">Access denied.</div>;
        return <OrganizationsSection />;

      case "manage-admins":
        if (!isSuperDuperAdmin)
          return <div className="text-gray-500">Access denied.</div>;
        return <ManageAdminsSection />;

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {SECTION_META[section].title}
        </h1>
        <p className="text-gray-600 mt-1">
          {SECTION_META[section].description}
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
