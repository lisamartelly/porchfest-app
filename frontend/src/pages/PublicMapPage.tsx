import { useState, useEffect, useMemo, useRef } from "react";
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

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
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

export default function PublicMapPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPorch, setSelectedPorch] = useState<PublicPorch | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);

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
    if (!data || !timeFilter) return data?.porches || [];
    return data.porches
      .map((p) => ({
        ...p,
        bands: p.bands.filter((b) => {
          if (!b.set_start_time || !b.set_end_time) return false;
          return b.set_start_time <= timeFilter && b.set_end_time > timeFilter;
        }),
      }))
      .filter((p) => p.bands.length > 0);
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {data.event.name}
            </h1>
            <p className="text-sm text-gray-500">
              {formatDate(data.event.date)} · {formatTime(data.event.start_time)}{" "}
              – {formatTime(data.event.end_time)} · {data.organization.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeFilter || ""}
              onChange={(e) => setTimeFilter(e.target.value || null)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Times</option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {formatTime(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Map + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
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

            {filteredPorches.map((porch) => (
              <Marker
                key={porch.id}
                position={[porch.lat, porch.lng]}
                eventHandlers={{
                  click: () => setSelectedPorch(porch),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{porch.address}</p>
                    <p className="text-gray-500">
                      {porch.bands.length} band{porch.bands.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-gray-200 overflow-y-auto">
          {selectedPorch ? (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {selectedPorch.address}
                  </h3>
                  {selectedPorch.accessibility_notes && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedPorch.accessibility_notes}
                    </p>
                  )}
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

              {selectedPorch.bands.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No bands scheduled{timeFilter ? " at this time" : ""}.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedPorch.bands
                    .sort((a, b) =>
                      (a.set_start_time || "").localeCompare(b.set_start_time || "")
                    )
                    .map((band) => (
                      <div
                        key={band.id}
                        className="bg-gray-50 rounded-lg p-3"
                      >
                        <h4 className="font-semibold text-gray-900">
                          {band.band_name}
                        </h4>
                        {band.set_start_time && (
                          <p className="text-sm text-blue-600 font-medium">
                            {formatTime(band.set_start_time)} –{" "}
                            {formatTime(band.set_end_time)}
                          </p>
                        )}
                        {band.genre && (
                          <p className="text-sm text-gray-500">{band.genre}</p>
                        )}
                        {band.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                            {band.bio}
                          </p>
                        )}
                        {/* Links */}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {band.music_sample_link && (
                            <a
                              href={band.music_sample_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Listen
                            </a>
                          )}
                          {band.instagram && (
                            <a
                              href={`https://instagram.com/${band.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Instagram
                            </a>
                          )}
                          {band.spotify && (
                            <a
                              href={band.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Spotify
                            </a>
                          )}
                          {band.website && (
                            <a
                              href={band.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                All Porches
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {filteredPorches.length} location{filteredPorches.length !== 1 ? "s" : ""}
                {timeFilter ? ` at ${formatTime(timeFilter)}` : ""}
              </p>
              <div className="space-y-1">
                {filteredPorches.map((porch) => (
                  <button
                    key={porch.id}
                    onClick={() => setSelectedPorch(porch)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 truncate">
                      {porch.address}
                    </p>
                    <p className="text-xs text-gray-500">
                      {porch.bands.length} band{porch.bands.length !== 1 ? "s" : ""}
                      {porch.bands.length > 0 &&
                        ` · ${porch.bands.map((b) => b.band_name).join(", ")}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
