import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { useOrgStore } from "../../../../stores/orgStore";
import { AdminUser, BandApplication, ReviewerUser } from "../../types";

interface AssignmentsSectionProps {
  bands: BandApplication[];
  reviewers: ReviewerUser[];
  onBandsUpdate: (bands: BandApplication[]) => void;
  onReviewersUpdate: (reviewers: ReviewerUser[]) => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  organizer: "Organizer",
  reviewer: "Reviewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  organizer: "bg-blue-100 text-blue-700 border-blue-200",
  reviewer: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AssignmentsSection({
  bands,
  reviewers,
  onBandsUpdate,
  onReviewersUpdate,
}: AssignmentsSectionProps) {
  const { activeOrgId } = useOrgStore();
  const orgQuery = activeOrgId ? `?org_id=${activeOrgId}` : "";

  const [orgUsers, setOrgUsers] = useState<AdminUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set(),
  );
  const [sendEmail, setSendEmail] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchOrgUsers = useCallback(async () => {
    if (!activeOrgId) return;
    setLoadingUsers(true);
    try {
      const data = await api.get(`/api/admin/users?org_id=${activeOrgId}`);
      setOrgUsers(data || []);
    } catch (error) {
      console.error("Error fetching org users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchOrgUsers();
  }, [fetchOrgUsers]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === orgUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(orgUsers.map((u) => u.id)));
    }
  };

  const assignReviewers = async () => {
    if (selectedUserIds.size === 0) return;
    setAssigning(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await api.post(
        `/api/admin/bands/assign-reviewers${orgQuery}`,
        {
          userIds: [...selectedUserIds],
          sendEmail,
        },
      );
      onBandsUpdate(result.bands || []);

      const reviewerData = await api.get(`/api/admin/reviewers${orgQuery}`);
      onReviewersUpdate(reviewerData || []);
      setSuccessMessage(result.message || "Reviewers assigned successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to assign reviewers. Please try again.";
      setError(message);
    } finally {
      setAssigning(false);
    }
  };

  const allSelected =
    orgUsers.length > 0 && selectedUserIds.size === orgUsers.length;
  const someSelected =
    selectedUserIds.size > 0 && selectedUserIds.size < orgUsers.length;
  const unassignedCount = bands.filter(
    (b) => b.assigned_reviewer_id == null,
  ).length;
  const hasAssignments = bands.some((b) => b.assigned_reviewer_id != null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-porch-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          Configure Reviewers
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Choose which organization members should review band applications.
          Unassigned bands will be distributed equally among selected reviewers.
        </p>
        <p className="text-sm font-medium mb-4">
          {unassignedCount > 0 ? (
            <span className="text-porch-700">
              {unassignedCount} unassigned{" "}
              {unassignedCount === 1 ? "band" : "bands"} to distribute
            </span>
          ) : (
            <span className="text-green-700">
              All {bands.length} bands have been assigned to reviewers.
            </span>
          )}
        </p>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-porch-600"></div>
          </div>
        ) : orgUsers.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            No users found for this organization.
          </div>
        ) : (
          <>
            {/* Select All */}
            <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-t-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-porch-600 focus:ring-porch-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({orgUsers.length})
              </span>
            </label>

            {/* User List */}
            <div className="border border-t-0 border-gray-200 rounded-b-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {orgUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 rounded border-gray-300 text-porch-600 focus:ring-porch-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                          : user.email.split("@")[0]}
                      </span>
                      {user.org_role && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            ROLE_COLORS[user.org_role] ||
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {ROLE_LABELS[user.org_role] || user.org_role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700 font-medium"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-3 text-green-500 hover:text-green-700 font-medium"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={assignReviewers}
            disabled={assigning || selectedUserIds.size === 0}
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {assigning ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Assigning...
              </>
            ) : (
              <>
                Assign {unassignedCount}{" "}
                {unassignedCount === 1 ? "Band" : "Bands"} to{" "}
                {selectedUserIds.size}{" "}
                {selectedUserIds.size === 1 ? "Reviewer" : "Reviewers"}
              </>
            )}
          </button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-porch-600 focus:ring-porch-500"
            />
            <span className="text-sm text-gray-700">
              Send email notifications to reviewers
            </span>
          </label>
        </div>
      </div>

      {/* Assignment Summary */}
      {hasAssignments && reviewers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-porch-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
              />
            </svg>
            Assignment Summary
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewers.map((reviewer) => {
              const assignedBands = bands.filter(
                (b) => b.assigned_reviewer_id === reviewer.id,
              );
              const reviewedCount = assignedBands.filter(
                (b) => b.reviewer_rating !== null,
              ).length;
              const displayName =
                reviewer.first_name || reviewer.last_name
                  ? `${reviewer.first_name || ""} ${reviewer.last_name || ""}`.trim()
                  : reviewer.email.split("@")[0];
              return (
                <div
                  key={reviewer.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {reviewer.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="bg-porch-100 text-porch-700 px-2.5 py-0.5 rounded-md font-medium">
                      {assignedBands.length}{" "}
                      {assignedBands.length === 1 ? "band" : "bands"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-medium ${
                        reviewedCount === assignedBands.length &&
                        assignedBands.length > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {reviewedCount}/{assignedBands.length} reviewed
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
