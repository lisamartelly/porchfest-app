import {
  BandApplication,
  PorchApplication,
  EventSettings,
  Status,
} from "../../types";
import BandCard from "../BandCard";

interface MyReviewsSectionProps {
  myReviewBands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  schedulingError: string | null;
  currentUserId?: number;
  onStatusChange: (bandId: number, status: Status) => Promise<void>;
  onSchedule: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null,
  ) => Promise<void>;
  getPorchAddress: (porchId: number | null) => string | null;
  onReviewUpdate: (
    bandId: number,
    rating: number | null,
    notes: string | null,
  ) => Promise<void>;
}

export default function MyReviewsSection({
  myReviewBands,
  approvedPorches,
  eventSettings,
  schedulingError,
  currentUserId,
  onStatusChange,
  onSchedule,
  getPorchAddress,
  onReviewUpdate,
}: MyReviewsSectionProps) {
  if (myReviewBands.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        No bands have been assigned to you for review yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-porch-50 border border-porch-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-porch-700">
          You have <strong>{myReviewBands.length}</strong> bands to review. Rate
          each band and add notes to help with the selection process.
        </p>
      </div>
      {myReviewBands.map((band) => (
        <BandCard
          key={band.id}
          band={band}
          approvedPorches={approvedPorches}
          eventStartTime={eventSettings?.start_time || "12:00"}
          eventEndTime={eventSettings?.end_time || "18:00"}
          onStatusChange={onStatusChange}
          onSchedule={onSchedule}
          getPorchAddress={getPorchAddress}
          schedulingError={schedulingError}
          showReviewerInfo={true}
          onReviewUpdate={onReviewUpdate}
          isMyReview={true}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
