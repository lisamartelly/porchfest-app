import { useState } from "react";
import { api } from "../../../../lib/api";
import { useOrgStore } from "../../../../stores/orgStore";
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
  const { activeOrgId } = useOrgStore();
  const [reviewerEmailsInput, setReviewerEmailsInput] = useState(
    eventSettings?.reviewer_emails?.join(", ") || "",
  );
  const [assigningReviewers, setAssigningReviewers] = useState(false);
  const orgQuery = activeOrgId ? `?org_id=${activeOrgId}` : "";

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

      const result = await api.post(`/api/admin/bands/assign-reviewers${orgQuery}`, {});
      onBandsUpdate(result.bands || []);

      const reviewerData = await api.get(`/api/admin/reviewers${orgQuery}`);
      onReviewersUpdate(reviewerData || []);

      const eventData = await api.get(`/api/admin/event${orgQuery}`);
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
          <svg className="w-5 h-5 text-porch-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
          Configure Reviewers
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
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                Assigning...
              </>
            ) : (
              <>Randomly Assign Bands to Reviewers</>
            )}
          </button>
        </div>
        {eventSettings?.reviewers_assigned && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Reviewers have been assigned. Bands are distributed equally among
            reviewers.
          </div>
        )}
      </div>

      {eventSettings?.reviewers_assigned && reviewers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-porch-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
            Assignment Summary
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
