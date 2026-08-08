import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const API_URL = import.meta.env.VITE_API_URL ?? "";
const MD_BREAKPOINT = 768;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicBand {
  id: number;
  band_name: string;
  genre: string | null;
  bio: string | null;
  set_start_time: string | null;
  set_end_time: string | null;
  music_sample_link: string | null;
  instagram: string | null;
  spotify: string | null;
  website: string | null;
  photo_key: string | null;
}

interface PublicPorch {
  id: number;
  porch_number: number | null;
  address: string;
  city: string;
  lat: number;
  lng: number;
  capacity: number | null;
  has_power: boolean;
  accessibility_notes: string | null;
  bands: PublicBand[];
}

interface PublicMapData {
  event: {
    id: number;
    name: string;
    date: string;
    start_time: string;
    end_time: string;
    description: string | null;
  };
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  porches: PublicPorch[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatTimeShort(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MD_BREAKPOINT
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ─── Map sub-components ──────────────────────────────────────────────────────

function FitBounds({ porches }: { porches: PublicPorch[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || porches.length === 0) return;
    const bounds = L.latLngBounds(
      porches.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    fitted.current = true;
  }, [porches, map]);

  return null;
}

function PanToSelected({
  porch,
  sheetHeight,
}: {
  porch: PublicPorch | null;
  sheetHeight: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!porch) return;
    const target = L.latLng(porch.lat, porch.lng);
    map.panTo(target, { animate: true });

    // After pan completes, offset for the sheet covering the bottom of the map
    setTimeout(() => {
      const px = map.latLngToContainerPoint(target);
      const mapH = map.getSize().y;
      const visibleBottom = mapH - sheetHeight;
      if (px.y > visibleBottom) {
        map.panBy([0, px.y - visibleBottom + 30], { animate: true });
      }
    }, 350);
  }, [porch, map, sheetHeight]);

  return null;
}

function createNumberedIcon(num: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: #4F46E5;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${num > 99 ? 10 : 13}px;
      font-weight: 600;
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const defaultMarkerIcon = L.divIcon({
  className: "",
  html: `<div style="
    background: #4F46E5;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2.5px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});

function LocateUser() {
  const map = useMap();
  const markerRef = useRef<L.CircleMarker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [locating, setLocating] = useState(false);

  const handleLocate = useCallback(() => {
    setLocating(true);
    map.locate({ enableHighAccuracy: true });
  }, [map]);

  useEffect(() => {
    const onFound = (e: L.LocationEvent) => {
      setLocating(false);
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.circleMarker(e.latlng, {
          radius: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          color: "#fff",
          weight: 2.5,
        }).addTo(map);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng(e.latlng).setRadius(e.accuracy / 2);
      } else {
        circleRef.current = L.circle(e.latlng, {
          radius: e.accuracy / 2,
          color: "#4285F4",
          fillColor: "#4285F4",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }
      map.setView(e.latlng, Math.max(map.getZoom(), 16));
    };

    const onError = () => {
      setLocating(false);
    };

    map.on("locationfound", onFound);
    map.on("locationerror", onError);
    return () => {
      map.off("locationfound", onFound);
      map.off("locationerror", onError);
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    };
  }, [map]);

  return (
    <button
      onClick={handleLocate}
      disabled={locating}
      className="absolute bottom-20 md:bottom-4 right-3 z-[500] bg-white hover:bg-gray-50 shadow-lg rounded-lg p-2.5 transition-colors border border-gray-200"
      title="Find my location"
    >
      {locating ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
        </svg>
      )}
    </button>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

type SheetSnap = "peek" | "half" | "full";

const SNAP_PX = {
  peek: 56,
  half: () => window.innerHeight * 0.4,
  full: () => window.innerHeight * 0.85,
};

function getSnapHeight(snap: SheetSnap): number {
  return snap === "peek" ? SNAP_PX.peek : snap === "half" ? SNAP_PX.half() : SNAP_PX.full();
}

function nearestSnap(y: number, velocity: number): SheetSnap {
  const half = SNAP_PX.half();
  const full = SNAP_PX.full();

  // Strong swipe overrides position
  if (velocity > 600) return "peek";
  if (velocity < -600) return "full";

  const dists: [SheetSnap, number][] = [
    ["peek", Math.abs(y - SNAP_PX.peek)],
    ["half", Math.abs(y - half)],
    ["full", Math.abs(y - full)],
  ];
  dists.sort((a, b) => a[1] - b[1]);
  return dists[0][0];
}

function MobileBottomSheet({
  snap,
  onSnapChange,
  children,
}: {
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startY: number;
    startHeight: number;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const [currentHeight, setCurrentHeight] = useState(() => getSnapHeight(snap));
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setCurrentHeight(getSnapHeight(snap));
    }
  }, [snap, isDragging]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragState.current = {
      startY: touch.clientY,
      startHeight: getSnapHeight(snap),
      lastY: touch.clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
    setIsDragging(true);
  }, [snap]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const touch = e.touches[0];
    const delta = ds.startY - touch.clientY;
    const now = Date.now();
    const dt = now - ds.lastTime;
    if (dt > 0) {
      ds.velocity = (ds.lastY - touch.clientY) / dt * 1000;
    }
    ds.lastY = touch.clientY;
    ds.lastTime = now;
    const newH = Math.max(SNAP_PX.peek, Math.min(SNAP_PX.full(), ds.startHeight + delta));
    setCurrentHeight(newH);
  }, []);

  const onTouchEnd = useCallback(() => {
    const ds = dragState.current;
    if (!ds) return;
    // Positive velocity = swiping down (toward peek)
    const next = nearestSnap(currentHeight, -ds.velocity);
    dragState.current = null;
    setIsDragging(false);
    onSnapChange(next);
  }, [currentHeight, onSnapChange]);

  const translateY = `calc(100% - ${currentHeight}px)`;

  return (
    <div
      ref={sheetRef}
      className="md:hidden absolute inset-x-0 bottom-0 z-[500] bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
      style={{
        transform: `translateY(${translateY})`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
        height: "100%",
        touchAction: "none",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto overscroll-contain"
        style={{ height: `calc(100% - 24px)` }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PublicMapPage() {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PublicMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPorch, setSelectedPorch] = useState<PublicPorch | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [_panelOpen, setPanelOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek");
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMap() {
      try {
        const res = await fetch(`${API_URL}/api/events/org/${slug}/map`);
        if (!res.ok) {
          if (res.status === 403) {
            setError("The map for this event is not yet published.");
          } else if (res.status === 404) {
            setError("Event not found.");
          } else {
            setError("Failed to load map data.");
          }
          return;
        }
        const mapData: PublicMapData = await res.json();
        setData(mapData);
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    }
    fetchMap();
  }, [slug]);

  const filteredPorches = useMemo(() => {
    if (!data) return [];
    let porches = data.porches;

    if (timeFilter) {
      porches = porches
        .map((p) => ({
          ...p,
          bands: p.bands.filter((b) =>
            b.set_start_time && b.set_end_time &&
            b.set_start_time <= timeFilter && b.set_end_time > timeFilter
          ),
        }))
        .filter((p) => p.bands.length > 0);
    }

    return porches;
  }, [data, timeFilter]);

  const timeSlots = useMemo(() => {
    if (!data) return [];
    const slots: string[] = [];
    const [startH] = data.event.start_time.split(":").map(Number);
    const [endH] = data.event.end_time.split(":").map(Number);
    for (let h = startH; h < endH; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
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
          <p className="text-gray-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const defaultCenter: [number, number] =
    data.porches.length > 0
      ? [data.porches[0].lat, data.porches[0].lng]
      : [42.3876, -71.0995];

  const handleSelectPorch = (porch: PublicPorch) => {
    setSelectedPorch(porch);
    if (isMobile) {
      setSheetSnap("half");
    } else {
      setPanelOpen(true);
    }
  };

  const sheetHeightForPan = sheetSnap === "peek" ? SNAP_PX.peek : SNAP_PX.half();

  const panelContent = selectedPorch ? (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base text-gray-900 truncate flex items-center gap-2">
            {selectedPorch.porch_number != null && (
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {selectedPorch.porch_number}
              </span>
            )}
            {selectedPorch.address}
          </h3>
          {selectedPorch.accessibility_notes && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {selectedPorch.accessibility_notes}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setSelectedPorch(null);
            if (isMobile) {
              setSheetSnap("peek");
            } else {
              setPanelOpen(false);
            }
          }}
          className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 ml-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {selectedPorch.bands.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No bands scheduled{timeFilter ? " at this time" : ""}.
        </p>
      ) : (
        <div className="space-y-2">
          {selectedPorch.bands
            .sort((a, b) =>
              (a.set_start_time || "").localeCompare(b.set_start_time || "")
            )
            .map((band) => (
              <div key={band.id} className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {band.band_name}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {band.set_start_time && (
                    <span className="text-xs text-blue-600 font-medium">
                      {formatTime(band.set_start_time)} – {formatTime(band.set_end_time)}
                    </span>
                  )}
                  {band.genre && (
                    <span className="text-xs text-gray-500">{band.genre}</span>
                  )}
                </div>
                {band.bio && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {band.bio}
                  </p>
                )}
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {band.music_sample_link && (
                    <a href={band.music_sample_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 underline">Listen</a>
                  )}
                  {band.instagram && (
                    <a href={`https://instagram.com/${band.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 underline">Instagram</a>
                  )}
                  {band.spotify && (
                    <a href={band.spotify} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 underline">Spotify</a>
                  )}
                  {band.website && (
                    <a href={band.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 underline">Website</a>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  ) : (
    <div className="p-4">
      <h3 className="font-semibold text-base text-gray-900 mb-1">
        All Porches
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        {filteredPorches.length} location{filteredPorches.length !== 1 ? "s" : ""}
        {timeFilter ? ` at ${formatTime(timeFilter)}` : ""}
      </p>
      <div className="space-y-0.5">
        {filteredPorches.map((porch) => (
          <button
            key={porch.id}
            onClick={() => handleSelectPorch(porch)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900 truncate flex items-center gap-2">
              {porch.porch_number != null && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {porch.porch_number}
                </span>
              )}
              {porch.address}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {porch.bands.length} band{porch.bands.length !== 1 ? "s" : ""}
              {porch.bands.length > 0 &&
                ` · ${porch.bands.map((b) => b.band_name).join(", ")}`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Summary line for the mobile sheet peek state
  const sheetPeekSummary = selectedPorch ? (
    <div className="px-4 pb-2">
      <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
        {selectedPorch.porch_number != null && (
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
            {selectedPorch.porch_number}
          </span>
        )}
        {selectedPorch.address}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {selectedPorch.bands.length > 0
          ? selectedPorch.bands
              .sort((a, b) => (a.set_start_time || "").localeCompare(b.set_start_time || ""))
              .map((b) =>
                b.set_start_time
                  ? `${formatTime(b.set_start_time)}: ${b.band_name}`
                  : b.band_name
              )
              .join(" · ")
          : "No bands scheduled"}
      </p>
    </div>
  ) : (
    <div className="px-4 pb-2">
      <p className="text-sm font-semibold text-gray-900">
        {filteredPorches.length} Porch{filteredPorches.length !== 1 ? "es" : ""}
      </p>
      <p className="text-xs text-gray-500">Swipe up to browse</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50" style={{ height: "100dvh" }}>
      {/* ─── Header ─── */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-3 py-1.5 md:px-4 md:py-3 max-w-screen-2xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm md:text-xl font-bold text-gray-900 truncate">
              {data.event.name}
            </h1>
            <p className="text-[11px] md:text-sm text-gray-500 truncate">
              {formatDate(data.event.date)} · {formatTime(data.event.start_time)} – {formatTime(data.event.end_time)}
            </p>
          </div>

          {/* Desktop: time select dropdown */}
          {!isMobile && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400">Filter by set time</span>
              <select
                value={timeFilter || ""}
                onChange={(e) => setTimeFilter(e.target.value || null)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Times</option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mobile: scrollable time pills */}
        {isMobile && timeSlots.length > 0 && (<>
          <p className="text-[11px] text-gray-400 px-3 pb-1">Filter by set time</p>
          <div
            ref={pillsRef}
            className="flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              onClick={() => setTimeFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                timeFilter === null
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(timeFilter === t ? null : t)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  timeFilter === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {formatTimeShort(t)}
              </button>
            ))}
          </div>
        </>)}
      </header>

      {/* ─── Map + Panels ─── */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FitBounds porches={filteredPorches} />
            {isMobile && (
              <PanToSelected porch={selectedPorch} sheetHeight={sheetHeightForPan} />
            )}

            {filteredPorches.map((porch) => (
              <Marker
                key={porch.id}
                position={[porch.lat, porch.lng]}
                icon={porch.porch_number ? createNumberedIcon(porch.porch_number) : defaultMarkerIcon}
                eventHandlers={{
                  click: () => handleSelectPorch(porch),
                }}
              >
                {/* Desktop-only Leaflet popup */}
                {!isMobile && (
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">
                        {porch.porch_number ? `#${porch.porch_number} · ` : ""}{porch.address}
                      </p>
                      {porch.bands.length === 0 ? (
                        <p className="text-gray-500">No bands scheduled</p>
                      ) : (
                        <div className="mt-1 space-y-0.5">
                          {[...porch.bands]
                            .sort((a, b) => (a.set_start_time || "").localeCompare(b.set_start_time || ""))
                            .map((band) => (
                              <p key={band.id} className="text-gray-700">
                                {band.set_start_time
                                  ? `${formatTime(band.set_start_time)} – ${formatTime(band.set_end_time)}: `
                                  : ""}
                                {band.band_name}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                )}
              </Marker>
            ))}
            <LocateUser />
          </MapContainer>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block absolute top-0 right-0 bottom-0 w-80 lg:w-96 bg-white border-l border-gray-200 overflow-y-auto z-[500]">
          {panelContent}
        </div>

        {/* Mobile bottom sheet */}
        {isMobile && (
          <MobileBottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
            {sheetSnap === "peek" ? sheetPeekSummary : panelContent}
          </MobileBottomSheet>
        )}
      </div>
    </div>
  );
}
