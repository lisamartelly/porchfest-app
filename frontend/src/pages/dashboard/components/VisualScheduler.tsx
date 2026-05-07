import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { BandApplication, PorchApplication } from "../types";

interface VisualSchedulerProps {
  bands: BandApplication[];
  porches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  onScheduleBand: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
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

// Generate distinct colors for bands
const BAND_COLORS = [
  { bg: "bg-amber-400", border: "border-amber-500", text: "text-amber-900" },
  { bg: "bg-emerald-400", border: "border-emerald-500", text: "text-emerald-900" },
  { bg: "bg-sky-400", border: "border-sky-500", text: "text-sky-900" },
  { bg: "bg-rose-400", border: "border-rose-500", text: "text-rose-900" },
  { bg: "bg-violet-400", border: "border-violet-500", text: "text-violet-900" },
  { bg: "bg-orange-400", border: "border-orange-500", text: "text-orange-900" },
  { bg: "bg-teal-400", border: "border-teal-500", text: "text-teal-900" },
  { bg: "bg-pink-400", border: "border-pink-500", text: "text-pink-900" },
  { bg: "bg-lime-400", border: "border-lime-500", text: "text-lime-900" },
  { bg: "bg-cyan-400", border: "border-cyan-500", text: "text-cyan-900" },
  { bg: "bg-fuchsia-400", border: "border-fuchsia-500", text: "text-fuchsia-900" },
  { bg: "bg-yellow-400", border: "border-yellow-500", text: "text-yellow-900" },
];

export default function VisualScheduler({
  bands,
  porches,
  eventStartTime,
  eventEndTime,
  onScheduleBand,
}: VisualSchedulerProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showBandPicker, setShowBandPicker] = useState(false);
  const [bandSearch, setBandSearch] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
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

  // Get approved bands that can be scheduled
  const availableBands = useMemo(() => {
    return bands.filter((b) => b.status === "approved");
  }, [bands]);

  // Get unscheduled bands (no porch assigned)
  const unscheduledBands = useMemo(() => {
    return availableBands.filter((b) => !b.assigned_porch_id);
  }, [availableBands]);

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

  const bandColors = useMemo(() => {
    const colors: { [bandId: number]: (typeof BAND_COLORS)[0] } = {};
    availableBands.forEach((band, index) => {
      colors[band.id] = BAND_COLORS[index % BAND_COLORS.length];
    });
    return colors;
  }, [availableBands]);

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

  const handleCellMouseDown = (porchId: number, slotIndex: number) => {
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
      // Start selecting empty slots
      setSelection({
        porchId,
        startIndex: slotIndex,
        endIndex: slotIndex,
      });
      setIsSelecting(true);
    }
    setShowBandPicker(false);
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

      // Show band picker
      setTimeout(() => {
        setShowBandPicker(true);
        setBandSearch("");
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }, 10);
    }
    setIsSelecting(false);
  }, [isSelecting, selection, dragState, timeSlots, onScheduleBand]);

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

  // Handle band selection from picker
  const handleSelectBand = async (band: BandApplication) => {
    if (!selection || saving) return;

    const start = Math.min(selection.startIndex, selection.endIndex);
    const end = Math.max(selection.startIndex, selection.endIndex);

    const startTime = timeSlots[start].time;
    const endTime = timeSlots[Math.min(end + 1, timeSlots.length - 1)].time;

    setSaving(true);
    try {
      await onScheduleBand(band.id, selection.porchId, startTime, endTime);
      setShowBandPicker(false);
      setSelection(null);
      setBandSearch("");
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
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 items-center text-sm">
        <span className="font-medium text-gray-700">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-porch-100 border border-porch-300 rounded"></div>
          <span className="text-gray-600">Empty</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-porch-300 border border-porch-400 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <span className="text-gray-400 mx-2">|</span>
        <span className="text-gray-600 italic">
          Click and drag to select time slots • Drag existing bands to move them
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
                } ${index % 4 === 0 ? "border-l border-gray-300" : ""}`}
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
              <div className="flex-1"></div>
            </div>

            {/* Porch rows for this street */}
            {groupedPorches[street].map((porch) => (
              <div
                key={porch.id}
                className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
              >
                {/* Porch info */}
                <div className="flex-shrink-0 w-[200px] px-4 py-2 border-r border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {porch.address.split(" ")[0]}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{porch.id}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
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
                    const color = band ? bandColors[band.id] : null;

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
                            onMouseDown={() =>
                              handleCellMouseDown(porch.id, index)
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

                    // Empty slot
                    return (
                      <div
                        key={slot.time}
                        className={`flex-shrink-0 w-12 h-12 border-r border-gray-100 cursor-crosshair transition-colors ${
                          index % 4 === 0 ? "border-l border-l-gray-200" : ""
                        } ${
                          isSelected
                            ? "bg-porch-300"
                            : "bg-white hover:bg-porch-50"
                        }`}
                        onMouseDown={() =>
                          handleCellMouseDown(porch.id, index)
                        }
                        onMouseEnter={() =>
                          handleCellMouseEnter(porch.id, index)
                        }
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
          {/* Header with time range */}
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

          {/* If editing existing band, show remove option */}
          {selectedBandContext && (
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {selectedBandContext.band_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedBandContext.genre} • {selectedBandContext.member_count} members
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveBand(selectedBandContext.id)}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {saving ? "..." : "Remove"}
                </button>
              </div>
            </div>
          )}

          {/* Search input */}
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

          {/* Band list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredBands.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {unscheduledBands.length === 0
                  ? "All bands are scheduled!"
                  : "No bands match your search"}
              </div>
            ) : (
              filteredBands.map((band) => {
                const color = bandColors[band.id];
                return (
                  <div
                    key={band.id}
                    onClick={() => handleSelectBand(band)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-porch-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    {/* Color indicator */}
                    <div
                      className={`w-3 h-3 rounded-full ${color.bg} ${color.border} border`}
                    ></div>

                    {/* Band info */}
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

                    {/* Arrow */}
                    <svg
                      className="w-4 h-4 text-gray-400"
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
                );
              })
            )}
          </div>

          {/* Footer */}
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
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>
            <strong>{availableBands.filter((b) => b.assigned_porch_id).length}</strong> scheduled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span>
            <strong>{unscheduledBands.length}</strong> unscheduled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span>
            <strong>{porches.length}</strong> porches
          </span>
        </div>
      </div>
    </div>
  );
}
