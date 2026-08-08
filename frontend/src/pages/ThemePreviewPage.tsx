import { useState } from "react";
import { PorchApplication, BandApplication } from "./dashboard/types";

type ThemeName = "warm-sunset" | "earthy-pop" | "pastel-garden";

interface ThemeConfig {
  label: string;
  description: string;
  activeTab: string;
  inactiveTab: string;
  chip: string;
  rainChip: string;
  link: string;
  bandColors: { bg: string; text: string }[];
  cardBorder: string;
}

const THEMES: Record<ThemeName, ThemeConfig> = {
  "warm-sunset": {
    label: "Warm Sunset",
    description: "All warm tones — terracotta, amber, rose. Cozy and festival-like.",
    activeTab: "bg-porch-600 text-white border-porch-600 shadow-sm",
    inactiveTab: "bg-white text-porch-700 border-porch-200 hover:bg-porch-50 hover:border-porch-300",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    rainChip: "bg-orange-100 text-orange-700 border-orange-200",
    link: "text-porch-600 hover:text-porch-700",
    bandColors: [
      { bg: "bg-amber-400", text: "text-amber-900" },
      { bg: "bg-orange-400", text: "text-orange-900" },
      { bg: "bg-rose-400", text: "text-rose-900" },
      { bg: "bg-pink-400", text: "text-pink-900" },
      { bg: "bg-red-300", text: "text-red-900" },
    ],
    cardBorder: "border-porch-100",
  },
  "earthy-pop": {
    label: "Earthy with a Pop",
    description: "Warm brand + one cool indigo accent for interactive elements.",
    activeTab: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
    inactiveTab: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    chip: "bg-indigo-100 text-indigo-700 border-indigo-200",
    rainChip: "bg-porch-100 text-porch-700 border-porch-200",
    link: "text-indigo-600 hover:text-indigo-700",
    bandColors: [
      { bg: "bg-amber-400", text: "text-amber-900" },
      { bg: "bg-orange-400", text: "text-orange-900" },
      { bg: "bg-indigo-400", text: "text-indigo-900" },
      { bg: "bg-teal-400", text: "text-teal-900" },
      { bg: "bg-rose-400", text: "text-rose-900" },
    ],
    cardBorder: "border-gray-200",
  },
  "pastel-garden": {
    label: "Pastel Garden",
    description: "Dark active tab, soft pastels everywhere else. Light and airy.",
    activeTab: "bg-gray-900 text-white border-gray-900 shadow-sm",
    inactiveTab: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    rainChip: "bg-sky-100 text-sky-700 border-sky-200",
    link: "text-porch-600 hover:text-porch-700",
    bandColors: [
      { bg: "bg-amber-300", text: "text-amber-900" },
      { bg: "bg-emerald-300", text: "text-emerald-900" },
      { bg: "bg-sky-300", text: "text-sky-900" },
      { bg: "bg-rose-300", text: "text-rose-900" },
      { bg: "bg-violet-300", text: "text-violet-900" },
    ],
    cardBorder: "border-gray-200",
  },
};

const DUMMY_PORCH: PorchApplication = {
  id: 42,
  event_id: 1,
  porch_number: 7,
  owner_name: "Jane Doe",
  email: "jane.doe@email.com",
  phone: "(617) 555-1234",
  address: "123 Maple Street",
  city: "Boston",
  lat: 42.3876,
  lng: -71.0995,
  capacity: 30,
  has_power: true,
  parking_notes: "Street parking available on Maple Ave, no driveway access.",
  accessibility_notes: "Three steps up to the porch, no ramp.",
  space_description: "Wide covered front porch with room for a 4-piece band. Shaded in the afternoon.",
  has_band_in_mind: "yes",
  music_preferences: "Indie rock, folk, or singer-songwriter. Would love something mellow for the late afternoon slot. No heavy metal please!",
  band_count_preference: "2 bands, about 2 hours of music total.",
  rain_date_available: "maybe",
  comments: "We hosted last year and had a blast! Our neighbors are also hosting so it'd be great to coordinate set times. Dog-friendly porch.",
  sound_radius_meters: 50,
  sound_direction_degrees: null,
  sound_cone_width_degrees: 360,
  status: "approved",
  admin_notes: null,
  schedule_status: null,
  created_at: "2026-04-15T14:30:00Z",
};

