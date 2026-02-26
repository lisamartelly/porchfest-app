import { BandApplication, PorchApplication, EventSettings } from "../../types";
import VisualScheduler from "../VisualScheduler";

interface SchedulerSectionProps {
  bands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  onScheduleBand: (
    bandId: string,
    porchId: string | null,
    startTime: string | null,
    endTime: string | null,
  ) => Promise<void>;
}

export default function SchedulerSection({
  bands,
  approvedPorches,
  eventSettings,
  onScheduleBand,
}: SchedulerSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden">
      {approvedPorches.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No approved porches available. Approve some porches first to start
          scheduling.
        </div>
      ) : (
        <VisualScheduler
          bands={bands}
          porches={approvedPorches}
          eventStartTime={eventSettings?.start_time || "12:00"}
          eventEndTime={eventSettings?.end_time || "18:00"}
          onScheduleBand={onScheduleBand}
        />
      )}
    </div>
  );
}
