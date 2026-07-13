import { BandApplication, PorchApplication, PorchAvailableTime, EventSettings, ScheduleStatus } from "../../types";
import VisualScheduler from "../VisualScheduler";

interface SchedulerSectionProps {
  bands: BandApplication[];
  approvedPorches: PorchApplication[];
  eventSettings: EventSettings | null;
  porchAvailableTimes: PorchAvailableTime[];
  onScheduleBand: (
    bandId: number,
    porchId: number | null,
    startTime: string | null,
    endTime: string | null,
  ) => Promise<void>;
  onBandScheduleStatusChange: (
    bandId: number,
    status: ScheduleStatus | null,
  ) => Promise<void>;
  onPorchScheduleStatusChange: (
    porchId: number,
    status: ScheduleStatus | null,
  ) => Promise<void>;
  onCreateAvailableTime: (
    porchId: number,
    startTime: string,
    endTime: string,
  ) => Promise<void>;
  onDeleteAvailableTime: (id: number) => Promise<void>;
}

export default function SchedulerSection({
  bands,
  approvedPorches,
  eventSettings,
  porchAvailableTimes,
  onScheduleBand,
  onBandScheduleStatusChange,
  onPorchScheduleStatusChange,
  onCreateAvailableTime,
  onDeleteAvailableTime,
}: SchedulerSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
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
          porchAvailableTimes={porchAvailableTimes}
          onScheduleBand={onScheduleBand}
          onBandScheduleStatusChange={onBandScheduleStatusChange}
          onPorchScheduleStatusChange={onPorchScheduleStatusChange}
          onCreateAvailableTime={onCreateAvailableTime}
          onDeleteAvailableTime={onDeleteAvailableTime}
        />
      )}
    </div>
  );
}
