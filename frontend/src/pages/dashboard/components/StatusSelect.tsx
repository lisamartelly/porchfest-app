import { Status } from "../types";
import { getStatusSelectStyles } from "../utils";

interface StatusSelectProps {
  value: string;
  onChange: (status: Status) => void;
}

export default function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-gray-500 uppercase">
        Status
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${getStatusSelectStyles(value)}`}
      >
        <option value="pending">Pending</option>
        <option value="under_review">Under Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  );
}
