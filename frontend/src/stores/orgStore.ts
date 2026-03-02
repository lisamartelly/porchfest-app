import { create } from "zustand";
import { api } from "../lib/api";

interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  org_role: string;
}

interface OrgState {
  organizations: OrgSummary[];
  activeOrgId: number | null;
  loading: boolean;

  activeOrgRole: string | null;
  initialize: () => Promise<void>;
  setActiveOrg: (orgId: number) => void;
  reset: () => void;
}

const STORAGE_KEY = "active_org_id";

function roleForOrg(orgs: OrgSummary[], orgId: number | null): string | null {
  if (!orgId) return null;
  return orgs.find((o) => o.id === orgId)?.org_role ?? null;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  activeOrgId: null,
  activeOrgRole: null,
  loading: true,

  initialize: async () => {
    try {
      const orgs: OrgSummary[] = await api.get("/api/admin/my-organizations");
      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedOrgId = savedId ? Number(savedId) : null;

      const activeId =
        orgs.find((o) => o.id === savedOrgId)?.id ?? orgs[0]?.id ?? null;

      if (activeId) {
        localStorage.setItem(STORAGE_KEY, String(activeId));
      }

      set({
        organizations: orgs,
        activeOrgId: activeId,
        activeOrgRole: roleForOrg(orgs, activeId),
        loading: false,
      });
    } catch (error) {
      console.error("Error loading organizations:", error);
      set({ organizations: [], activeOrgId: null, activeOrgRole: null, loading: false });
    }
  },

  setActiveOrg: (orgId: number) => {
    const { organizations } = get();
    if (organizations.some((o) => o.id === orgId)) {
      localStorage.setItem(STORAGE_KEY, String(orgId));
      set({ activeOrgId: orgId, activeOrgRole: roleForOrg(organizations, orgId) });
    }
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ organizations: [], activeOrgId: null, activeOrgRole: null, loading: true });
  },
}));
