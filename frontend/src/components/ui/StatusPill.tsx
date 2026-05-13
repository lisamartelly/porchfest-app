import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { StatusOption } from "./statusOptions";

interface StatusPillProps {
  value: string;
  onChange: (value: string) => void;
  options: StatusOption[];
  size?: "sm" | "md";
}

export default function StatusPill({
  value,
  onChange,
  options,
  size = "sm",
}: StatusPillProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = (options.length * 32) + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setPosition({
      top: openAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  const selected = options.find((o) => o.value === value) || options[0];

  const sizeClasses = size === "sm"
    ? "px-2.5 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 ${sizeClasses} font-medium rounded-full ${selected.bg} ${selected.text} transition-all hover:opacity-80 cursor-pointer`}
      >
        {selected.label}
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] min-w-[140px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden py-1"
          style={{ top: position.top, left: position.left }}
        >
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
                  ? "bg-gray-50 font-medium"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${option.bg} border ${option.text.replace("text-", "border-")}`} />
              <span className="text-gray-700">{option.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </span>
  );
}
