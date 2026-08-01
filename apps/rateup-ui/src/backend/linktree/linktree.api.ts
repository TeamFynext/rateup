import type { CSSProperties } from "react";

import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

const url = "/linktrees";

/** A single link row on a linktree page, as the endpoint stores and returns it. */
export interface LinktreeLink {
  id: string;
  linkType?: string;
  linkDisplayName?: string;
  linkUrl?: string;
  noOfClicks?: number;
  [key: string]: unknown;
}

/**
 * The persisted theme for a linktree page. The optional `*File` fields are the editor's
 * pre-upload staging slots — they are never returned by the API, only carried locally on
 * the way into an update, which is why they are part of the same shape.
 */
export interface LinktreeTheme {
  background: {
    styles: CSSProperties;
    desktopBgImgUrl: string | null;
    desktopBgImgFile?: File | null;
    mobileBgImgUrl: string | null;
    mobileBgImgFile?: File | null;
  };
  logo: {
    styles: CSSProperties;
    logoUrl?: string | null;
    logoFile?: File | null;
  };
  title: { styles: CSSProperties; text: string };
  subtitle: { styles: CSSProperties; text: string };
  linkListItem: { styles: CSSProperties };
}

async function getLinktrees() {
  const res = await axiosClient.get(url);
  return res.data;
}

/** A linktree page as the editor's endpoint returns it. */
export interface LinktreeData {
  id: string;
  name: string;
  isPublished?: boolean;
  links?: LinktreeLink[];
  theme?: LinktreeTheme;
  shareSettings?: Record<string, unknown>;
  [key: string]: unknown;
}

function getLinktreeWithShortId(shortUrlId: string) {
  return async () => {
    const res = await axiosClient.get<LinktreeData>(`${url}/${shortUrlId}`);
    return res.data;
  };
}

async function getPublicLinktreeWithShortId(shortUrlId: string) {
  const res = await axiosClient.get(`${url}/public/${shortUrlId}`);
  return res.data;
}

async function createLinktree(data: RequestPayload) {
  const res = await axiosClient.post(url, data);
  return res.data;
}

async function updateLinktree(data: RequestPayload) {
  const res = await axiosClient.put(url, data);
  return res.data;
}

async function deleteLinktree(id: string) {
  const res = await axiosClient.delete(`${url}/${id}`);
  return res.data;
}

function getDropdownOptionsOfLinkType(linkType: string) {
  return async () => {
    const res = await axiosClient.get(`${url}/linkTypeDropdownOptions/${linkType}`);
    return res.data;
  };
}

async function updatePageVisitsOrLinkClicks(shortUrlId: string, bodyData: RequestPayload) {
  const res = await axiosClient.patch(`${url}/pageVisitsOrLinkClicks/${shortUrlId}`, bodyData);
  return res.data;
}

export {
  getLinktrees,
  getLinktreeWithShortId,
  getPublicLinktreeWithShortId,
  createLinktree,
  updateLinktree,
  deleteLinktree,
  getDropdownOptionsOfLinkType,
  updatePageVisitsOrLinkClicks,
};
