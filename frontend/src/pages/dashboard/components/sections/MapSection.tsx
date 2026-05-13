import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../../../lib/api";
import { useOrgStore } from "../../../../stores/orgStore";
import {
  BandApplication,
  PorchApplication,
  EventSettings,
} from "../../types";

// Fix default marker icon path issue with bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const GEOCODED_ICON = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapSectionProps {
  bands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  onScheduleBand: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
  onPorchesUpdate: React.Dispatch<React.SetStateAction<PorchApplication[]>>;
  onApprovedPorchesUpdate: React.Dispatch<
    React.SetStateAction<PorchApplication[]>
  >;
  onEventSettingsUpdate: React.Dispatch<
    React.SetStateAction<EventSettings | null>
  >;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

function computeConePolygon(
  lat: number,
  lng: number,
  radiusMeters: number,
  directionDeg: number,
  widthDeg: number
): [number, number][] {
  const R = 6371000;
  const points: [number, number][] = [[lat, lng]];
  const startAngle = directionDeg - widthDeg / 2;
  const endAngle = directionDeg + widthDeg / 2;
  const steps = Math.max(12, Math.round(widthDeg / 5));

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const bearing = (angle * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const d = radiusMeters / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );

    points.push([(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]);
  }

  points.push([lat, lng]);
  return points;
}

