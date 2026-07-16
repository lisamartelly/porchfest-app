import * as XLSX from "xlsx";
import { BandApplication, PorchApplication } from "../pages/dashboard/types";

type ExportFormat = "csv" | "xlsx";

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  transform?: (row: T) => string | number | boolean | null;
}

function exportToFile<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  format: ExportFormat,
) {
  const rows = data.map((item) =>
    columns.reduce(
      (row, col) => {
        row[col.header] = col.transform
          ? (col.transform(item) ?? "")
          : (item[col.key as keyof T] ?? "");
        return row;
      },
      {} as Record<string, unknown>,
    ),
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, `${filename}.${format}`);
}

const BAND_EXPORT_COLUMNS: ExportColumn<
  BandApplication & { porch_address?: string; reviewer_name?: string }
>[] = [
  { key: "band_name", header: "Band Name" },
  { key: "status", header: "Status" },
  { key: "contact_name", header: "Contact Name" },
  { key: "contact_email", header: "Contact Email" },
  { key: "contact_phone", header: "Contact Phone" },
  { key: "genre", header: "Genre" },
  { key: "member_count", header: "Member Count" },
  { key: "set_length", header: "Set Length" },
  { key: "bio", header: "Bio" },
  { key: "music_sample_link", header: "Music Sample Link" },
  { key: "venmo_handle", header: "Venmo Handle" },
  { key: "instagram", header: "Instagram" },
  { key: "spotify", header: "Spotify" },
  { key: "soundcloud", header: "SoundCloud" },
  { key: "bandcamp", header: "Bandcamp" },
  { key: "facebook", header: "Facebook" },
  { key: "website", header: "Website" },
  { key: "scheduling_notes", header: "Scheduling Notes" },
  { key: "questions_comments", header: "Questions / Comments" },
  { key: "porch_address", header: "Assigned Porch" },
  { key: "set_start_time", header: "Set Start Time" },
  { key: "set_end_time", header: "Set End Time" },
  { key: "reviewer_name", header: "Reviewer" },
  { key: "reviewer_rating", header: "Reviewer Rating" },
  { key: "reviewer_notes", header: "Reviewer Notes" },
  { key: "admin_notes", header: "Admin Notes" },
  {
    key: "created_at",
    header: "Applied On",
    transform: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

const PORCH_EXPORT_COLUMNS: ExportColumn<
  PorchApplication & { assigned_bands?: string }
>[] = [
  { key: "owner_name", header: "Owner Name" },
  { key: "status", header: "Status" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "address", header: "Address" },
  { key: "city", header: "City" },
  { key: "capacity", header: "Capacity" },
  {
    key: "has_power",
    header: "Has Power",
    transform: (row) => (row.has_power ? "Yes" : "No"),
  },
  { key: "parking_notes", header: "Parking Notes" },
  { key: "accessibility_notes", header: "Accessibility Notes" },
  { key: "space_description", header: "Space Description" },
  { key: "music_preferences", header: "Music Preferences" },
  { key: "has_band_in_mind", header: "Has Band in Mind" },
  { key: "band_count_preference", header: "Band Count Preference" },
  { key: "rain_date_available", header: "Rain Date Available" },
  { key: "comments", header: "Comments" },
  { key: "assigned_bands", header: "Assigned Bands" },
  { key: "admin_notes", header: "Admin Notes" },
  {
    key: "created_at",
    header: "Applied On",
    transform: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export function exportBands(
  bands: BandApplication[],
  porches: PorchApplication[],
  reviewers: { id: number; email: string; first_name: string | null; last_name: string | null }[],
  format: ExportFormat,
) {
  const porchMap = new Map(porches.map((p) => [p.id, p.address]));
  const reviewerMap = new Map(
    reviewers.map((r) => [
      r.id,
      r.first_name || r.last_name
        ? `${r.first_name || ""} ${r.last_name || ""}`.trim()
        : r.email.split("@")[0],
    ]),
  );

  const enriched = bands.map((band) => ({
    ...band,
    porch_address: band.assigned_porch_id
      ? (porchMap.get(band.assigned_porch_id) ?? "")
      : "",
    reviewer_name: band.assigned_reviewer_id
      ? (reviewerMap.get(band.assigned_reviewer_id) ?? "")
      : "",
  }));

  exportToFile(enriched, BAND_EXPORT_COLUMNS, "bands-export", format);
}

const normalizeTime = (t: string | null): string | null =>
  t ? t.substring(0, 5) : null;

function formatTime12Hour(time24: string): string {
  const [hourStr, min] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
}

function buildTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = (normalizeTime(start) || "12:00")
    .split(":")
    .map(Number);
  const [endHour, endMin] = (normalizeTime(end) || "18:00").split(":").map(Number);

  let currentHour = startHour;
  let currentMin = startMin;
  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    slots.push(
      `${currentHour.toString().padStart(2, "0")}:${currentMin
        .toString()
        .padStart(2, "0")}`,
    );
    currentMin += 15;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }
  return slots;
}

function groupPorchesByStreet(
  porches: PorchApplication[],
): Record<string, PorchApplication[]> {
  const groups: Record<string, PorchApplication[]> = {};
  porches.forEach((porch) => {
    const addressParts = porch.address.split(" ");
    const street = addressParts.slice(1).join(" ") || "Other";
    if (!groups[street]) groups[street] = [];
    groups[street].push(porch);
  });
  Object.keys(groups).forEach((street) => {
    groups[street].sort((a, b) => {
      const numA = parseInt(a.address) || 0;
      const numB = parseInt(b.address) || 0;
      return numA - numB;
    });
  });
  return groups;
}

export function exportSchedule(
  bands: BandApplication[],
  porches: PorchApplication[],
  eventStartTime: string,
  eventEndTime: string,
) {
  const slots = buildTimeSlots(eventStartTime, eventEndTime);
  const grouped = groupPorchesByStreet(porches);

  const aoa: (string | number)[][] = [
    ["Porch", ...slots.map(formatTime12Hour)],
  ];
  const merges: XLSX.Range[] = [];
  let r = 1; // row 0 is the header

  for (const street of Object.keys(grouped)) {
    aoa.push([street, ...slots.map(() => "")]);
    merges.push({ s: { r, c: 0 }, e: { r, c: slots.length } });
    r++;

    for (const porch of grouped[street]) {
      const row: (string | number)[] = new Array(slots.length + 1).fill("");
      row[0] = `${porch.address} — ${porch.owner_name}`;

      bands
        .filter((b) => b.assigned_porch_id === porch.id && b.set_start_time)
        .forEach((b) => {
          const startIdx = slots.indexOf(normalizeTime(b.set_start_time) || "");
          let endIdx = slots.indexOf(normalizeTime(b.set_end_time) || "");
          if (startIdx < 0) return;
          if (endIdx < 0) endIdx = slots.length; // clamp overruns

          row[startIdx + 1] = b.band_name; // +1 for the porch label column
          if (endIdx > startIdx + 1) {
            merges.push({ s: { r, c: startIdx + 1 }, e: { r, c: endIdx } });
          }
        });

      aoa.push(row);
      r++;
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [{ wch: 28 }, ...slots.map(() => ({ wch: 12 }))];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
  XLSX.writeFile(workbook, "schedule-export.xlsx");
}

export function exportPorches(
  porches: PorchApplication[],
  bands: BandApplication[],
  format: ExportFormat,
) {
  const enriched = porches.map((porch) => {
    const assignedBands = bands
      .filter((b) => b.assigned_porch_id === porch.id)
      .map((b) => b.band_name);
    return {
      ...porch,
      assigned_bands: assignedBands.join(", "),
    };
  });

  exportToFile(enriched, PORCH_EXPORT_COLUMNS, "porches-export", format);
}
