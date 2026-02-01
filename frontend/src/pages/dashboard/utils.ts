// Format HH:mm to display format (e.g., "14:00" -> "2:00 PM")
export function formatTime(time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Get status badge styles
export function getStatusStyles(status: string): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "under_review":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

// Get status select styles
export function getStatusSelectStyles(status: string): string {
  switch (status) {
    case "approved":
      return "bg-green-50 border-green-300 text-green-700";
    case "rejected":
      return "bg-red-50 border-red-300 text-red-700";
    case "under_review":
      return "bg-blue-50 border-blue-300 text-blue-700";
    default:
      return "bg-yellow-50 border-yellow-300 text-yellow-700";
  }
}

// Format status for display
export function formatStatus(status: string): string {
  return status === "under_review" ? "under review" : status;
}
