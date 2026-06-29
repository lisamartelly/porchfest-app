import { useState, useMemo, useCallback } from "react";
import {
  BandApplication,
  PorchApplication,
  EventSettings,
  Status,
  ScheduleStatus,
  FilterStatus,
  BandSortOption,
  ReviewerUser,
} from "../../types";
import BandCard from "../BandCard";
import FilterPill from "../../../../components/ui/FilterPill";
import { exportBands } from "../../../../lib/exportUtils";
import ExportMenu from "../../../../components/ui/ExportMenu";

interface BandsSectionProps {
  bands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  schedulingError: string | null;
  reviewers: ReviewerUser[];
  onStatusChange: (bandId: number, status: Status) => Promise<void>;
  onSchedule: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null,
  ) => Promise<void>;
  getPorchAddress: (porchId: number | null) => string | null;
  onReviewUpdate: (
    bandId: number,
    rating: number | null,
    notes: string | null,
  ) => Promise<void>;
  onNotesChange: (bandId: number, adminNotes: string | null) => Promise<void>;
  onAcceptanceChange: (
    bandId: number,
    confirmed: boolean | null,
  ) => Promise<void>;
  onScheduleStatusChange: (
    bandId: number,
    status: ScheduleStatus | null,
  ) => Promise<void>;
}

const STATUS_PRIORITY: Record<Status, number> = {
  pending: 0,
  under_review: 1,
  approved: 2,
  rejected: 3,
  withdrew: 4,
};

function parseAddress(address: string | null) {
  if (!address) return { houseNumber: 0, streetName: "zzz" };
  const match = address.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return {
      houseNumber: parseInt(match[1], 10),
      streetName: match[2].toLowerCase(),
    };
  }
  return { houseNumber: 0, streetName: address.toLowerCase() };
}