const DUMMY_BANDS: BandApplication[] = [
  {
    id: 101,
    event_id: 1,
    band_name: "The Sunbears",
    contact_name: "Mike Chen",
    contact_email: "mike@sunbears.com",
    contact_phone: "555-0101",
    genre: "Indie Folk",
    member_count: "4",
    music_sample_link: "https://example.com",
    bio: "",
    set_length: "60",
    venmo_handle: null,
    instagram: null,
    spotify: null,
    soundcloud: null,
    bandcamp: null,
    facebook: null,
    website: null,
    scheduling_notes: null,
    photo_key: null,
    questions_comments: null,
    status: "approved",
    admin_notes: null,
    acceptance_confirmed: null,
    schedule_status: "finalized",
    created_at: "2026-04-10T10:00:00Z",
    assigned_porch_id: 42,
    set_start_time: "14:00",
    set_end_time: "15:00",
    assigned_reviewer_id: null,
    reviewer_rating: null,
    reviewer_notes: null,
  },
  {
    id: 102,
    event_id: 1,
    band_name: "Honeyvine",
    contact_name: "Sarah Park",
    contact_email: "sarah@honeyvine.com",
    contact_phone: "555-0102",
    genre: "Singer-Songwriter",
    member_count: "2",
    music_sample_link: "https://example.com",
    bio: "",
    set_length: "45",
    venmo_handle: null,
    instagram: null,
    spotify: null,
    soundcloud: null,
    bandcamp: null,
    facebook: null,
    website: null,
    scheduling_notes: null,
    photo_key: null,
    questions_comments: null,
    status: "approved",
    admin_notes: null,
    acceptance_confirmed: null,
    schedule_status: "in_progress",
    created_at: "2026-04-12T09:00:00Z",
    assigned_porch_id: 42,
    set_start_time: "15:15",
    set_end_time: "16:00",
    assigned_reviewer_id: null,
    reviewer_rating: null,
    reviewer_notes: null,
  },
  {
    id: 103,
    event_id: 1,
    band_name: "Maple Road",
    contact_name: "Tom Lin",
    contact_email: "tom@mapleroad.com",
    contact_phone: "555-0103",
    genre: "Folk Rock",
    member_count: "5",
    music_sample_link: "https://example.com",
    bio: "",
    set_length: "60",
    venmo_handle: null,
    instagram: null,
    spotify: null,
    soundcloud: null,
    bandcamp: null,
    facebook: null,
    website: null,
    scheduling_notes: null,
    photo_key: null,
    questions_comments: null,
    status: "approved",
    admin_notes: null,
    acceptance_confirmed: null,
    schedule_status: "needs_attention",
    created_at: "2026-04-14T11:00:00Z",
    assigned_porch_id: 42,
    set_start_time: "16:15",
    set_end_time: "17:15",
    assigned_reviewer_id: null,
    reviewer_rating: null,
    reviewer_notes: null,
  },
];

// --- Icons (same Heroicons outline style as PorchCard) ---

function IconUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconMail({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function IconPhone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function IconMusic({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  );
}

function IconHome({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconChat({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function IconCloudRain({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
    </svg>
  );
}

// --- Themed Porch Card ---

type Tab = "contact" | "music" | "details" | "comments";

function ThemedPorchCard({ theme }: { theme: ThemeConfig }) {
  const [activeTab, setActiveTab] = useState<Tab>("contact");
  const porch = DUMMY_PORCH;
  const scheduledBands = DUMMY_BANDS;

  const eventStartMinutes = 720;
  const totalMinutes = 360;

  const hourMarkers = [
    { time: "12:00", label: "12PM", position: 0 },
    { time: "13:00", label: "1PM", position: 16.67 },
    { time: "14:00", label: "2PM", position: 33.33 },
    { time: "15:00", label: "3PM", position: 50 },
    { time: "16:00", label: "4PM", position: 66.67 },
    { time: "17:00", label: "5PM", position: 83.33 },
    { time: "18:00", label: "6PM", position: 100 },
  ];

  const timeToMinutes = (time: string | null): number => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const formatTime12 = (time: string | null): string => {
    if (!time) return "";
    const [hourStr, minStr] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minStr} ${period}`;
  };

  const formatSubmittedDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "contact", label: "Contact", icon: <IconUser className="w-3.5 h-3.5" /> },
    { id: "music", label: "Music Prefs", icon: <IconMusic className="w-3.5 h-3.5" /> },
    { id: "details", label: "Porch Details", icon: <IconHome className="w-3.5 h-3.5" /> },
    { id: "comments", label: "Comments", icon: <IconChat className="w-3.5 h-3.5" /> },
  ];

  const getBandColor = (index: number) => theme.bandColors[index % theme.bandColors.length];

  const renderTabContent = () => {
    switch (activeTab) {
      case "contact":
        return (
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="flex items-center gap-2.5">
              <IconMail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${porch.email}`} className={`underline underline-offset-2 ${theme.link}`}>
                {porch.email}
              </a>
            </div>
            {porch.phone && (
              <div className="flex items-center gap-2.5">
                <IconPhone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${porch.phone}`} className={`underline underline-offset-2 ${theme.link}`}>
                  {porch.phone}
                </a>
              </div>
            )}
            {porch.rain_date_available && (
              <div className="flex items-center gap-2.5">
                <IconCloudRain className="w-4 h-4 text-gray-400" />
                <span>Rain date available: <span className="font-medium">Maybe</span></span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <IconCalendar className="w-4 h-4 text-gray-400" />
              <span>Submitted {formatSubmittedDate(porch.created_at)}</span>
            </div>
          </div>
        );
      case "music":
        return (
          <div className="text-sm text-gray-700">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {porch.music_preferences}
            </p>
          </div>
        );
      case "details":
        return (
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Space description</div>
              <p className="leading-relaxed">{porch.space_description}</p>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Band / duration preference</div>
              <p className="leading-relaxed">{porch.band_count_preference}</p>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Parking notes</div>
              <p className="leading-relaxed">{porch.parking_notes}</p>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">Accessibility notes</div>
              <p className="leading-relaxed">{porch.accessibility_notes}</p>
            </div>
          </div>
        );
      case "comments":
        return (
          <div className="text-sm text-gray-700">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {porch.comments}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow ${theme.cardBorder}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-lg text-gray-900">{porch.address}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                approved
              </span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${theme.chip}`}>
                band in mind
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {porch.owner_name}
              <span className="text-gray-400"> · {porch.city}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
            <select className="px-3 py-2 rounded-lg border text-sm font-medium bg-green-50 border-green-200 text-green-700">
              <option>Approved</option>
            </select>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mt-5 mb-4 border-b border-gray-100 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                activeTab === tab.id ? theme.activeTab : theme.inactiveTab
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[80px] mb-5">
          {renderTabContent()}
        </div>

        {/* Schedule */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Schedule (3 bands)
          </h4>
          <div className="relative">
            <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
              {hourMarkers.map((marker) => (
                <span
                  key={marker.time}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${marker.position}%` }}
                >
                  {marker.label}
                </span>
              ))}
            </div>
            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden mt-5">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.time}
                  className="absolute top-0 bottom-0 w-px bg-gray-300"
                  style={{ left: `${marker.position}%` }}
                />
              ))}
              {scheduledBands.map((band, index) => {
                const startMin = timeToMinutes(band.set_start_time);
                const endMin = timeToMinutes(band.set_end_time);
                const left = ((startMin - eventStartMinutes) / totalMinutes) * 100;
                const width = ((endMin - startMin) / totalMinutes) * 100;
                const color = getBandColor(index);
                return (
                  <div
                    key={band.id}
                    className={`absolute top-1 bottom-1 ${color.bg} rounded-md flex items-center px-2 overflow-hidden shadow-sm`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: "40px" }}
                    title={`${band.band_name}: ${formatTime12(band.set_start_time)} - ${formatTime12(band.set_end_time)}`}
                  >
                    <span className={`text-xs font-semibold ${color.text} truncate`}>
                      {band.band_name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {scheduledBands.map((band, index) => {
                const color = getBandColor(index);
                return (
                  <div key={band.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className={`w-2.5 h-2.5 rounded-sm ${color.bg}`} />
                    <span className="font-medium">{band.band_name}</span>
                    <span className="text-gray-400">
                      {formatTime12(band.set_start_time)} - {formatTime12(band.set_end_time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Font Options ---

type FontName = "inter" | "dm-sans" | "plus-jakarta" | "outfit" | "satoshi";

interface FontOption {
  label: string;
  family: string;
  description: string;
}

const FONTS: Record<FontName, FontOption> = {
  inter: {
    label: "Inter",
    family: "'Inter', sans-serif",
    description: "The gold standard for modern web apps. Tight letterforms, great at small sizes. Used by Linear, Vercel.",
  },
  "dm-sans": {
    label: "DM Sans",
    family: "'DM Sans', sans-serif",
    description: "Slightly geometric with soft, rounded terminals. Friendly and modern without being quirky.",
  },
  "plus-jakarta": {
    label: "Plus Jakarta Sans",
    family: "'Plus Jakarta Sans', sans-serif",
    description: "Geometric sans with more character — rounder, warmer, slightly playful. Great for community/music apps.",
  },
  outfit: {
    label: "Outfit",
    family: "'Outfit', sans-serif",
    description: "Clean geometric with a modern, slightly stylish feel. Good weight range, reads well at all sizes.",
  },
  satoshi: {
    label: "Satoshi",
    family: "'Satoshi', sans-serif",
    description: "Modern geometric with a contemporary feel. Very popular in design-forward apps right now.",
  },
};

// --- Page ---

export default function ThemePreviewPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeName>("warm-sunset");
  const [activeFont, setActiveFont] = useState<FontName>("plus-jakarta");
  const theme = THEMES[activeTheme];
  const font = FONTS[activeFont];

  return (
    <div className="min-h-screen bg-gray-50 p-8" style={{ fontFamily: font.family }}>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Theme & Font Preview</h1>
          <p className="text-gray-500">Toggle between options to compare how the site looks.</p>
        </div>

        {/* Font toggles */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Font</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.entries(FONTS) as [FontName, FontOption][]).map(([key, f]) => (
              <button
                key={key}
                onClick={() => setActiveFont(key)}
                style={{ fontFamily: f.family }}
                className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                  activeFont === key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 bg-white rounded-lg border border-gray-200 px-4 py-3">
            <span className="font-medium text-gray-800">{font.label}:</span>{" "}
            {font.description}
          </p>
        </div>

        {/* Font sample */}
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Font Sample</h3>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">Porchfest Pal — Music on Every Porch</p>
            <p className="text-base text-gray-700">The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-porch-100 text-porch-700">Tag Example</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Another Tag</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Approved</span>
            </div>
            <div className="pt-2 flex gap-4 text-sm">
              <span className="font-light text-gray-500">Light 300</span>
              <span className="font-normal text-gray-600">Regular 400</span>
              <span className="font-medium text-gray-700">Medium 500</span>
              <span className="font-semibold text-gray-800">Semibold 600</span>
              <span className="font-bold text-gray-900">Bold 700</span>
            </div>
          </div>
        </div>

        {/* Theme toggles */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Color Theme</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {(Object.entries(THEMES) as [ThemeName, ThemeConfig][]).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-full border-2 transition-all ${
                  activeTheme === key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 bg-white rounded-lg border border-gray-200 px-4 py-3">
            <span className="font-medium text-gray-800">{theme.label}:</span>{" "}
            {theme.description}
          </p>
        </div>

        {/* Card preview */}
        <ThemedPorchCard theme={theme} />
      </div>
    </div>
  );
}
