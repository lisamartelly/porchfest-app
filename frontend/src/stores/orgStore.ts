import { create } from "zustand";
import { api } from "../lib/api";

interface OrgSummary {
  id: number;
  name: string;
  slug: string;
}

interface OrgState {
  organizations: OrgSummary[];
  activeOrgId: number | null;
  loading: boolean;

  initialize: () => Promise<void>;
  setActiveOrg: (orgId: number) => void;
  reset: () => void;
}

const STORAGE_KEY = "active_org_id";

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  activeOrgId: null,
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

      set({ organizations: orgs, activeOrgId: activeId, loading: false });
    } catch (error) {
      console.error("Error loading organizations:", error);
      set({ organizations: [], activeOrgId: null, loading: false });
    }
  },

  setActiveOrg: (orgId: number) => {
    const { organizations } = get();
    if (organizations.some((o) => o.id === orgId)) {
      localStorage.setItem(STORAGE_KEY, String(orgId));
      set({ activeOrgId: orgId });
    }
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ organizations: [], activeOrgId: null, loading: true });
  },
}));
