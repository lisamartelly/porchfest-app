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
import FilterPill from "../../../../components/ui/FilterPill";
import { exportPorches } from "../../../../lib/exportUtils";
import ExportMenu from "../../../../components/ui/ExportMenu";

interface PorchesSectionProps {
  porches: PorchApplication[];
  bands: BandApplication[];
  eventSettings: EventSettings | null;
  onStatusChange: (porchId: number, status: Status) => Promise<void>;
  onNotesChange: (porchId: number, adminNotes: string | null) => Promise<void>;
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
  onNotesChange,
}: PorchesSectionProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [porchSearch, setPorchSearch] = useState("");
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

    if (porchSearch.trim()) {
      const query = porchSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.owner_name.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          (p.city?.toLowerCase().includes(query) ?? false),
      );
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
  }, [porches, filter, porchSearch, porchSort]);

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
              placeholder="Search porches by address, owner, email, or city..."
              value={porchSearch}
              onChange={(e) => setPorchSearch(e.target.value)}
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
                { value: "all", label: `All Status (${porches.length})` },
                { value: "pending", label: `Pending (${porches.filter((p) => p.status === "pending").length})` },
                { value: "under_review", label: `Under Review (${porches.filter((p) => p.status === "under_review").length})` },
                { value: "approved", label: `Approved (${porches.filter((p) => p.status === "approved").length})` },
                { value: "rejected", label: `Rejected (${porches.filter((p) => p.status === "rejected").length})` },
              ]}
            />

            <FilterPill
              value={porchSort}
              onChange={(v) => setPorchSort(v as PorchSortOption)}
              placeholder="Sort"
              color="amber"
              options={[
                { value: "address", label: "Street Name & Number" },
                { value: "owner_name", label: "Owner Name (A-Z)" },
                { value: "status", label: "Status" },
                { value: "created_at", label: "Newest First" },
              ]}
            />

            <ExportMenu
              onExport={(format) => exportPorches(porches, bands, format)}
            />
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Showing {filteredAndSortedPorches.length} of {porches.length} porches
          {porchSearch && ` matching "${porchSearch}"`}
        </p>
      </div>

      {filteredAndSortedPorches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          {porchSearch ? (
            <>
              No porches found matching &ldquo;{porchSearch}&rdquo;
              <button
                onClick={() => setPorchSearch("")}
                className="block mx-auto mt-2 text-porch-600 hover:text-porch-700 font-medium"
              >
                Clear search
              </button>
            </>
          ) : (
            "No porches to display"
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAndSortedPorches.map((porch) => (
            <PorchCard
              key={porch.id}
              porch={porch}
              scheduledBands={getBandsAtPorch(porch.id)}
              onStatusChange={onStatusChange}
              onNotesChange={onNotesChange}
              eventStartTime={eventSettings?.start_time || "12:00"}
              eventEndTime={eventSettings?.end_time || "18:00"}
            />
          ))}
        </div>
      )}
    </>
  );
}
