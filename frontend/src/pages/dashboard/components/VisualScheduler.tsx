import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { BandApplication, PorchApplication, PorchAvailableTime, ScheduleStatus } from "../types";

interface VisualSchedulerProps {
  bands: BandApplication[];
  porches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  porchAvailableTimes: PorchAvailableTime[];
  onScheduleBand: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
  onBandScheduleStatusChange: (
    bandId: number,
    status: ScheduleStatus | null
  ) => Promise<void>;
  onPorchScheduleStatusChange: (
    porchId: number,
    status: ScheduleStatus | null
  ) => Promise<void>;
  onCreateAvailableTime: (
    porchId: number,
    startTime: string,
    endTime: string
  ) => Promise<void>;
  onDeleteAvailableTime: (id: number) => Promise<void>;
}

interface TimeSlot {
  time: string;
  label: string;
}

interface Selection {
  porchId: number;
  startIndex: number;
  endIndex: number;
}

interface DragState {
  bandId: number;
  porchId: number;
  originalStartIndex: number;
  bandSpan: number;
  currentStartIndex: number;
}

interface ScheduledBand {
  band: BandApplication;
  startIndex: number;
  endIndex: number;
}

// Normalize time to HH:MM (strip seconds if present from Postgres TIME columns)
const normalizeTime = (t: string | null): string | null => {
  if (!t) return null;
  return t.substring(0, 5);
};

// Convert 24-hour time to 12-hour format
const formatTime12Hour = (time24: string): string => {
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
};

const SCHEDULE_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  needs_attention: { bg: "bg-rose-400", border: "border-rose-500", text: "text-rose-950" },
  in_progress: { bg: "bg-amber-400", border: "border-amber-500", text: "text-amber-950" },
  finalized: { bg: "bg-emerald-400", border: "border-emerald-500", text: "text-emerald-950" },
};

const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  needs_attention: "Needs Attention",
  in_progress: "In Progress",
  finalized: "Finalized",
};

const SCHEDULE_STATUS_OPTIONS: ScheduleStatus[] = ["needs_attention", "in_progress", "finalized"];