function FitBounds({ porches }: { porches: PorchApplication[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const geocoded = porches.filter((p) => p.lat != null && p.lng != null);
    if (geocoded.length === 0) return;

    const bounds = L.latLngBounds(
      geocoded.map((p) => [p.lat!, p.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    fitted.current = true;
  }, [porches, map]);

  return null;
}

function ClickToRelocate({
  active,
  onRelocate,
}: {
  active: boolean;
  onRelocate: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) {
        onRelocate(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  if (!active) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none">
      Click on the map to place the pin
    </div>
  );
}

export default function MapSection({
  bands,
  approvedPorches,
  eventSettings,
  onScheduleBand,
  onPorchesUpdate,
  onApprovedPorchesUpdate,
  onEventSettingsUpdate,
}: MapSectionProps) {
  const { activeOrgId } = useOrgStore();
  const [selectedPorch, setSelectedPorch] = useState<PorchApplication | null>(null);
  const [showSound, setShowSound] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null);

  // Band assignment state
  const [assigningBand, setAssigningBand] = useState(false);
  const [selectedBandId, setSelectedBandId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  // Sound editing state
  const [editingSound, setEditingSound] = useState(false);
  const [soundRadius, setSoundRadius] = useState(50);
  const [soundDirection, setSoundDirection] = useState<number | null>(null);
  const [soundConeWidth, setSoundConeWidth] = useState(360);

  // Pin relocation state
  const [relocating, setRelocating] = useState(false);

  // Map publish state
  const [publishing, setPublishing] = useState(false);

  const geocodedPorches = useMemo(
    () =>
      approvedPorches
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })),
    [approvedPorches]
  );

  const ungeocodedPorches = useMemo(
    () => approvedPorches.filter((p) => p.lat == null || p.lng == null),
    [approvedPorches]
  );

  const approvedBands = useMemo(
    () => bands.filter((b) => b.status === "approved"),
    [bands]
  );

  const unassignedBands = useMemo(
    () => approvedBands.filter((b) => !b.assigned_porch_id),
    [approvedBands]
  );

  const bandsAtPorch = useCallback(
    (porchId: number) => approvedBands.filter((b) => b.assigned_porch_id === porchId),
    [approvedBands]
  );

  const timeSlots = useMemo(() => {
    if (!eventSettings) return [];
    const slots: string[] = [];
    const [startH] = eventSettings.start_time.split(":").map(Number);
    const [endH] = eventSettings.end_time.split(":").map(Number);
    for (let h = startH; h < endH; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    slots.push(eventSettings.end_time);
    return slots;
  }, [eventSettings]);

  const handleBulkGeocode = async () => {
    setGeocoding(true);
    setGeocodeResult(null);
    try {
      const qs = activeOrgId ? `?org_id=${activeOrgId}` : "";
      const result = await api.post(`/api/admin/porches/geocode${qs}`, {});
      setGeocodeResult(
        `Geocoded ${result.geocoded} of ${result.total} porches` +
          (result.failed > 0 ? ` (${result.failed} failed)` : "")
      );
      // Refresh data
      const porchData = await api.get(`/api/admin/porches${qs}`);
      onPorchesUpdate(porchData || []);
      onApprovedPorchesUpdate(
        (porchData || []).filter((p: PorchApplication) => p.status === "approved")
      );
    } catch (err) {
      setGeocodeResult("Geocoding failed. Check console for details.");
      console.error(err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleAssignBand = async () => {
    if (!selectedBandId || !selectedPorch || !startTime || !endTime) return;
    setAssignError(null);
    try {
      await onScheduleBand(selectedBandId, selectedPorch.id, startTime, endTime);
      setAssigningBand(false);
      setSelectedBandId(null);
      setStartTime("");
      setEndTime("");
    } catch (err: unknown) {
      const error = err as Error;
      setAssignError(error.message || "Failed to assign band");
    }
  };

  const handleUnassignBand = async (bandId: number) => {
    try {
      await onScheduleBand(bandId, null, null, null);
    } catch (err) {
      console.error("Failed to unassign band:", err);
    }
  };

  const handleRelocatePorch = useCallback(
    async (lat: number, lng: number) => {
      if (!selectedPorch) return;
      try {
        const updated = await api.patch(
          `/api/admin/porches/${selectedPorch.id}/coordinates`,
          { lat, lng }
        );
        const normalized = { ...updated, lat: Number(updated.lat), lng: Number(updated.lng) };
        onApprovedPorchesUpdate((prev) =>
          prev.map((p) => (p.id === normalized.id ? normalized : p))
        );
        onPorchesUpdate((prev) =>
          prev.map((p) => (p.id === normalized.id ? normalized : p))
        );
        setSelectedPorch(normalized);
        setRelocating(false);
      } catch (err) {
        console.error("Failed to relocate porch:", err);
      }
    },
    [selectedPorch, onApprovedPorchesUpdate, onPorchesUpdate]
  );

  const handleMarkerDragEnd = useCallback(
    async (porchId: number, e: L.DragEndEvent) => {
      const { lat, lng } = e.target.getLatLng();
      try {
        const updated = await api.patch(
          `/api/admin/porches/${porchId}/coordinates`,
          { lat, lng }
        );
        const normalized = { ...updated, lat: Number(updated.lat), lng: Number(updated.lng) };
        onApprovedPorchesUpdate((prev) =>
          prev.map((p) => (p.id === normalized.id ? normalized : p))
        );
        onPorchesUpdate((prev) =>
          prev.map((p) => (p.id === normalized.id ? normalized : p))
        );
        if (selectedPorch?.id === porchId) {
          setSelectedPorch(normalized);
        }
      } catch (err) {
        console.error("Failed to save dragged position:", err);
      }
    },
    [selectedPorch, onApprovedPorchesUpdate, onPorchesUpdate]
  );

  const handleSoundSave = async () => {
    if (!selectedPorch) return;
    try {
      const updated = await api.patch(
        `/api/admin/porches/${selectedPorch.id}/sound`,
        {
          sound_radius_meters: soundRadius,
          sound_direction_degrees: soundDirection,
          sound_cone_width_degrees: soundConeWidth,
        }
      );
      onApprovedPorchesUpdate((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      onPorchesUpdate((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setSelectedPorch(updated);
      setEditingSound(false);
    } catch (err) {
      console.error("Failed to update sound settings:", err);
    }
  };

  const handleToggleMapPublished = async () => {
    if (!eventSettings) return;
    setPublishing(true);
    try {
      const qs = activeOrgId ? `?org_id=${activeOrgId}` : "";
      const updated = await api.patch(`/api/admin/event${qs}`, {
        map_published: !eventSettings.map_published,
      });
      onEventSettingsUpdate(updated);
    } catch (err) {
      console.error("Failed to toggle map publish:", err);
    } finally {
      setPublishing(false);
    }
  };

  const selectPorch = (porch: PorchApplication) => {
    setSelectedPorch({
      ...porch,
      lat: porch.lat != null ? Number(porch.lat) : null,
      lng: porch.lng != null ? Number(porch.lng) : null,
    });
    setRelocating(false);
    setAssigningBand(false);
    setEditingSound(false);
    setSoundRadius(porch.sound_radius_meters);
    setSoundDirection(porch.sound_direction_degrees);
    setSoundConeWidth(porch.sound_cone_width_degrees);
    setAssignError(null);
  };

  const defaultCenter: [number, number] =
    geocodedPorches.length > 0
      ? [geocodedPorches[0].lat!, geocodedPorches[0].lng!]
      : [42.3876, -71.0995]; // Somerville, MA fallback

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Map */}
      <div className="flex-1 relative rounded-xl overflow-hidden shadow-md border border-gray-200">
        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setShowSound(!showSound)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-md transition-colors ${
                showSound
                  ? "bg-porch-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {showSound ? "Hide Sound" : "Show Sound"}
            </button>
            {ungeocodedPorches.length > 0 && (
              <button
                onClick={handleBulkGeocode}
                disabled={geocoding}
                className="px-3 py-1.5 rounded-lg text-sm font-medium shadow-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {geocoding
                  ? "Geocoding..."
                  : `Geocode ${ungeocodedPorches.length} Porch${ungeocodedPorches.length > 1 ? "es" : ""}`}
              </button>
            )}
            {geocodeResult && (
              <span className="px-3 py-1.5 rounded-lg text-sm bg-white shadow-md text-gray-700">
                {geocodeResult}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleMapPublished}
              disabled={publishing}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-md transition-colors ${
                eventSettings?.map_published
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {eventSettings?.map_published ? "Map Published" : "Publish Map"}
            </button>
          </div>
        </div>

        {geocodedPorches.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center p-8">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No geocoded porches yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {approvedPorches.length > 0
                  ? "Click \"Geocode\" above to resolve addresses to coordinates."
                  : "Approve some porch applications first."}
              </p>
              {approvedPorches.length > 0 && ungeocodedPorches.length > 0 && (
                <button
                  onClick={handleBulkGeocode}
                  disabled={geocoding}
                  className="mt-4 px-4 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 disabled:opacity-50"
                >
                  {geocoding ? "Geocoding..." : `Geocode ${ungeocodedPorches.length} Porches`}
                </button>
              )}
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={15}
            className="h-full w-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <FitBounds porches={geocodedPorches} />

            <ClickToRelocate
              active={relocating}
              onRelocate={handleRelocatePorch}
            />

            {geocodedPorches.map((porch) => (
              <Marker
                key={porch.id}
                position={[porch.lat!, porch.lng!]}
                icon={GEOCODED_ICON}
                draggable
                eventHandlers={{
                  click: () => selectPorch(porch),
                  dragend: (e) => handleMarkerDragEnd(porch.id, e),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{porch.address}</p>
                    <p className="text-gray-500">{porch.owner_name}</p>
                    <p className="text-gray-500">
                      {bandsAtPorch(porch.id).length} band{bandsAtPorch(porch.id).length !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showSound &&
              geocodedPorches.map((porch) => {
                if (
                  porch.sound_direction_degrees != null &&
                  porch.sound_cone_width_degrees < 360
                ) {
                  const polygon = computeConePolygon(
                    porch.lat!,
                    porch.lng!,
                    porch.sound_radius_meters,
                    porch.sound_direction_degrees,
                    porch.sound_cone_width_degrees
                  );
                  return (
                    <Polygon
                      key={`sound-${porch.id}`}
                      positions={polygon}
                      pathOptions={{
                        color:
                          selectedPorch?.id === porch.id
                            ? "#7c3aed"
                            : "#3b82f6",
                        fillColor:
                          selectedPorch?.id === porch.id
                            ? "#7c3aed"
                            : "#3b82f6",
                        fillOpacity: 0.15,
                        weight: 1.5,
                      }}
                    />
                  );
                }
                return (
                  <Circle
                    key={`sound-${porch.id}`}
                    center={[porch.lat!, porch.lng!]}
                    radius={porch.sound_radius_meters}
                    pathOptions={{
                      color:
                        selectedPorch?.id === porch.id ? "#7c3aed" : "#3b82f6",
                      fillColor:
                        selectedPorch?.id === porch.id ? "#7c3aed" : "#3b82f6",
                      fillOpacity: 0.1,
                      weight: 1.5,
                    }}
                  />
                );
              })}
          </MapContainer>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-md border border-gray-200 overflow-y-auto">
        {selectedPorch ? (
          <div className="p-4">
            {/* Porch header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {selectedPorch.address}
                </h3>
                <p className="text-sm text-gray-500">{selectedPorch.owner_name}</p>
              </div>
              <button
                onClick={() => setSelectedPorch(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Porch details */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              {selectedPorch.capacity && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-gray-500">Capacity</span>
                  <p className="font-medium">{selectedPorch.capacity}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-gray-500">Power</span>
                <p className="font-medium">{selectedPorch.has_power ? "Yes" : "No"}</p>
              </div>
              {selectedPorch.lat && (
                <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Coordinates</span>
                    <button
                      onClick={() => setRelocating(!relocating)}
                      className={`text-xs font-medium ${
                        relocating
                          ? "text-amber-600 hover:text-amber-700"
                          : "text-porch-600 hover:text-porch-700"
                      }`}
                    >
                      {relocating ? "Cancel" : "Relocate"}
                    </button>
                  </div>
                  <p className="font-medium text-xs">
                    {Number(selectedPorch.lat).toFixed(5)}, {Number(selectedPorch.lng).toFixed(5)}
                  </p>
                  {relocating && (
                    <p className="text-xs text-amber-600 mt-1">
                      Click on the map or drag the pin to move it
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sound Settings */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-700">Sound Zone</h4>
                <button
                  onClick={() => setEditingSound(!editingSound)}
                  className="text-xs text-porch-600 hover:text-porch-700 font-medium"
                >
                  {editingSound ? "Cancel" : "Edit"}
                </button>
              </div>
              {editingSound ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Radius: {soundRadius}m
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      value={soundRadius}
                      onChange={(e) => setSoundRadius(Number(e.target.value))}
                      className="w-full accent-porch-600"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <input
                        type="checkbox"
                        checked={soundDirection !== null}
                        onChange={(e) =>
                          setSoundDirection(e.target.checked ? 0 : null)
                        }
                        className="accent-porch-600"
                      />
                      Directional
                    </label>
                    {soundDirection !== null && (
                      <>
                        <div className="mt-1">
                          <label className="text-xs text-gray-500 block mb-1">
                            Direction: {soundDirection}°
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={359}
                            value={soundDirection}
                            onChange={(e) =>
                              setSoundDirection(Number(e.target.value))
                            }
                            className="w-full accent-porch-600"
                          />
                        </div>
                        <div className="mt-1">
                          <label className="text-xs text-gray-500 block mb-1">
                            Cone width: {soundConeWidth}°
                          </label>
                          <input
                            type="range"
                            min={10}
                            max={360}
                            step={10}
                            value={soundConeWidth}
                            onChange={(e) =>
                              setSoundConeWidth(Number(e.target.value))
                            }
                            className="w-full accent-porch-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleSoundSave}
                    className="w-full py-1.5 bg-porch-600 text-white text-sm rounded-lg hover:bg-porch-700"
                  >
                    Save Sound Settings
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p>Radius: {selectedPorch.sound_radius_meters}m</p>
                  {selectedPorch.sound_direction_degrees != null ? (
                    <p>
                      Direction: {selectedPorch.sound_direction_degrees}° (
                      {selectedPorch.sound_cone_width_degrees}° cone)
                    </p>
                  ) : (
                    <p>Omnidirectional (360°)</p>
                  )}
                </div>
              )}
            </div>

            {/* Bands at this porch */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-700">
                  Bands ({bandsAtPorch(selectedPorch.id).length})
                </h4>
                <button
                  onClick={() => {
                    setAssigningBand(!assigningBand);
                    setAssignError(null);
                  }}
                  className="text-xs text-porch-600 hover:text-porch-700 font-medium"
                >
                  {assigningBand ? "Cancel" : "+ Add Band"}
                </button>
              </div>

              {/* Existing band assignments */}
              {bandsAtPorch(selectedPorch.id).length === 0 && !assigningBand && (
                <p className="text-sm text-gray-400 italic">No bands assigned yet</p>
              )}
              {bandsAtPorch(selectedPorch.id)
                .sort((a, b) => (a.set_start_time || "").localeCompare(b.set_start_time || ""))
                .map((band) => (
                  <div
                    key={band.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {band.band_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {band.genre}
                        {band.set_start_time &&
                          ` · ${formatTime(band.set_start_time)} – ${formatTime(band.set_end_time)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnassignBand(band.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove assignment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

              {/* Assign band form */}
              {assigningBand && (
                <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3">
                  {assignError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {assignError}
                    </p>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Band</label>
                    <select
                      value={selectedBandId ?? ""}
                      onChange={(e) =>
                        setSelectedBandId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-porch-500 focus:border-porch-500"
                    >
                      <option value="">Select a band...</option>
                      {unassignedBands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.band_name} {b.genre ? `(${b.genre})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Start
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-porch-500 focus:border-porch-500"
                      >
                        <option value="">--:--</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>
                            {formatTime(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">End</label>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-porch-500 focus:border-porch-500"
                      >
                        <option value="">--:--</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>
                            {formatTime(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAssignBand}
                    disabled={!selectedBandId || !startTime || !endTime}
                    className="w-full py-1.5 bg-porch-600 text-white text-sm rounded-lg hover:bg-porch-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign Band
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Porches</h3>
            <p className="text-sm text-gray-500 mb-4">
              Click a marker on the map to select a porch, or choose one below.
            </p>

            {/* Event location settings */}
            {eventSettings && (
              <div className="mb-4 bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Default Location
                </h4>
                <p className="text-sm text-gray-700">
                  {eventSettings.default_city || eventSettings.default_state
                    ? `${eventSettings.default_city || ""}${eventSettings.default_city && eventSettings.default_state ? ", " : ""}${eventSettings.default_state || ""}`
                    : "Not set — set in Event Settings for better geocoding"}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{geocodedPorches.length}</p>
                <p className="text-xs text-green-600">On Map</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{ungeocodedPorches.length}</p>
                <p className="text-xs text-amber-600">Need Geocoding</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{approvedBands.length}</p>
                <p className="text-xs text-blue-600">Approved Bands</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{unassignedBands.length}</p>
                <p className="text-xs text-purple-600">Unassigned</p>
              </div>
            </div>

            {/* Porch list */}
            <div className="space-y-1">
              {approvedPorches.map((porch) => (
                <button
                  key={porch.id}
                  onClick={() => porch.lat != null ? selectPorch(porch) : undefined}
                  disabled={porch.lat == null}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    porch.lat != null
                      ? "hover:bg-porch-50 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <p className="font-medium text-gray-900 truncate">
                    {porch.address}
                  </p>
                  <p className="text-xs text-gray-500">
                    {porch.owner_name} ·{" "}
                    {bandsAtPorch(porch.id).length} band
                    {bandsAtPorch(porch.id).length !== 1 ? "s" : ""}
                    {porch.lat == null && " · needs geocoding"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
