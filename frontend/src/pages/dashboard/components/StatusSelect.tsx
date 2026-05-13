import { Status } from "../types";
import StatusPill from "../../../components/ui/StatusPill";
import { APPLICATION_STATUSES } from "../../../components/ui/statusOptions";

interface StatusSelectProps {
  value: string;
  onChange: (status: Status) => void;
}

export default function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <StatusPill
      value={value}
      onChange={(v) => onChange(v as Status)}
      options={APPLICATION_STATUSES}
    />
  );
}
