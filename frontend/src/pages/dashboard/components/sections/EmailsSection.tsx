import { useState, useMemo } from "react";
import { BandApplication, PorchApplication, EventSettings } from "../../types";

interface EmailsSectionProps {
  porches: PorchApplication[];
  bands: BandApplication[];
  eventSettings: EventSettings | null;
}

interface PorchWithBands {
  porch: PorchApplication;
  bands: BandApplication[];
}

function formatTime12(time: string | null): string {
  if (!time) return "";
  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minStr} ${period}`;
}

function generateSubject(porch: PorchApplication, bands: BandApplication[]): string {
  const sorted = [...bands].sort((a, b) => {
    if (!a.set_start_time || !b.set_start_time) return 0;
    return a.set_start_time.localeCompare(b.set_start_time);
  });
  const bandNames = sorted.map((b) => b.band_name).join(", ");
  return `Uptown Porchfest Band/Host Connection - ${bandNames} & ${porch.owner_name}`;
}

function generateRecipients(porch: PorchApplication, bands: BandApplication[]): string {
  const emails = [porch.email, ...bands.map((b) => b.contact_email)].filter(Boolean);
  return [...new Set(emails)].join(", ");
}

function generateBody(porch: PorchApplication, bands: BandApplication[]): string {
  const sorted = [...bands].sort((a, b) => {
    if (!a.set_start_time || !b.set_start_time) return 0;
    return a.set_start_time.localeCompare(b.set_start_time);
  });

  let body = `Hi all! We're excited to introduce you to your porchfest match! Please see all contact info plus planning pointers below.

Host Contact Info: 

Name: ${porch.owner_name}
Porch/Address: ${porch.address}
Phone: ${porch.phone || "N/A"}
Email: ${porch.email}

Musician(s) Contact Info: 
`;

  for (const band of sorted) {
    const setTime = [formatTime12(band.set_start_time), formatTime12(band.set_end_time)]
      .filter(Boolean)
      .join(" - ");
    body += `
Band Name: ${band.band_name}
Contact Name: ${band.contact_name}
Set Time: ${setTime}
Phone: ${band.contact_phone || "N/A"}
Email: ${band.contact_email}
`;
  }

  body += `
We recommend porch hosts take the lead in reaching out to their bands. Sometimes texting is the best way to get a response, too. But bands, if you do not hear from your host in a somewhat timely manner, feel free to reach out to them. If anyone on any side is not responding, let me know ASAP!

Things worth discussing:

- confirming your address and time slot with each other (if I bungled any of this please let me know!!!)
- any available parking options
- space needs and options
- extension cords/electricity access
- whether you'd like to set up a table for merch
- any personal concerns or accommodations worth noting

Just generally make sure you're on the same page and that any questions you have are answered so that you can have a smooth experience come showtime!`;

  if (sorted.length > 1) {
    body += `

Since you have multiple bands: Certainly reach out to each other about sharing gear, PAs, etc! We heartily encourage this! `;
  }

  body += `

If any questions come up as you're connecting that you have for me, please reach out! At this point, texting me is probably quickest and easiest, so go for it if you're comfortable - my cell is 651 343 7589. Otherwise email works too!`;

  return body;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all"
      style={{
        backgroundColor: copied ? "#ecfdf5" : "white",
        borderColor: copied ? "#6ee7b7" : "#e5e7eb",
        color: copied ? "#065f46" : "#374151",
      }}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
      )}
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function EmailsSection({ porches, bands }: EmailsSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");

  const porchesWithBands: PorchWithBands[] = useMemo(() => {
    return porches
      .filter((p) => p.status === "approved")
      .map((porch) => ({
        porch,
        bands: bands
          .filter((b) => b.assigned_porch_id === porch.id && b.set_start_time)
          .sort((a, b) => (a.set_start_time || "").localeCompare(b.set_start_time || "")),
      }))
      .filter((pw) => pw.bands.length > 0)
      .sort((a, b) => a.porch.address.localeCompare(b.porch.address));
  }, [porches, bands]);

  const filteredPorches = useMemo(() => {
    if (!search.trim()) return porchesWithBands;
    const query = search.toLowerCase();
    return porchesWithBands.filter(
      (pw) =>
        pw.porch.owner_name.toLowerCase().includes(query) ||
        pw.porch.address.toLowerCase().includes(query) ||
        pw.bands.some((b) => b.band_name.toLowerCase().includes(query)),
    );
  }, [porchesWithBands, search]);

  const selected = filteredPorches[selectedIndex] || null;

  const subject = selected ? generateSubject(selected.porch, selected.bands) : "";
  const recipients = selected ? generateRecipients(selected.porch, selected.bands) : "";
  const body = selected ? generateBody(selected.porch, selected.bands) : "";

  if (porchesWithBands.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        No approved porches with scheduled bands yet. Schedule bands to porches first, then come back here to generate emails.
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left sidebar - porch list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="mb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search porches or bands..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-porch-500 focus:border-porch-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {filteredPorches.length} of {porchesWithBands.length} porches with scheduled bands
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredPorches.map((pw, index) => (
            <button
              key={pw.porch.id}
              onClick={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                selectedIndex === index
                  ? "bg-porch-50 border-porch-200 shadow-sm"
                  : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${
                  selectedIndex === index ? "text-porch-800" : "text-gray-800"
                }`}>
                  {pw.porch.address}
                </span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {pw.bands.length} {pw.bands.length === 1 ? "band" : "bands"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{pw.porch.owner_name}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {pw.bands.map((b) => (
                  <span
                    key={b.id}
                    className="inline-block text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                  >
                    {b.band_name}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel - generated email */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Navigation header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                  disabled={selectedIndex === 0}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500">
                  {selectedIndex + 1} of {filteredPorches.length}
                </span>
                <button
                  onClick={() => setSelectedIndex((i) => Math.min(filteredPorches.length - 1, i + 1))}
                  disabled={selectedIndex === filteredPorches.length - 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                {selected.porch.address} — {selected.porch.owner_name}
              </h3>
              <CopyButton
                text={`${recipients}\n\n${subject}\n\n${body}`}
                label="Copy All"
              />
            </div>

            <div className="p-6 space-y-5">
              {/* To field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</label>
                  <CopyButton text={recipients} label="Copy" />
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 break-all select-all">
                  {recipients}
                </div>
              </div>

              {/* Subject field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
                  <CopyButton text={subject} label="Copy" />
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 select-all">
                  {subject}
                </div>
              </div>

              {/* Body field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Body</label>
                  <CopyButton text={body} label="Copy" />
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap select-all leading-relaxed font-mono text-[13px]">
                  {body}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            {search ? "No porches match your search." : "Select a porch to generate an email."}
          </div>
        )}
      </div>
    </div>
  );
}
