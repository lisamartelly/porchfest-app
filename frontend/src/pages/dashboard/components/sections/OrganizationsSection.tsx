import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";
import { OrgSummary } from "../../types";

export default function OrganizationsSection() {
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    description: "",
    website: "",
    contact_email: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.get("/api/admin/organizations");
      setOrganizations(orgs || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    try {
      await api.post("/api/admin/organizations", newOrgForm);
      setFormSuccess(true);
      setNewOrgForm({
        name: "",
        slug: "",
        city: "",
        state: "",
        description: "",
        website: "",
        contact_email: "",
      });
      fetchOrganizations();
    } catch (error) {
      setFormError(
        (error as Error).message || "Failed to create organization",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Create New Organization
        </h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Organization created successfully!
          </div>
        )}

        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newOrgForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                  setNewOrgForm({ ...newOrgForm, name, slug });
                }}
                className="input-field"
                placeholder="e.g. Somerville Porchfest"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={newOrgForm.slug}
                onChange={(e) =>
                  setNewOrgForm({ ...newOrgForm, slug: e.target.value })
                }
                className="input-field"
                placeholder="somerville-porchfest"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={newOrgForm.city}
                onChange={(e) =>
                  setNewOrgForm({ ...newOrgForm, city: e.target.value })
                }
                className="input-field"
                placeholder="Somerville"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={newOrgForm.state}
                onChange={(e) =>
                  setNewOrgForm({ ...newOrgForm, state: e.target.value })
                }
                className="input-field"
                placeholder="MA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={newOrgForm.contact_email}
              onChange={(e) =>
                setNewOrgForm({
                  ...newOrgForm,
                  contact_email: e.target.value,
                })
              }
              className="input-field"
              placeholder="info@example.org"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="text"
              value={newOrgForm.website}
              onChange={(e) =>
                setNewOrgForm({ ...newOrgForm, website: e.target.value })
              }
              className="input-field"
              placeholder="https://example.org"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newOrgForm.description}
              onChange={(e) =>
                setNewOrgForm({
                  ...newOrgForm,
                  description: e.target.value,
                })
              }
              className="input-field min-h-[80px]"
              placeholder="About this porchfest organization..."
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-porch-600 text-white rounded-lg hover:bg-porch-700 transition-colors text-sm font-medium"
          >
            Create Organization
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          All Organizations
        </h3>
        {organizations.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No organizations yet. Create one above.
          </p>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-500">
                      {org.city && org.state
                        ? `${org.city}, ${org.state}`
                        : org.city || org.state || "No location set"}{" "}
                      &middot;{" "}
                      <span className="font-mono text-xs">{org.slug}</span>
                    </p>
                    {org.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {org.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
