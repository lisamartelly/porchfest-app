import { useState, useMemo } from "react";
import {
  BandApplication,
  PorchApplication,
  EventSettings,
  Status,
  FilterStatus,
  PorchSortOption,
} from "../../types";
import PorchCard from "../PorchCard";

interface PorchesSectionProps {
  porches: PorchApplication[];
  bands: BandApplication[];
  eventSettings: EventSettings | null;
  onStatusChange: (porchId: number, status: Status) => Promise<void>;
}

const STATUS_PRIORITY: Record<Status, number> = {
  pending: 0,
  under_review: 1,
  approved: 2,
  rejected: 3,
};

function parsePorchAddress(address: string) {
  const match = address.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return {
      houseNumber: parseInt(match[1], 10),
      streetName: match[2].toLowerCase(),
    };
  }
  return { houseNumber: 0, streetName: address.toLowerCase() };
}

export default function PorchesSection({
  porches,
  bands,
  eventSettings,
  onStatusChange,
}: PorchesSectionProps) {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [porchSort, setPorchSort] = useState<PorchSortOption>("address");

  const getBandsAtPorch = (porchId: number) => {
    return bands
      .filter((b) => b.assigned_porch_id === porchId && b.set_start_time)
      .sort((a, b) => {
        if (!a.set_start_time || !b.set_start_time) return 0;
        return a.set_start_time.localeCompare(b.set_start_time);
      });
  };

  const filteredAndSortedPorches = useMemo(() => {
    let result = [...porches];

    if (filter !== "all") {
      result = result.filter((p) => p.status === filter);
    }

    result.sort((a, b) => {
      switch (porchSort) {
        case "address": {
          const parsedA = parsePorchAddress(a.address);
          const parsedB = parsePorchAddress(b.address);
          const streetCompare = parsedA.streetName.localeCompare(
            parsedB.streetName,
          );
          if (streetCompare !== 0) return streetCompare;
          return parsedA.houseNumber - parsedB.houseNumber;
        }
        case "owner_name":
          return a.owner_name.localeCompare(b.owner_name);
        case "status":
          return (
            STATUS_PRIORITY[a.status as Status] -
            STATUS_PRIORITY[b.status as Status]
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

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterStatus)}
            className="input-field w-full lg:w-48"
          >
            <option value="all">All Status ({porches.length})</option>
            <option value="pending">
              Pending ({porches.filter((p) => p.status === "pending").length})
            </option>
            <option value="under_review">
              Under Review (
              {porches.filter((p) => p.status === "under_review").length})
            </option>
            <option value="approved">
              Approved ({porches.filter((p) => p.status === "approved").length})
            </option>
            <option value="rejected">
              Rejected ({porches.filter((p) => p.status === "rejected").length})
            </option>
          </select>

          <select
            value={porchSort}
            onChange={(e) => setPorchSort(e.target.value as PorchSortOption)}
            className="input-field w-full lg:w-56"
          >
            <option value="address">Sort: Street Name & Number</option>
            <option value="owner_name">Sort: Owner Name (A-Z)</option>
            <option value="status">Sort: Status</option>
            <option value="created_at">Sort: Newest First</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredAndSortedPorches.length} of {porches.length} porches
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
              onStatusChange={onStatusChange}
              eventStartTime={eventSettings?.start_time || "12:00"}
              eventEndTime={eventSettings?.end_time || "18:00"}
            />
          ))}
        </div>
      )}
    </>
  );
}
