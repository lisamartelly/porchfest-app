export interface StatusOption {
  value: string;
  label: string;
  bg: string;
  text: string;
}

export const APPLICATION_STATUSES: StatusOption[] = [
  { value: "pending", label: "Pending", bg: "bg-yellow-100", text: "text-yellow-700" },
  { value: "under_review", label: "Under Review", bg: "bg-porch-100", text: "text-porch-700" },
  { value: "approved", label: "Approved", bg: "bg-green-100", text: "text-green-700" },
  { value: "rejected", label: "Rejected", bg: "bg-red-100", text: "text-red-700" },
  { value: "withdrew", label: "Withdrew", bg: "bg-slate-100", text: "text-slate-600" },
];

export const TASK_STATUSES: StatusOption[] = [
  { value: "to_do", label: "To Do", bg: "bg-gray-100", text: "text-gray-700" },
  { value: "in_progress", label: "In Progress", bg: "bg-porch-100", text: "text-porch-700" },
  { value: "blocked", label: "Blocked", bg: "bg-amber-100", text: "text-amber-700" },
  { value: "done", label: "Done", bg: "bg-green-100", text: "text-green-700" },
];
