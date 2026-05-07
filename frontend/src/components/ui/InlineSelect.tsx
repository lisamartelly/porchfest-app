import { useState, useRef, useEffect } from "react";

export interface InlineSelectOption {
  value: string;
  label: string;
  dot?: string; // Tailwind bg class for a color dot
}

interface InlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: InlineSelectOption[];
  label?: string;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function InlineSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "Select...",
  size = "md",
  className = "",
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const sizeClasses = size === "sm"
    ? "px-2.5 py-1 text-xs gap-1.5"
    : "px-3 py-1.5 text-sm gap-2";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center ${sizeClasses} font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-porch-300 hover:bg-porch-50 transition-all whitespace-nowrap`}
      >
        {selectedOption?.dot && (
          <span className={`w-2 h-2 rounded-full ${selectedOption.dot}`} />
        )}
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[200px] overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                  option.value === value
                    ? "bg-porch-50 text-porch-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.dot && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${option.dot}`} />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
