import { useState, useRef, useEffect } from "react";

export interface FilterPillOption {
  value: string;
  label: string;
}

export type FilterPillColor = "porch" | "amber" | "rose" | "orange" | "pink";

const COLOR_STYLES: Record<FilterPillColor, { active: string; hover: string; dropdown: string }> = {
  porch: {
    active: "bg-porch-600 text-white border-porch-600 shadow-sm",
    hover: "hover:bg-porch-50 hover:border-porch-300",
    dropdown: "bg-porch-50 text-porch-700",
  },
  amber: {
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
    hover: "hover:bg-amber-50 hover:border-amber-300",
    dropdown: "bg-amber-50 text-amber-700",
  },
  rose: {
    active: "bg-porch-400 text-white border-porch-400 shadow-sm",
    hover: "hover:bg-porch-50 hover:border-porch-200",
    dropdown: "bg-porch-50 text-porch-600",
  },
  orange: {
    active: "bg-amber-600 text-white border-amber-600 shadow-sm",
    hover: "hover:bg-amber-50 hover:border-amber-200",
    dropdown: "bg-amber-50 text-amber-600",
  },
  pink: {
    active: "bg-rose-300 text-rose-900 border-rose-300 shadow-sm",
    hover: "hover:bg-rose-50 hover:border-rose-200",
    dropdown: "bg-rose-50 text-rose-600",
  },
};

interface FilterPillProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterPillOption[];
  placeholder?: string;
  searchable?: boolean;
  color?: FilterPillColor;
  className?: string;
}

export default function FilterPill({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  color = "porch",
  className = "",
}: FilterPillProps) {
  const colors = COLOR_STYLES[color];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = value !== "" && value !== "all";

  const filteredOptions = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-all whitespace-nowrap ${
          hasValue
            ? colors.active
            : `bg-white text-gray-700 border-gray-200 ${colors.hover}`
        }`}
      >
        <span className="truncate max-w-[180px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
        {hasValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(options[0]?.value ?? "");
              setOpen(false);
            }}
            className="ml-0.5 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[200px] max-w-[300px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-1">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-porch-500 focus:border-porch-500"
                />
              </div>
            </div>
          )}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2">No results</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    option.value === value
                      ? `${colors.dropdown} font-medium`
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
