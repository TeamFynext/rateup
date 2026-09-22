import { isStaffMock } from "./auth.api";
import { api } from "./client";

export interface SearchOrg {
  id: string;
  name: string;
  ownerEmail: string | null;
  plan: string | null;
}

export interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  orgId: string | null;
  orgName: string | null;
}

export interface SearchPhone {
  phone: string;
  wabaId: string | null;
  orgId: string;
  orgName: string;
}

/** `GET /search`: grouped, at most 5 per group, for the header palette. */
export interface SearchResults {
  orgs: SearchOrg[];
  users: SearchUser[];
  phones: SearchPhone[];
}

const EMPTY: SearchResults = { orgs: [], users: [], phones: [] };

export async function search(q: string, signal?: AbortSignal): Promise<SearchResults> {
  if (isStaffMock) return EMPTY;
  const { data } = await api.get<{ data: SearchResults }>("/search", { params: { q }, signal });
  return data.data;
}