export default function VisualScheduler({
  bands,
  porches,
  eventStartTime,
  eventEndTime,
  porchAvailableTimes,
  onScheduleBand,
  onBandScheduleStatusChange,
  onPorchScheduleStatusChange,
  onCreateAvailableTime,
  onDeleteAvailableTime,
}: VisualSchedulerProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showBandPicker, setShowBandPicker] = useState(false);
  const [bandSearch, setBandSearch] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [statusPickerBand, setStatusPickerBand] = useState<BandApplication | null>(null);
  const [markingMode, setMarkingMode] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Generate time slots in 15-minute increments
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const normStart = normalizeTime(eventStartTime) || "12:00";
    const normEnd = normalizeTime(eventEndTime) || "18:00";
    const [startHour, startMin] = normStart.split(":").map(Number);
    const [endHour, endMin] = normEnd.split(":").map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const time = `${currentHour.toString().padStart(2, "0")}:${currentMin
        .toString()
        .padStart(2, "0")}`;
      const displayHour = currentHour > 12 ? currentHour - 12 : currentHour;
      const label = currentMin === 0 ? `${displayHour}:00` : "";
      slots.push({ time, label });

      currentMin += 15;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }

    return slots;
  }, [eventStartTime, eventEndTime]);

  // Group porches by street
  const groupedPorches = useMemo(() => {
    const groups: { [street: string]: PorchApplication[] } = {};

    porches.forEach((porch) => {
      // Extract street name from address (last word before any numbers)
      const addressParts = porch.address.split(" ");
      const street = addressParts.slice(1).join(" ") || "Other";

      if (!groups[street]) {
        groups[street] = [];
      }
      groups[street].push(porch);
    });

    // Sort porches within each group by address number
    Object.keys(groups).forEach((street) => {
      groups[street].sort((a, b) => {
        const numA = parseInt(a.address) || 0;
        const numB = parseInt(b.address) || 0;
        return numA - numB;
      });
    });

    return groups;
  }, [porches]);

  // Get approved and confirmed bands that can be scheduled
  const availableBands = useMemo(() => {
    return bands.filter((b) => b.status === "approved" && b.acceptance_confirmed === true);
  }, [bands]);

  // Get unscheduled bands (no porch assigned)
  const unscheduledBands = useMemo(() => {
    return availableBands.filter((b) => !b.assigned_porch_id);
  }, [availableBands]);

  // Index available times by porch ID for fast lookup
  const availableTimesByPorch = useMemo(() => {
    const map = new Map<number, PorchAvailableTime[]>();
    for (const at of porchAvailableTimes) {
      const list = map.get(at.porch_id) || [];
      list.push(at);
      map.set(at.porch_id, list);
    }
    return map;
  }, [porchAvailableTimes]);

  // Check if a grid slot falls within an available time for a porch
  const getAvailableTimeAtSlot = useCallback(
    (porchId: number, slotIndex: number): PorchAvailableTime | null => {
      const times = availableTimesByPorch.get(porchId);
      if (!times) return null;
      const slotTime = timeSlots[slotIndex]?.time;
      const nextSlotTime = timeSlots[slotIndex + 1]?.time || timeSlots[slotIndex]?.time;
      if (!slotTime) return null;
      for (const at of times) {
        const atStart = normalizeTime(at.start_time) || "";
        const atEnd = normalizeTime(at.end_time) || "";
        if (slotTime >= atStart && nextSlotTime <= atEnd) {
          return at;
        }
      }
      return null;
    },
    [availableTimesByPorch, timeSlots]
  );

  // Count empty vs filled available slots
  const slotCounts = useMemo(() => {
    let total = 0;
    let filled = 0;
    for (const at of porchAvailableTimes) {
      const atStart = normalizeTime(at.start_time) || "";
      const atEnd = normalizeTime(at.end_time) || "";
      const startIdx = timeSlots.findIndex((s) => s.time === atStart);
      const endIdx = timeSlots.findIndex((s) => s.time === atEnd);
      if (startIdx < 0 || endIdx < 0) continue;
      total++;
      const porchBands = bands.filter(
        (b) =>
          b.assigned_porch_id === at.porch_id &&
          b.set_start_time &&
          b.set_end_time
      );
      const isFilled = porchBands.some((b) => {
        const bStart = normalizeTime(b.set_start_time) || "";
        const bEnd = normalizeTime(b.set_end_time) || "";
        return bStart < atEnd && bEnd > atStart;
      });
      if (isFilled) filled++;
    }
    return { total, filled, empty: total - filled };
  }, [porchAvailableTimes, bands, timeSlots]);

  // Filter bands based on search
  const filteredBands = useMemo(() => {
    if (!bandSearch) return unscheduledBands;
    const search = bandSearch.toLowerCase();
    return unscheduledBands.filter(
      (b) =>
        b.band_name.toLowerCase().includes(search) ||
        b.genre.toLowerCase().includes(search)
    );
  }, [unscheduledBands, bandSearch]);

  const getBandColor = useCallback((band: BandApplication) => {
    const status = band.schedule_status || "needs_attention";
    return SCHEDULE_STATUS_COLORS[status] || SCHEDULE_STATUS_COLORS.needs_attention;
  }, []);

  const getScheduledBandsForPorch = useCallback(
    (porchId: number): ScheduledBand[] => {
      return bands
        .filter((b) => b.assigned_porch_id === porchId && b.set_start_time)
        .map((band) => {
          const normStart = normalizeTime(band.set_start_time);
          const normEnd = normalizeTime(band.set_end_time);
          const startIndex = timeSlots.findIndex(
            (s) => s.time === normStart
          );
          const endIndex = timeSlots.findIndex(
            (s) => s.time === normEnd
          );
          return {
            band,
            startIndex: startIndex >= 0 ? startIndex : 0,
            endIndex: endIndex >= 0 ? endIndex : startIndex + 2,
          };
        })
        .sort((a, b) => a.startIndex - b.startIndex);
    },
    [bands, timeSlots]
  );

  const handleCellMouseDown = (e: React.MouseEvent, porchId: number, slotIndex: number) => {
    if (e.button !== 0) return; // Only handle left-click
    // Check if clicking on a scheduled band
    const scheduledBands = getScheduledBandsForPorch(porchId);
    const clickedBand = scheduledBands.find(
      (sb) => slotIndex >= sb.startIndex && slotIndex < sb.endIndex
    );

    if (clickedBand) {
      // Start dragging the band
      const bandSpan = clickedBand.endIndex - clickedBand.startIndex;
      setDragState({
        bandId: clickedBand.band.id,
        porchId,
        originalStartIndex: clickedBand.startIndex,
        bandSpan,
        currentStartIndex: clickedBand.startIndex,
      });
      setIsSelecting(true);
    } else {
      // If clicking an available slot (not in marking mode), snap selection to the full slot range
      if (!markingMode) {
        const availTime = getAvailableTimeAtSlot(porchId, slotIndex);
        if (availTime) {
          const atStart = normalizeTime(availTime.start_time) || "";
          const atEnd = normalizeTime(availTime.end_time) || "";
          const startIdx = timeSlots.findIndex((s) => s.time === atStart);
          const endIdx = timeSlots.findIndex((s) => s.time === atEnd);
          setSelection({
            porchId,
            startIndex: startIdx >= 0 ? startIdx : slotIndex,
            endIndex: (endIdx >= 0 ? endIdx : slotIndex + 1) - 1,
          });
          setIsSelecting(true);
          return;
        }
      }
      // Start selecting empty slots
      setSelection({
        porchId,
        startIndex: slotIndex,
        endIndex: slotIndex,
      });
      setIsSelecting(true);
    }
    setShowBandPicker(false);
    setShowStatusPicker(false);
    setStatusPickerBand(null);
  };

  const handleCellMouseEnter = (porchId: number, slotIndex: number) => {
    if (!isSelecting) return;

    // Handle band dragging
    if (dragState) {
      if (porchId !== dragState.porchId) return; // Only allow dragging within same porch
      
      // Calculate new start position, ensuring band stays within bounds
      const maxStartIndex = timeSlots.length - dragState.bandSpan;
      const newStartIndex = Math.max(0, Math.min(slotIndex, maxStartIndex));
      
      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentStartIndex: newStartIndex,
        };
      });
      return;
    }

    // Handle empty slot selection
    if (!selection) return;
    if (porchId !== selection.porchId) return;

    setSelection((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        endIndex: slotIndex,
      };
    });
  };

  // Handle mouse up to complete selection or drag
  const handleMouseUp = useCallback(async () => {
    if (!isSelecting) return;

    // Handle completing a drag operation
    if (dragState) {
      const { bandId, porchId, originalStartIndex, currentStartIndex, bandSpan } = dragState;
      
      // If position changed, save the new position
      if (currentStartIndex !== originalStartIndex) {
        const newStartTime = timeSlots[currentStartIndex].time;
        const newEndTime = timeSlots[Math.min(currentStartIndex + bandSpan, timeSlots.length - 1)].time;
        
        setSaving(true);
        try {
          await onScheduleBand(bandId, porchId, newStartTime, newEndTime);
        } catch (error) {
          console.error("Failed to move band:", error);
        } finally {
          setSaving(false);
        }
        setDragState(null);
        setIsSelecting(false);
      } else {
        // Position didn't change - user just clicked, show the picker for editing
        setSelection({
          porchId,
          startIndex: originalStartIndex,
          endIndex: originalStartIndex + bandSpan - 1,
        });
        setDragState(null);
        setIsSelecting(false);
        
        setTimeout(() => {
          setShowBandPicker(true);
          setBandSearch("");
        }, 10);
      }
      return;
    }

    // Handle completing a selection
    if (selection) {
      // Normalize start/end (in case user dragged backwards)
      const start = Math.min(selection.startIndex, selection.endIndex);
      const end = Math.max(selection.startIndex, selection.endIndex);
      setSelection({ ...selection, startIndex: start, endIndex: end });

      if (markingMode) {
        // In marking mode, create an available time instead of opening band picker
        const startTime = timeSlots[start].time;
        const endTime = timeSlots[Math.min(end + 1, timeSlots.length - 1)].time;
        setSaving(true);
        try {
          await onCreateAvailableTime(selection.porchId, startTime, endTime);
        } catch (error) {
          console.error("Failed to create available time:", error);
        } finally {
          setSaving(false);
          setSelection(null);
        }
      } else {
        // Show band picker
        setTimeout(() => {
          setShowBandPicker(true);
          setBandSearch("");
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }, 10);
      }
    }
    setIsSelecting(false);
  }, [isSelecting, selection, dragState, timeSlots, onScheduleBand, markingMode, onCreateAvailableTime]);

  // Position the picker near the selection
  useEffect(() => {
    if (showBandPicker && selection && gridRef.current) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellWidth = 48; // Width of each cell
      const rowHeight = 48; // Height of each row

      // Find the row index for this porch
      let rowIndex = 0;
      const streets = Object.keys(groupedPorches);
      for (const street of streets) {
        for (const porch of groupedPorches[street]) {
          if (porch.id === selection.porchId) break;
          rowIndex++;
        }
        if (
          groupedPorches[street].some((p) => p.id === selection.porchId)
        )
          break;
        rowIndex++; // Add 1 for street header
      }

      const startX = 200 + selection.startIndex * cellWidth;
      const centerY = 48 + rowIndex * rowHeight + rowHeight / 2;

      setPickerPosition({
        left: Math.min(startX, gridRect.width - 320),
        top: centerY + 20,
      });
    }
  }, [showBandPicker, selection, groupedPorches]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowBandPicker(false);
        setShowStatusPicker(false);
        setStatusPickerBand(null);
        setSelection(null);
      }
    };

    if (showBandPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBandPicker]);

  // Global mouse up listener
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // Handle band selection from picker — schedule then advance to status picker
  const handleSelectBand = async (band: BandApplication) => {
    if (!selection || saving) return;

    const start = Math.min(selection.startIndex, selection.endIndex);
    const end = Math.max(selection.startIndex, selection.endIndex);

    const startTime = timeSlots[start].time;
    const endTime = timeSlots[Math.min(end + 1, timeSlots.length - 1)].time;

    setSaving(true);
    try {
      await onScheduleBand(band.id, selection.porchId, startTime, endTime);
      setBandSearch("");
      setStatusPickerBand({ ...band, schedule_status: "needs_attention" });
      setShowStatusPicker(true);
    } catch (error) {
      console.error("Failed to schedule band:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBand = async (bandId: number) => {
    setSaving(true);
    try {
      await onScheduleBand(bandId, null, null, null);
      setShowBandPicker(false);
      setSelection(null);
    } catch (error) {
      console.error("Failed to remove band:", error);
    } finally {
      setSaving(false);
    }
  };

  const isSlotSelected = (porchId: number, slotIndex: number) => {
    if (!selection || selection.porchId !== porchId) return false;
    const start = Math.min(selection.startIndex, selection.endIndex);
    const end = Math.max(selection.startIndex, selection.endIndex);
    return slotIndex >= start && slotIndex <= end;
  };

  const getBandAtSlot = (porchId: number, slotIndex: number): BandApplication | null => {
    const scheduledBands = getScheduledBandsForPorch(porchId);
    
    for (const sb of scheduledBands) {
      // If this band is being dragged, use the drag position instead
      if (dragState && dragState.bandId === sb.band.id && dragState.porchId === porchId) {
        const dragStart = dragState.currentStartIndex;
        const dragEnd = dragStart + dragState.bandSpan;
        if (slotIndex >= dragStart && slotIndex < dragEnd) {
          return sb.band;
        }
        continue; // Skip checking original position
      }
      
      // Normal check for non-dragging bands
      if (slotIndex >= sb.startIndex && slotIndex < sb.endIndex) {
        return sb.band;
      }
    }
    return null;
  };

  const isFirstSlotOfBand = (porchId: number, slotIndex: number): boolean => {
    const scheduledBands = getScheduledBandsForPorch(porchId);
    
    for (const sb of scheduledBands) {
      // If this band is being dragged, check the drag position
      if (dragState && dragState.bandId === sb.band.id && dragState.porchId === porchId) {
        if (slotIndex === dragState.currentStartIndex) {
          return true;
        }
        continue;
      }
      
      if (sb.startIndex === slotIndex) {
        return true;
      }
    }
    return false;
  };

  const getBandSpan = (porchId: number, slotIndex: number): number => {
    const scheduledBands = getScheduledBandsForPorch(porchId);
    
    for (const sb of scheduledBands) {
      // If this band is being dragged
      if (dragState && dragState.bandId === sb.band.id && dragState.porchId === porchId) {
        if (slotIndex === dragState.currentStartIndex) {
          return dragState.bandSpan;
        }
        continue;
      }
      
      if (sb.startIndex === slotIndex) {
        return sb.endIndex - sb.startIndex;
      }
    }
    return 0;
  };
  
  const isBandBeingDragged = (bandId: number): boolean => {
    return dragState?.bandId === bandId;
  };

  // Get selected band for picker context
  const getSelectedBandContext = (): BandApplication | null => {
    if (!selection) return null;
    const scheduledBands = getScheduledBandsForPorch(selection.porchId);
    const found = scheduledBands.find(
      (sb) =>
        selection.startIndex >= sb.startIndex &&
        selection.startIndex < sb.endIndex
    );
    return found?.band || null;
  };

  const selectedBandContext = getSelectedBandContext();

  return (
    <div className="relative">
      {/* Legend & Controls */}
      <div className="mb-4 flex flex-wrap gap-3 items-center text-sm">
        <span className="font-medium text-gray-700">Legend:</span>
        {SCHEDULE_STATUS_OPTIONS.map((status) => {
          const color = SCHEDULE_STATUS_COLORS[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 ${color.bg} ${color.border} border rounded`}></div>
              <span className="text-gray-600">{SCHEDULE_STATUS_LABELS[status]}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-sky-50 border-2 border-sky-300 rounded"></div>
          <span className="text-gray-600">Open slot</span>
        </div>
        <span className="text-gray-400 mx-1">|</span>
        <button
          onClick={() => setMarkingMode((prev) => !prev)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            markingMode
              ? "bg-sky-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {markingMode ? "Marking Open Slots" : "Mark Open Slots"}
        </button>
        <span className="text-gray-600 italic">
          {markingMode
            ? "Drag to mark available time • Right-click to remove"
            : "Drag to select time slots • Click a band to set status"}
        </span>
      </div>

      {/* Scheduler Grid */}
      <div
        ref={gridRef}
        className="relative overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm"
        style={{ userSelect: "none" }}
      >
        {/* Header Row */}
        <div className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          {/* Street/Porch header */}
          <div className="flex-shrink-0 w-[200px] px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 bg-gray-100">
            <div className="text-sm uppercase tracking-wide">Porch</div>
          </div>
          {/* Time headers */}
          <div className="flex">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.time}
                className={`flex-shrink-0 w-12 py-3 text-center text-xs font-medium ${
                  slot.label ? "text-gray-700" : "text-gray-400"
                } ${index % 4 === 0 ? "border-l border-gray-300" : "border-l border-gray-100"}`}
              >
                {slot.label || ""}
              </div>
            ))}
          </div>
        </div>

        {/* Porch Rows grouped by street */}
        {Object.keys(groupedPorches).map((street) => (
          <div key={street}>
            {/* Street Header */}
            <div className="flex bg-gray-100/80 border-b border-gray-200">
              <div className="flex-shrink-0 w-[200px] px-4 py-2 font-bold text-gray-800 uppercase text-sm tracking-wider border-r border-gray-200">
                {street}
              </div>
              <div className="flex">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.time}
                    className={`flex-shrink-0 w-12 h-full ${
                      index % 4 === 0 ? "border-l border-gray-300" : "border-l border-gray-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Porch rows for this street */}
            {groupedPorches[street].map((porch) => (
              <div
                key={porch.id}
                className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
              >
                {/* Porch info */}
                <div className={`flex-shrink-0 w-[200px] px-3 py-2 border-r border-gray-200 transition-colors ${
                  porch.schedule_status === "finalized" ? "bg-emerald-50" : "bg-white"
                }`}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title={porch.schedule_status ? SCHEDULE_STATUS_LABELS[porch.schedule_status] : "Set porch schedule status"}
                      onClick={() => {
                        const currentIndex = porch.schedule_status
                          ? SCHEDULE_STATUS_OPTIONS.indexOf(porch.schedule_status as ScheduleStatus)
                          : -1;
                        const nextStatus = SCHEDULE_STATUS_OPTIONS[(currentIndex + 1) % SCHEDULE_STATUS_OPTIONS.length];
                        onPorchScheduleStatusChange(porch.id, nextStatus);
                      }}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        porch.schedule_status === "finalized"
                          ? "bg-emerald-500 border-emerald-600 text-white"
                          : porch.schedule_status === "in_progress"
                          ? "bg-amber-400 border-amber-500"
                          : porch.schedule_status === "needs_attention"
                          ? "bg-rose-400 border-rose-500"
                          : "bg-gray-100 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {porch.schedule_status === "finalized" && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm font-medium text-gray-800">
                      {porch.address.split(" ")[0]}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{porch.id}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate ml-6">
                    {porch.owner_name}
                  </div>
                </div>

                {/* Time slots */}
                <div className="flex relative">
                  {timeSlots.map((slot, index) => {
                    const band = getBandAtSlot(porch.id, index);
                    const isFirstSlot = isFirstSlotOfBand(porch.id, index);
                    const bandSpan = isFirstSlot
                      ? getBandSpan(porch.id, index)
                      : 0;
                    const isSelected = isSlotSelected(porch.id, index);
                    const color = band ? getBandColor(band) : null;

                    // If this slot is covered by a band but not the first slot, skip rendering
                    // (the band block from the first slot already spans this space)
                    if (band && !isFirstSlot) {
                      return null;
                    }

                    // If this is the first slot of a band, render the band block
                    if (band && isFirstSlot && color) {
                      const isDragging = isBandBeingDragged(band.id);
                      return (
                        <div
                          key={slot.time}
                          className="flex-shrink-0 h-12 relative"
                          style={{ width: `${bandSpan * 48}px` }}
                        >
                          <div
                            className={`absolute inset-y-1 inset-x-0 ${color.bg} ${color.border} border-2 rounded-md shadow-sm flex items-center px-2 overflow-hidden transition-all ${
                              isDragging 
                                ? "cursor-grabbing opacity-80 shadow-lg scale-[1.02] ring-2 ring-white" 
                                : "cursor-grab hover:shadow-md"
                            }`}
                            onMouseDown={(e) =>
                              handleCellMouseDown(e, porch.id, index)
                            }
                            onMouseEnter={() =>
                              handleCellMouseEnter(porch.id, index)
                            }
                          >
                            <span
                              className={`text-xs font-semibold ${color.text} truncate`}
                            >
                              {band.band_name}
                            </span>
                            {isDragging && (
                              <span className="ml-auto text-xs opacity-70">
                                ↔
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Empty slot — check if it's within an available time
                    const availableTime = getAvailableTimeAtSlot(porch.id, index);
                    const isAvailable = !!availableTime;

                    // Detect edges of available-time blocks for distinct borders
                    let isSlotStart = false;
                    let isSlotEnd = false;
                    if (availableTime) {
                      const atStart = normalizeTime(availableTime.start_time) || "";
                      const atEnd = normalizeTime(availableTime.end_time) || "";
                      isSlotStart = slot.time === atStart;
                      const nextSlotTime = timeSlots[index + 1]?.time;
                      isSlotEnd = !nextSlotTime || nextSlotTime >= atEnd;
                    }

                    return (
                      <div
                        key={slot.time}
                        className={`flex-shrink-0 w-12 h-12 transition-colors ${
                          markingMode ? "cursor-cell" : "cursor-crosshair"
                        } ${
                          isSelected
                            ? markingMode ? "bg-sky-200" : "bg-porch-300"
                            : isAvailable
                            ? "bg-sky-50 hover:bg-sky-100"
                            : "bg-white hover:bg-porch-50"
                        } ${
                          isAvailable && !isSelected
                            ? `border-y-2 border-sky-300 ${isSlotStart ? "border-l-2 rounded-l-md" : ""} ${isSlotEnd ? "border-r-2 rounded-r-md" : ""}`
                            : index % 4 === 0 ? "border-l border-gray-300" : "border-l border-gray-100"
                        }`}
                        onMouseDown={(e) =>
                          handleCellMouseDown(e, porch.id, index)
                        }
                        onMouseEnter={() =>
                          handleCellMouseEnter(porch.id, index)
                        }
                        onContextMenu={(e) => {
                          if (availableTime) {
                            e.preventDefault();
                            onDeleteAvailableTime(availableTime.id);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Band Picker Dropdown */}
      {showBandPicker && selection && (
        <div
          ref={pickerRef}
          className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden"
          style={{
            top: pickerPosition.top,
            left: pickerPosition.left,
          }}
        >
          {showStatusPicker && statusPickerBand ? (
            <>
              {/* Status Picker View */}
              <div className="px-4 py-3 bg-gradient-to-r from-porch-500 to-porch-600 text-white">
                <button
                  onClick={() => {
                    setShowStatusPicker(false);
                    setStatusPickerBand(null);
                  }}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs mb-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div className="text-sm font-medium">Set Schedule Status</div>
                <div className="text-xs opacity-90 mt-0.5 truncate">
                  {statusPickerBand.band_name}
                </div>
              </div>

              <div className="p-3 space-y-2">
                {SCHEDULE_STATUS_OPTIONS.map((status) => {
                  const color = SCHEDULE_STATUS_COLORS[status];
                  const isActive = statusPickerBand.schedule_status === status;
                  return (
                    <button
                      key={status}
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await onBandScheduleStatusChange(statusPickerBand.id, status);
                          setShowStatusPicker(false);
                          setStatusPickerBand(null);
                          setShowBandPicker(false);
                          setSelection(null);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                        isActive
                          ? `${color.border} ${color.bg}/20 shadow-sm`
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.bg} ${color.border} border flex-shrink-0 flex items-center justify-center`}>
                        {isActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                        {SCHEDULE_STATUS_LABELS[status]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => {
                    setShowStatusPicker(false);
                    setStatusPickerBand(null);
                    setShowBandPicker(false);
                    setSelection(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Default Band Picker View */}
              <div className="px-4 py-3 bg-gradient-to-r from-porch-500 to-porch-600 text-white">
                <div className="text-sm font-medium">
                  {selectedBandContext ? "Edit Scheduled Band" : "Schedule a Band"}
                </div>
                <div className="text-xs opacity-90 mt-0.5">
                  {formatTime12Hour(timeSlots[Math.min(selection.startIndex, selection.endIndex)]?.time || "12:00")}
                  {" → "}
                  {formatTime12Hour(
                    timeSlots[
                      Math.min(
                        Math.max(selection.startIndex, selection.endIndex) + 1,
                        timeSlots.length - 1
                      )
                    ]?.time || "12:00"
                  )}
                </div>
              </div>

              {selectedBandContext && (
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {selectedBandContext.band_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedBandContext.genre} • {selectedBandContext.member_count} members
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <button
                        onClick={() => {
                          setStatusPickerBand(selectedBandContext);
                          setShowStatusPicker(true);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          selectedBandContext.schedule_status
                            ? `${SCHEDULE_STATUS_COLORS[selectedBandContext.schedule_status].bg}/80 ${SCHEDULE_STATUS_COLORS[selectedBandContext.schedule_status].text}`
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {selectedBandContext.schedule_status
                          ? SCHEDULE_STATUS_LABELS[selectedBandContext.schedule_status]
                          : "Set Status"}
                      </button>
                      <button
                        onClick={() => handleRemoveBand(selectedBandContext.id)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        {saving ? "..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={bandSearch}
                    onChange={(e) => setBandSearch(e.target.value)}
                    placeholder="Search bands by name or genre..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-porch-400 focus:border-porch-400 outline-none"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {filteredBands.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {unscheduledBands.length === 0
                      ? "All bands are scheduled!"
                      : "No bands match your search"}
                  </div>
                ) : (
                  filteredBands.map((band) => (
                    <div
                      key={band.id}
                      onClick={() => handleSelectBand(band)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-porch-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {band.band_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                            {band.genre}
                          </span>
                          <span>•</span>
                          <span>{band.member_count} members</span>
                          <span>•</span>
                          <span>{band.set_length} min set</span>
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => {
                    setShowBandPicker(false);
                    setSelection(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        {SCHEDULE_STATUS_OPTIONS.map((status) => {
          const color = SCHEDULE_STATUS_COLORS[status];
          const count = availableBands.filter(
            (b) => b.assigned_porch_id && b.schedule_status === status
          ).length;
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${color.bg}`}></div>
              <span>
                <strong>{count}</strong> {SCHEDULE_STATUS_LABELS[status].toLowerCase()}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span>
            <strong>{unscheduledBands.length}</strong> unscheduled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <span>
            <strong>{porches.length}</strong> porches
          </span>
        </div>
        {slotCounts.total > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-400"></div>
              <span>
                <strong>{slotCounts.empty}</strong> open slot{slotCounts.empty !== 1 ? "s" : ""}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
