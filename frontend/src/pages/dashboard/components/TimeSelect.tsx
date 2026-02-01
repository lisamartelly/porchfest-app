import { formatTime } from "../utils";

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  minTime: string;
  maxTime: string;
  stepMinutes?: number;
  label: string;
}

// Generate time options between min and max in specified increments
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
      >
        <option value="">Select time...</option>
        {options.map((time) => (
          <option key={time} value={time}>
            {formatTime(time)}
          </option>
        ))}
      </select>
    </div>
  );
}
