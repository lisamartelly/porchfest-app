import { formatTime } from "../utils";
import InlineSelect from "../../../components/ui/InlineSelect";

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  minTime: string;
  maxTime: string;
  stepMinutes?: number;
  label: string;
}

function generateTimeOptions(
  minTime: string,
  maxTime: string,
  stepMinutes: number
): string[] {
  const options: string[] = [];

  const [minHours, minMins] = minTime.split(":").map(Number);
  const [maxHours, maxMins] = maxTime.split(":").map(Number);

  const startMinutes = minHours * 60 + minMins;
  const endMinutes = maxHours * 60 + maxMins;

  for (let mins = startMinutes; mins <= endMinutes; mins += stepMinutes) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    options.push(timeStr);
  }

  return options;
}

export default function TimeSelect({
  value,
  onChange,
  minTime,
  maxTime,
  stepMinutes = 5,
  label,
}: TimeSelectProps) {
  const options = generateTimeOptions(minTime, maxTime, stepMinutes);

  return (
    <InlineSelect
      label={label}
      value={value}
      onChange={onChange}
      placeholder="Select time..."
      options={[
        { value: "", label: "Select time..." },
        ...options.map((time) => ({
          value: time,
          label: formatTime(time),
        })),
      ]}
    />
  );
}