export default function BandsSection({
  bands,
  approvedPorches,
  eventSettings,
  schedulingError,
  reviewers,
  onStatusChange,
  onSchedule,
  getPorchAddress,
  onReviewUpdate,
  onNotesChange,
  onAcceptanceChange,
  onScheduleStatusChange,
}: BandsSectionProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [acceptanceFilter, setAcceptanceFilter] = useState<string>("all");
  const [bandSearch, setBandSearch] = useState("");
  const [bandSort, setBandSort] = useState<BandSortOption>("created_at");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");

  const reviewerMap = useMemo(
    () => new Map(reviewers.map((r) => [r.id, r])),
    [reviewers],
  );

  const getReviewerName = useCallback(
    (id: number | null) => {
      if (id == null) return null;
      const r = reviewerMap.get(id);
      if (!r) return null;
      return r.first_name || r.last_name
        ? `${r.first_name || ""} ${r.last_name || ""}`.trim()
        : r.email.split("@")[0];
    },
    [reviewerMap],
  );

  const filteredAndSortedBands = useMemo(() => {
    let result = [...bands];

    if (filter !== "all") {
      result = result.filter((b) => b.status === filter);
    }

    if (acceptanceFilter !== "all") {
      result = result.filter((b) => {
        if (acceptanceFilter === "confirmed") return b.acceptance_confirmed === true;
        if (acceptanceFilter === "canceled") return b.acceptance_confirmed === false;
        if (acceptanceFilter === "no_response") return b.acceptance_confirmed == null;
        return true;
      });
    }

    if (reviewerFilter !== "all") {
      result = result.filter(
        (b) => String(b.assigned_reviewer_id) === reviewerFilter,
      );
    }

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

    result.sort((a, b) => {
      switch (bandSort) {
        case "band_name":
          return a.band_name.localeCompare(b.band_name);
        case "status":
          return (
            STATUS_PRIORITY[a.status as Status] -
            STATUS_PRIORITY[b.status as Status]
          );
        case "porch_assignment": {
          const parsedA = parseAddress(getPorchAddress(a.assigned_porch_id));
          const parsedB = parseAddress(getPorchAddress(b.assigned_porch_id));
          const streetCompare = parsedA.streetName.localeCompare(
            parsedB.streetName,
          );
          if (streetCompare !== 0) return streetCompare;
          return parsedB.houseNumber - parsedA.houseNumber;
        }
        case "reviewer": {
          const reviewerA = getReviewerName(a.assigned_reviewer_id) || "zzz";
          const reviewerB = getReviewerName(b.assigned_reviewer_id) || "zzz";
          return reviewerA.localeCompare(reviewerB);
        }
        case "rating":
          return (b.reviewer_rating || 0) - (a.reviewer_rating || 0);
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [
    bands,
    filter,
    acceptanceFilter,
    bandSearch,
    bandSort,
    reviewerFilter,
    getPorchAddress,
    getReviewerName,
  ]);

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search bands by name, contact, genre, or email..."
              value={bandSearch}
              onChange={(e) => setBandSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-full bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-porch-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              value={filter}
              onChange={(v) => setFilter(v as FilterStatus)}
              placeholder="All Status"
              color="porch"
              options={[
                { value: "all", label: `All Status (${bands.length})` },
                {
                  value: "pending",
                  label: `Pending (${bands.filter((b) => b.status === "pending").length})`,
                },
                {
                  value: "under_review",
                  label: `Under Review (${bands.filter((b) => b.status === "under_review").length})`,
                },
                {
                  value: "approved",
                  label: `Approved (${bands.filter((b) => b.status === "approved").length})`,
                },
                {
                  value: "rejected",
                  label: `Rejected (${bands.filter((b) => b.status === "rejected").length})`,
                },
                {
                  value: "withdrew",
                  label: `Withdrew (${bands.filter((b) => b.status === "withdrew").length})`,
                },
              ]}
            />

            <FilterPill
              value={acceptanceFilter}
              onChange={setAcceptanceFilter}
              placeholder="Acceptance"
              color="emerald"
              options={[
                { value: "all", label: "All Acceptance" },
                {
                  value: "confirmed",
                  label: `Confirmed (${bands.filter((b) => b.acceptance_confirmed === true).length})`,
                },
                {
                  value: "canceled",
                  label: `Canceled (${bands.filter((b) => b.acceptance_confirmed === false).length})`,
                },
                {
                  value: "no_response",
                  label: `No Response (${bands.filter((b) => b.acceptance_confirmed == null).length})`,
                },
              ]}
            />

            {reviewers.length > 0 && (
              <FilterPill
                value={reviewerFilter}
                onChange={setReviewerFilter}
                placeholder="All Reviewers"
                searchable
                color="rose"
                options={[
                  { value: "all", label: "All Reviewers" },
                  ...reviewers.map((r) => ({
                    value: String(r.id),
                    label: r.first_name || r.last_name
                      ? `${r.first_name || ""} ${r.last_name || ""}`.trim()
                      : r.email.split("@")[0],
                  })),
                ]}
              />
            )}

            <FilterPill
              value={bandSort}
              onChange={(v) => setBandSort(v as BandSortOption)}
              placeholder="Sort"
              color="amber"
              options={[
                { value: "created_at", label: "Newest First" },
                { value: "band_name", label: "Band Name (A-Z)" },
                { value: "status", label: "Status" },
                { value: "porch_assignment", label: "Porch Assignment" },
                { value: "reviewer", label: "Reviewer" },
                { value: "rating", label: "Rating (High to Low)" },
              ]}
            />

            <ExportMenu
              onExport={(format) =>
                exportBands(bands, approvedPorches, reviewers, format)
              }
            />
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Showing {filteredAndSortedBands.length} of {bands.length} bands
          {bandSearch && ` matching "${bandSearch}"`}
        </p>
      </div>

      {filteredAndSortedBands.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          {bandSearch ? (
            <>
              No bands found matching &ldquo;{bandSearch}&rdquo;
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
              onStatusChange={onStatusChange}
              onSchedule={onSchedule}
              getPorchAddress={getPorchAddress}
              schedulingError={schedulingError}
              showReviewerInfo={reviewers.length > 0}
              reviewerUsers={reviewers}
              onReviewUpdate={onReviewUpdate}
              onNotesChange={onNotesChange}
              showAdminNotes
              onAcceptanceChange={onAcceptanceChange}
              showAcceptance
              onScheduleStatusChange={onScheduleStatusChange}
            />
          ))}
        </div>
      )}
    </>
  );
}
