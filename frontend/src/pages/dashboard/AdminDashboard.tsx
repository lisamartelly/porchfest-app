import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import {
  BandApplication,
  PorchApplication,
  PorchAvailableTime,
  Status,
  ScheduleStatus,
  EventSettings,
  Section,
  ReviewerUser,
} from "./types";
import StatsGrid from "./components/StatsGrid";
import BandsSection from "./components/sections/BandsSection";
import PorchesSection from "./components/sections/PorchesSection";
import AssignmentsSection from "./components/sections/AssignmentsSection";
import MyReviewsSection from "./components/sections/MyReviewsSection";
import SchedulerSection from "./components/sections/SchedulerSection";
import EventsSection from "./components/sections/EventsSection";
import OrganizationsSection from "./components/sections/OrganizationsSection";
import ManageUsersSection from "./components/sections/ManageUsersSection";
import TasksSection from "./components/sections/TasksSection";
import MapSection from "./components/sections/MapSection";

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
  map: {
    title: "Map",
    description: "Visualize porches, plan assignments, and manage sound zones",
  },
  events: {
    title: "Events",
    description: "Create and manage events for your organizations",
  },
  tasks: {
    title: "Tasks",
    description: "Manage to-do items, contacts, and recurring tasks across events",
  },
  organizations: {
    title: "Organizations",
    description: "Create and manage porchfest organizations",
  },
  "manage-users": {
    title: "Manage Users",
    description: "Add and manage users for your organization",
  },
};

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { activeOrgId, activeOrgRole, loading: orgLoading } = useOrgStore();
  const defaultSection = activeOrgRole === "reviewer" ? "my-reviews" : "overview";
  const section = (searchParams.get("section") || defaultSection) as Section;

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
  const [reviewers, setReviewers] = useState<ReviewerUser[]>([]);
  const [myReviewBands, setMyReviewBands] = useState<BandApplication[]>([]);
  const [porchAvailableTimes, setPorchAvailableTimes] = useState<PorchAvailableTime[]>([]);

  const isSuperDuperAdmin = user?.role === "super-duper-admin";
  const isOrganizer = activeOrgRole === "owner" || activeOrgRole === "organizer" || isSuperDuperAdmin;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = activeOrgId ? `?org_id=${activeOrgId}` : "";
      const [bandData, porchData, eventData, reviewerData, availTimesData] = await Promise.all([
        api.get(`/api/admin/bands${qs}`),
        api.get(`/api/admin/porches${qs}`),
        api.get(`/api/admin/event${qs}`).catch(() => null),
        api.get(`/api/admin/reviewers${qs}`),
        api.get(`/api/admin/porch-available-times${qs}`).catch(() => []),
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
      setPorchAvailableTimes(availTimesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  const fetchMyReviews = useCallback(async () => {
    try {
      const qs = activeOrgId ? `?org_id=${activeOrgId}` : "";
      const myBands = await api.get(`/api/admin/bands/my-reviews${qs}`);
      setMyReviewBands(myBands || []);
    } catch (error) {
      console.error("Error fetching my reviews:", error);
    }
  }, [activeOrgId]);
  
  useEffect(() => {
    if (!orgLoading) {
      fetchData();
    }
  }, [orgLoading, fetchData]);

  useEffect(() => {
    setApprovedPorches(porches.filter((p) => p.status === "approved"));
  }, [porches]);

  useEffect(() => {
    if (section === "my-reviews" && !orgLoading) {
      fetchMyReviews();
    }
  }, [section, fetchMyReviews, orgLoading]);

  const updateBandStatus = useCallback(
    async (bandId: number, status: Status) => {
      try {
        const updatedBand = await api.patch(
          `/api/admin/bands/${bandId}/status`,
          { status },
        );
        setBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
        setMyReviewBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
      } catch (error) {
        console.error("Error updating band status:", error);
      }
    },
    [],
  );

  const updatePorchStatus = useCallback(
    async (porchId: number, status: Status) => {
      try {
        const updatedPorch = await api.patch(
          `/api/admin/porches/${porchId}/status`,
          { status },
        );
        setPorches((prev) =>
          prev.map((p) => (p.id === porchId ? updatedPorch : p)),
        );
      } catch (error) {
        console.error("Error updating porch status:", error);
      }
    },
    [],
  );

  const scheduleBand = useCallback(
    async (
      bandId: number,
      assigned_porch_id: number | null,
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
        setMyReviewBands((prev) =>
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
    (porchId: number | null) => {
      if (!porchId) return null;
      const porch = porches.find((p) => p.id === porchId);
      return porch?.address || null;
    },
    [porches],
  );

  const updateBandReview = useCallback(
    async (bandId: number, rating: number | null, notes: string | null) => {
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

  const updateBandNotes = useCallback(
    async (bandId: number, adminNotes: string | null) => {
      const updatedBand = await api.patch(
        `/api/admin/bands/${bandId}/notes`,
        { admin_notes: adminNotes },
      );
      setBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
      setMyReviewBands((prev) =>
        prev.map((b) => (b.id === bandId ? updatedBand : b)),
      );
    },
    [],
  );

  const updatePorchNotes = useCallback(
    async (porchId: number, adminNotes: string | null) => {
      const updatedPorch = await api.patch(
        `/api/admin/porches/${porchId}/notes`,
        { admin_notes: adminNotes },
      );
      setPorches((prev) =>
        prev.map((p) => (p.id === porchId ? updatedPorch : p)),
      );
    },
    [],
  );

  const updateBandAcceptance = useCallback(
    async (bandId: number, confirmed: boolean | null) => {
      const updatedBand = await api.patch(
        `/api/admin/bands/${bandId}/acceptance`,
        { acceptance_confirmed: confirmed },
      );
      setBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
      setMyReviewBands((prev) =>
        prev.map((b) => (b.id === bandId ? updatedBand : b)),
      );
    },
    [],
  );

  const updateBandScheduleStatus = useCallback(
    async (bandId: number, scheduleStatus: ScheduleStatus | null) => {
      const updatedBand = await api.patch(
        `/api/admin/bands/${bandId}/schedule-status`,
        { schedule_status: scheduleStatus },
      );
      setBands((prev) => prev.map((b) => (b.id === bandId ? updatedBand : b)));
      setMyReviewBands((prev) =>
        prev.map((b) => (b.id === bandId ? updatedBand : b)),
      );
    },
    [],
  );

  const createPorchAvailableTime = useCallback(
    async (porchId: number, startTime: string, endTime: string) => {
      const created = await api.post(
        `/api/admin/porches/${porchId}/available-times`,
        { start_time: startTime, end_time: endTime },
      );
      setPorchAvailableTimes((prev) => [...prev, created]);
    },
    [],
  );

  const deletePorchAvailableTime = useCallback(
    async (id: number) => {
      await api.delete(`/api/admin/porch-available-times/${id}`);
      setPorchAvailableTimes((prev) => prev.filter((t) => t.id !== id));
    },
    [],
  );

  const updatePorchScheduleStatus = useCallback(
    async (porchId: number, scheduleStatus: ScheduleStatus | null) => {
      const updatedPorch = await api.patch(
        `/api/admin/porches/${porchId}/schedule-status`,
        { schedule_status: scheduleStatus },
      );
      setPorches((prev) =>
        prev.map((p) => (p.id === porchId ? updatedPorch : p)),
      );
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
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to the overview.</div>;
        return (
          <StatsGrid
            pendingBands={pendingBands}
            pendingPorches={pendingPorches}
            approvedBands={approvedBandsCount}
            approvedPorches={approvedPorchesCount}
          />
        );

      case "bands":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to bands.</div>;
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
            onNotesChange={updateBandNotes}
            onAcceptanceChange={updateBandAcceptance}
            onScheduleStatusChange={updateBandScheduleStatus}
          />
        );

      case "porches":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to porches.</div>;
        return (
          <PorchesSection
            porches={porches}
            bands={bands}
            eventSettings={eventSettings}
            onStatusChange={updatePorchStatus}
            onNotesChange={updatePorchNotes}
          />
        );

      case "assignments":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to assignments.</div>;
        return (
          <AssignmentsSection
            bands={bands}
            reviewers={reviewers}
            onBandsUpdate={setBands}
            onReviewersUpdate={setReviewers}
          />
        );

      case "my-reviews":
        return (
          <MyReviewsSection
            myReviewBands={myReviewBands}
            approvedPorches={approvedPorches}
            eventSettings={eventSettings}
            schedulingError={schedulingError}
            currentUserId={user?.id}
            reviewerUsers={reviewers}
            onStatusChange={updateBandStatus}
            onSchedule={scheduleBand}
            getPorchAddress={getPorchAddress}
            onReviewUpdate={updateBandReview}
          />
        );

      case "scheduler":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to the scheduler.</div>;
        return (
          <SchedulerSection
            bands={bands}
            approvedPorches={approvedPorches}
            eventSettings={eventSettings}
            porchAvailableTimes={porchAvailableTimes}
            onScheduleBand={scheduleBand}
            onBandScheduleStatusChange={updateBandScheduleStatus}
            onPorchScheduleStatusChange={updatePorchScheduleStatus}
            onCreateAvailableTime={createPorchAvailableTime}
            onDeleteAvailableTime={deletePorchAvailableTime}
          />
        );

      case "map":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to the map.</div>;
        return (
          <MapSection
            bands={bands}
            porches={porches}
            eventSettings={eventSettings}
            onScheduleBand={scheduleBand}
            onPorchesUpdate={setPorches}
            onEventSettingsUpdate={setEventSettings}
          />
        );

      case "events":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to events.</div>;
        return (
          <EventsSection
            eventSettings={eventSettings}
            onEventSettingsUpdate={setEventSettings}
          />
        );

      case "tasks":
        if (!isOrganizer)
          return <div className="text-gray-500">Access denied. Reviewers do not have access to tasks.</div>;
        return <TasksSection />;

      case "organizations":
        if (!isSuperDuperAdmin)
          return <div className="text-gray-500">Access denied.</div>;
        return <OrganizationsSection />;

      case "manage-users":
        if (!isSuperDuperAdmin && activeOrgRole !== "owner")
          return <div className="text-gray-500">Access denied. Only organization owners can manage users.</div>;
        return <ManageUsersSection />;

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
