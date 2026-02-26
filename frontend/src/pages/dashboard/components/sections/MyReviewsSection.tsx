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
  currentUserEmail?: string;
  onStatusChange: (bandId: string, status: Status) => Promise<void>;
  onSchedule: (
    bandId: string,
    porchId: string | null,
    startTime: string | null,
    endTime: string | null,
  ) => Promise<void>;
  getPorchAddress: (porchId: string | null) => string | null;
  onReviewUpdate: (
    bandId: string,
    rating: number | null,
    notes: string | null,
  ) => Promise<void>;
}

export default function MyReviewsSection({
  myReviewBands,
  approvedPorches,
  eventSettings,
  schedulingError,
  currentUserEmail,
  onStatusChange,
  onSchedule,
  getPorchAddress,
  onReviewUpdate,
}: MyReviewsSectionProps) {
  if (myReviewBands.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        {eventSettings?.reviewers_assigned
          ? "No bands have been assigned to you for review."
          : "Reviewer assignments have not been made yet. Check the Assignments section."}
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
          currentUserEmail={currentUserEmail}
        />
      ))}
    </div>
  );
}
