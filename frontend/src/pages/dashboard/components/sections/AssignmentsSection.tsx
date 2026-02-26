import { useState } from "react";
import { api } from "../../../../lib/api";
import { BandApplication, EventSettings } from "../../types";

interface AssignmentsSectionProps {
  eventSettings: EventSettings | null;
  reviewers: string[];
  bands: BandApplication[];
  onBandsUpdate: (bands: BandApplication[]) => void;
  onReviewersUpdate: (reviewers: string[]) => void;
  onEventSettingsUpdate: (settings: EventSettings) => void;
  updateEventSettings: (updates: Partial<EventSettings>) => Promise<void>;
}

export default function AssignmentsSection({
  eventSettings,
  reviewers,
  bands,
  onBandsUpdate,
  onReviewersUpdate,
  onEventSettingsUpdate,
  updateEventSettings,
}: AssignmentsSectionProps) {
  const [reviewerEmailsInput, setReviewerEmailsInput] = useState(
    eventSettings?.reviewer_emails?.join(", ") || "",
  );
  const [assigningReviewers, setAssigningReviewers] = useState(false);

  const saveReviewerEmails = async () => {
    const emails = reviewerEmailsInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    await updateEventSettings({ reviewer_emails: emails });
  };

  const assignReviewers = async () => {
    setAssigningReviewers(true);
    try {
      const emails = reviewerEmailsInput
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      await updateEventSettings({ reviewer_emails: emails });

      const result = await api.post("/api/admin/bands/assign-reviewers", {});
      onBandsUpdate(result.bands || []);

      const reviewerData = await api.get("/api/admin/reviewers");
      onReviewersUpdate(reviewerData || []);

      const eventData = await api.get("/api/admin/event");
      onEventSettingsUpdate(eventData);
    } catch (error) {
      console.error("Error assigning reviewers:", error);
    } finally {
      setAssigningReviewers(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          👥 Configure Reviewers
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter the email addresses of admins who will review band applications.
          Separate multiple emails with commas.
        </p>
        <textarea
          value={reviewerEmailsInput}
          onChange={(e) => setReviewerEmailsInput(e.target.value)}
          placeholder="admin1@example.com, admin2@example.com, admin3@example.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-porch-500 focus:border-porch-500 mb-4"
          rows={3}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={saveReviewerEmails}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Save Reviewer List
          </button>
          <button
            onClick={assignReviewers}
            disabled={assigningReviewers || !reviewerEmailsInput.trim()}
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {assigningReviewers ? (
              <>
                <span className="animate-spin">⏳</span>
                Assigning...
              </>
            ) : (
              <>🎲 Randomly Assign Bands to Reviewers</>
            )}
          </button>
        </div>
        {eventSettings?.reviewers_assigned && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✅ Reviewers have been assigned. Bands are distributed equally among
            reviewers.
          </div>
        )}
      </div>

      {eventSettings?.reviewers_assigned && reviewers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            📊 Assignment Summary
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewers.map((email) => {
              const assignedBands = bands.filter(
                (b) => b.assigned_reviewer_email === email,
              );
              const reviewedCount = assignedBands.filter(
                (b) => b.reviewer_rating !== null,
              ).length;
              return (
                <div
                  key={email}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {email.split("@")[0]}
                  </p>
                  <p className="text-sm text-gray-500">{email}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="bg-porch-100 text-porch-700 px-2 py-0.5 rounded">
                      {assignedBands.length} bands
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {reviewedCount} reviewed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
