import { useState, useMemo } from "react";
import { BandApplication, PorchApplication, Status, ReviewerUser } from "../types";
import { formatTime } from "../utils";
import StatusSelect from "./StatusSelect";
import SchedulingForm from "./SchedulingForm";

interface BandCardProps {
  band: BandApplication;
  approvedPorches: PorchApplication[];
  eventStartTime: string;
  eventEndTime: string;
  onStatusChange: (bandId: number, status: Status) => void;
  onSchedule: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null
  ) => Promise<void>;
  getPorchAddress: (porchId: number | null) => string | null;
  schedulingError: string | null;
  showReviewerInfo?: boolean;
  reviewerUsers?: ReviewerUser[];
  onReviewUpdate?: (bandId: number, rating: number | null, notes: string | null) => void;
  isMyReview?: boolean;
  currentUserId?: number;
}

const S3_BUCKET = import.meta.env.VITE_S3_BUCKET || "porchfest-band-photos-dev";
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-2";

function getBandPhotoUrl(band: BandApplication): string | null {
  if (!band.photo_key) return null;
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${band.photo_key}`;
}

// Icon components
const MusicIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const SoundCloudIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.21-1.308-.21-1.334c-.01-.057-.054-.09-.09-.09m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.059-.104-.12-.104m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.138l.24-2.544-.24-2.64c-.015-.075-.074-.135-.15-.135m1.035.18c-.09 0-.149.075-.164.164l-.18 2.46.18 2.535c.015.09.075.149.165.149.09 0 .149-.06.18-.149l.2-2.535-.2-2.46c-.016-.09-.075-.164-.165-.164m1.095-.405c-.105 0-.18.09-.18.18l-.165 2.685.18 2.625c0 .09.075.179.165.179.104 0 .179-.089.194-.179l.21-2.625-.21-2.685c-.015-.09-.09-.18-.18-.18m1.11-.165c-.12 0-.195.09-.21.195l-.165 2.85.18 2.73c.015.12.09.21.195.21.12 0 .195-.09.21-.21l.195-2.73-.195-2.85c-.015-.105-.09-.195-.21-.195m1.215-.45c-.135 0-.225.105-.225.225l-.15 3.3.165 2.835c0 .135.09.225.21.225.135 0 .225-.09.225-.225l.195-2.835-.195-3.3c0-.135-.09-.225-.225-.225m1.185-.18c-.149 0-.24.105-.255.24l-.15 3.48.165 2.925c.015.149.105.24.24.24.149 0 .24-.091.255-.24l.18-2.925-.18-3.48c-.015-.135-.105-.24-.24-.24m1.23-.255c-.165 0-.27.12-.27.27l-.135 3.735.15 3.015c0 .149.105.27.255.27.165 0 .27-.12.285-.27l.165-3.015-.165-3.735c-.015-.15-.12-.27-.27-.27m1.275-.045c-.165 0-.285.135-.3.285l-.12 3.78.135 3.09c.015.164.135.284.285.284.164 0 .284-.12.299-.284l.165-3.09-.165-3.78c-.015-.15-.135-.285-.3-.285m5.37 1.5c-.27 0-.524.03-.765.09-.165-1.515-1.439-2.685-3.015-2.685-.39 0-.765.075-1.11.21-.135.045-.18.105-.18.21v5.925c0 .105.075.195.18.21.045 0 4.455.015 4.89.015 1.215 0 2.22-.975 2.22-2.19 0-1.215-1.005-2.19-2.22-2.19"/>
  </svg>
);

const BandcampIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const WebsiteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const PersonIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

export default function BandCard({
  band,
  approvedPorches,
  eventStartTime,
  eventEndTime,
  onStatusChange,
  onSchedule,
  getPorchAddress,
  schedulingError,
  showReviewerInfo = false,
  reviewerUsers = [],
  onReviewUpdate,
  isMyReview = false,
  currentUserId,
}: BandCardProps) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(band.reviewer_rating);
  const [localNotes, setLocalNotes] = useState(band.reviewer_notes || "");
  const [savingReview, setSavingReview] = useState(false);

  const hasNotes = band.scheduling_notes || band.questions_comments;
  const canEditReview = isMyReview && band.assigned_reviewer_id === currentUserId;

  const reviewerName = useMemo(() => {
    if (band.assigned_reviewer_id == null) return null;
    const r = reviewerUsers.find((u) => u.id === band.assigned_reviewer_id);
    if (!r) return null;
    return r.first_name || r.last_name
      ? `${r.first_name || ""} ${r.last_name || ""}`.trim()
      : r.email.split("@")[0];
  }, [band.assigned_reviewer_id, reviewerUsers]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('select') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[data-review-toggle]')
    ) {
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex gap-4 flex-1">
            {/* Photo Thumbnail */}
            <div className="shrink-0">
              {getBandPhotoUrl(band) ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPhoto(true)}
                    className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 cursor-pointer ring-2 ring-gray-200 hover:ring-porch-400 transition-all"
                  >
                    <img
                      src={getBandPhotoUrl(band)!}
                      alt={band.band_name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {showPhoto && (
                    <div
                      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
                      onClick={() => setShowPhoto(false)}
                    >
                      <div
                        className="relative max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="rounded-xl overflow-hidden shadow-2xl bg-white">
                          <img
                            src={getBandPhotoUrl(band)!}
                            alt={band.band_name}
                            className="w-full h-auto"
                          />
                          <div className="p-4 bg-white">
                            <h3 className="font-semibold text-gray-900">{band.band_name}</h3>
                            <p className="text-sm text-gray-500">{band.genre}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPhoto(false)}
                          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 ring-2 ring-gray-200 flex items-center justify-center text-gray-400 text-xl">
                  🎵
                </div>
              )}
            </div>

            {/* Band Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="font-semibold text-lg text-gray-900">
                  {band.band_name}
                </h3>
                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200">
                  {band.genre}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                <span>👤 {band.contact_name}</span>
                <a href={`mailto:${band.contact_email}`} className="hover:text-porch-600 transition-colors">
                  📧 {band.contact_email}
                </a>
                <a href={`tel:${band.contact_phone}`} className="hover:text-porch-600 transition-colors">
                  📱 {band.contact_phone}
                </a>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                <span>👥 {band.member_count} members</span>
                <span>⏱️ {band.set_length}</span>
              </div>

              {band.assigned_porch_id && band.set_start_time && (
                <div className="flex items-center gap-2 text-sm bg-porch-50 text-porch-700 px-3 py-2 rounded-lg mb-3 w-fit">
                  <span>📍 {getPorchAddress(band.assigned_porch_id)}</span>
                  <span>•</span>
                  <span>
                    {formatTime(band.set_start_time)} -{" "}
                    {formatTime(band.set_end_time)}
                  </span>
                </div>
              )}

              {/* Social Links with Icons */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={band.music_sample_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-porch-100 text-porch-600 hover:bg-porch-200 hover:text-porch-700 transition-colors"
                  title="Listen to Sample"
                >
                  <MusicIcon />
                </a>
                {band.instagram && (
                  <a
                    href={band.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-pink-600 hover:from-purple-200 hover:to-pink-200 transition-colors"
                    title="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                )}
                {band.spotify && (
                  <a
                    href={band.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition-colors"
                    title="Spotify"
                  >
                    <SpotifyIcon />
                  </a>
                )}
                {band.soundcloud && (
                  <a
                    href={band.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700 transition-colors"
                    title="SoundCloud"
                  >
                    <SoundCloudIcon />
                  </a>
                )}
                {band.bandcamp && (
                  <a
                    href={band.bandcamp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 hover:bg-cyan-200 hover:text-cyan-700 transition-colors"
                    title="Bandcamp"
                  >
                    <BandcampIcon />
                  </a>
                )}
                {band.facebook && (
                  <a
                    href={band.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition-colors"
                    title="Facebook"
                  >
                    <FacebookIcon />
                  </a>
                )}
                {band.website && (
                  <a
                    href={band.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                    title="Website"
                  >
                    <WebsiteIcon />
                  </a>
                )}

                {/* Expand indicator */}
                <span className="ml-auto text-xs text-gray-400">
                  {expanded ? "▲ Less" : "▼ More"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Reviewer Info - Top Right */}
            {showReviewerInfo && band.assigned_reviewer_id != null && reviewerName && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                  <PersonIcon />
                  <span className="font-medium">
                    {reviewerName}
                  </span>
                </div>
                {band.reviewer_rating !== null && (
                  <div className="flex items-center gap-1 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= band.reviewer_rating!
                            ? "text-amber-500"
                            : "text-gray-300"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                {band.reviewer_notes && (
                  <button
                    type="button"
                    data-review-toggle
                    onClick={() => setReviewExpanded(!reviewExpanded)}
                    className="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <span>📝</span>
                    <span>{reviewExpanded ? "Hide Notes" : "Show Notes"}</span>
                  </button>
                )}
              </div>
            )}

            <StatusSelect
              value={band.status}
              onChange={(status) => onStatusChange(band.id, status)}
            />
          </div>
        </div>

        {/* Collapsible Review Notes Section */}
        {reviewExpanded && band.reviewer_notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                📝 Reviewer Notes
                <span className="text-indigo-600 font-normal normal-case">
                  ({reviewerName})
                </span>
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {band.reviewer_notes}
              </p>
            </div>
          </div>
        )}

        {/* Collapsible Extra Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {/* Bio - Full Width */}
            {band.bio && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Bio
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {band.bio}
                </p>
              </div>
            )}

            {/* Scheduling Notes and Questions - Side by Side */}
            {hasNotes && (
              <div className="grid md:grid-cols-2 gap-4">
                {band.scheduling_notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Scheduling Notes
                    </h4>
                    <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                      {band.scheduling_notes}
                    </p>
                  </div>
                )}
                {band.questions_comments && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Questions/Comments
                    </h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                      {band.questions_comments}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Review Section for My Reviews */}
            {canEditReview && onReviewUpdate && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  ⭐ Your Review
                </h4>
                
                {/* Star Rating */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setLocalRating(star)}
                        className={`text-3xl transition-colors ${
                          star <= (localRating || 0)
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-gray-300 hover:text-gray-400"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {localRating && (
                      <button
                        type="button"
                        onClick={() => setLocalRating(null)}
                        className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Add your notes about this band..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                  />
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setSavingReview(true);
                    try {
                      await onReviewUpdate(band.id, localRating, localNotes || null);
                    } finally {
                      setSavingReview(false);
                    }
                  }}
                  disabled={savingReview}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingReview ? "Saving..." : "Save Review"}
                </button>
              </div>
            )}

            {/* Scheduling Form for Approved Bands */}
            {band.status === "approved" && (
              <div className="bg-porch-50 p-4 rounded-lg border border-porch-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📅 Schedule Performance
                </h4>

                {schedulingError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {schedulingError}
                  </div>
                )}

                {band.assigned_porch_id &&
                  band.set_start_time &&
                  band.set_end_time && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-porch-200">
                      <p className="text-sm">
                        <span className="font-medium">Currently scheduled at:</span>{" "}
                        {getPorchAddress(band.assigned_porch_id)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatTime(band.set_start_time)} -{" "}
                        {formatTime(band.set_end_time)}
                      </p>
                    </div>
                  )}

                <SchedulingForm
                  band={band}
                  approvedPorches={approvedPorches}
                  eventStartTime={eventStartTime}
                  eventEndTime={eventEndTime}
                  onSchedule={onSchedule}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
