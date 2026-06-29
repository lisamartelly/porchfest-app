import { BandApplication, Status, ScheduleStatus } from "../types";
import StatusPill from "../../../components/ui/StatusPill";
import { APPLICATION_STATUSES, StatusOption } from "../../../components/ui/statusOptions";

const ACCEPTANCE_STATUSES: StatusOption[] = [
  { value: "pending", label: "Pending", bg: "bg-gray-100", text: "text-gray-600" },
  { value: "confirmed", label: "Confirmed", bg: "bg-green-100", text: "text-green-700" },
  { value: "declined", label: "Declined", bg: "bg-red-100", text: "text-red-700" },
];

const SCHEDULE_STATUSES: StatusOption[] = [
  { value: "needs_attention", label: "Needs Attention", bg: "bg-rose-100", text: "text-rose-700" },
  { value: "in_progress", label: "In Progress", bg: "bg-amber-100", text: "text-amber-700" },
  { value: "finalized", label: "Finalized", bg: "bg-emerald-100", text: "text-emerald-700" },
];

interface BandStatusBarProps {
  band: BandApplication;
  onStatusChange: (bandId: number, status: Status) => void;
  onAcceptanceChange?: (bandId: number, confirmed: boolean | null) => Promise<void>;
  onScheduleStatusChange?: (bandId: number, status: ScheduleStatus | null) => Promise<void>;
  showAcceptance?: boolean;
}

function acceptanceToValue(confirmed: boolean | null): string {
  if (confirmed === true) return "confirmed";
  if (confirmed === false) return "declined";
  return "pending";
}

function valueToAcceptance(value: string): boolean | null {
  if (value === "confirmed") return true;
  if (value === "declined") return false;
  return null;
}

export default function BandStatusBar({
  band,
  onStatusChange,
  onAcceptanceChange,
  onScheduleStatusChange,
  showAcceptance,
}: BandStatusBarProps) {
  const showAcceptanceDropdown = showAcceptance && onAcceptanceChange && band.status === "approved";
  const showScheduleDropdown = band.assigned_porch_id && band.schedule_status;

  return (
    <div className="flex flex-wrap items-end gap-4 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Review</span>
        <StatusPill
          value={band.status}
          onChange={(v) => onStatusChange(band.id, v as Status)}
          options={APPLICATION_STATUSES}
        />
      </div>

      {showAcceptanceDropdown && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Confirmation</span>
          <StatusPill
            value={acceptanceToValue(band.acceptance_confirmed)}
            onChange={(v) => onAcceptanceChange(band.id, valueToAcceptance(v))}
            options={ACCEPTANCE_STATUSES}
          />
        </div>
      )}

      {showScheduleDropdown && onScheduleStatusChange && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Scheduling</span>
          <StatusPill
            value={band.schedule_status || "needs_attention"}
            onChange={(v) => onScheduleStatusChange(band.id, v as ScheduleStatus)}
            options={SCHEDULE_STATUSES}
          />
        </div>
      )}
    </div>
  );
}
