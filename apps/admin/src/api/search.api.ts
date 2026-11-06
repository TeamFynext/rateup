import { api } from "./client";

export interface SearchOrg {
  id: string;
  name: string;
  logo: string | null;
  ownerEmail: string;
  plan: string | null;
}

export interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  /** Up to three of the orgs they belong to. */
  orgs: { id: string; name: string }[];
}

export interface SearchPhone {
  id: string;
  phone: string | null;
  displayName: string | null;
  wabaId: string | null;
  type: string;
  org: { id: string; name: string };
}

/** `GET /search`: grouped, at most 5 per group, for the header palette. */
export interface SearchResults {
  orgs: SearchOrg[];
  users: SearchUser[];
  phones: SearchPhone[];
}

export async function search(q: string, signal?: AbortSignal): Promise<SearchResults> {
  const { data } = await api.get<{ data: SearchResults }>("/search", { params: { q }, signal });
  return data.data;
}
