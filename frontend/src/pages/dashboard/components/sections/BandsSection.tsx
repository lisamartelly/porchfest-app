import { useState, useMemo } from "react";
import {
  BandApplication,
  PorchApplication,
  EventSettings,
  Status,
  FilterStatus,
  BandSortOption,
} from "../../types";
import BandCard from "../BandCard";

interface BandsSectionProps {
  bands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  schedulingError: string | null;
  reviewers: string[];
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
}

const STATUS_PRIORITY: Record<Status, number> = {
  pending: 0,
  under_review: 1,
  approved: 2,
  rejected: 3,
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
}: BandsSectionProps) {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [bandSearch, setBandSearch] = useState("");
  const [bandSort, setBandSort] = useState<BandSortOption>("created_at");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");

  const filteredAndSortedBands = useMemo(() => {
    let result = [...bands];

    if (filter !== "all") {
      result = result.filter((b) => b.status === filter);
    }

    if (reviewerFilter !== "all") {
      result = result.filter(
        (b) => b.assigned_reviewer_email === reviewerFilter,
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
          const reviewerA = a.assigned_reviewer_email || "zzz";
          const reviewerB = b.assigned_reviewer_email || "zzz";
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
  }, [bands, filter, bandSearch, bandSort, reviewerFilter, getPorchAddress]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
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

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterStatus)}
            className="input-field w-full lg:w-48"
          >
            <option value="all">All Status ({bands.length})</option>
            <option value="pending">
              Pending ({bands.filter((b) => b.status === "pending").length})
            </option>
            <option value="under_review">
              Under Review (
              {bands.filter((b) => b.status === "under_review").length})
            </option>
            <option value="approved">
              Approved ({bands.filter((b) => b.status === "approved").length})
            </option>
            <option value="rejected">
              Rejected ({bands.filter((b) => b.status === "rejected").length})
            </option>
          </select>

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

          <select
            value={bandSort}
            onChange={(e) => setBandSort(e.target.value as BandSortOption)}
            className="input-field w-full lg:w-52"
          >
            <option value="created_at">Sort: Newest First</option>
            <option value="band_name">Sort: Band Name (A-Z)</option>
            <option value="status">Sort: Status</option>
            <option value="porch_assignment">Sort: Porch Assignment</option>
            <option value="reviewer">Sort: Reviewer</option>
            <option value="rating">Sort: Rating (High to Low)</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredAndSortedBands.length} of {bands.length} bands
          {bandSearch && ` matching "${bandSearch}"`}
        </div>
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
              showReviewerInfo={eventSettings?.reviewers_assigned || false}
              onReviewUpdate={onReviewUpdate}
            />
          ))}
        </div>
      )}
    </>
  );
}
