import type { IUserInfoApiResponse } from "@/backend/user/user.api";

type SignupRedirectArgs = Readonly<{
  hasUserData: boolean;
  missingOrgId: boolean;
  userInfoErrorMessage: string | null;
}>;

type AssignedTeamWiseCount = Readonly<{
  teamId: string;
  assignedCount: number;
  assignedToMeCount: number;
}>;

type InboxCountData = Readonly<{
  assignedTeamWiseCount?: AssignedTeamWiseCount[];
  [key: string]: unknown;
}>;

export const getStoredRedirect = (key: string) => {
  const redirect = globalThis.localStorage.getItem(key);

  if (redirect) {
    globalThis.localStorage.removeItem(key);
  }

  return redirect;
};

export const getSignupRedirect = ({
  hasUserData,
  missingOrgId,
  userInfoErrorMessage,
}: SignupRedirectArgs) => {
  if (hasUserData && missingOrgId) {
    return "/signup?auth=google";
  }

  if (userInfoErrorMessage === "Google User missing in Rateup") {
    return "/signup?auth=google";
  }

  if (userInfoErrorMessage === "User missing in Rateup") {
    return "/signup";
  }

  return null;
};

export const getUserInfoErrorMessage = (
  userQueryData: unknown,
  queryError: unknown,
): string | null => {
  if (queryError instanceof Error) {
    return queryError.message;
  }

  if (
    userQueryData &&
    typeof userQueryData === "object" &&
    "error" in userQueryData
  ) {
    const maybeError = userQueryData.error as { message?: unknown } | undefined;
    return typeof maybeError?.message === "string" ? maybeError.message : null;
  }

  return null;
};

export const mergeInboxCountByAssignedTeams = (
  inboxCount: InboxCountData,
  assignedTeams: string[],
) => {
  const assignedTeamWiseCount = Array.isArray(inboxCount.assignedTeamWiseCount)
    ? inboxCount.assignedTeamWiseCount
    : [];

  const { assignedTeamWiseCount: _ignored, ...rest } = inboxCount;

  if (!assignedTeams.length) {
    return rest;
  }

  return {
    ...rest,
    assigned: assignedTeamWiseCount.reduce((count, teamCount) => {
      return assignedTeams.includes(teamCount.teamId)
        ? count + teamCount.assignedCount
        : count;
    }, 0),
    assignedToMe: assignedTeamWiseCount.reduce((count, teamCount) => {
      return assignedTeams.includes(teamCount.teamId)
        ? count + teamCount.assignedToMeCount
        : count;
    }, 0),
  };
};

export const hasUserPayload = (
  userQueryData: unknown,
): userQueryData is IUserInfoApiResponse => {
  if (!userQueryData || typeof userQueryData !== "object") {
    return false;
  }

  if (!("data" in userQueryData)) {
    return false;
  }

  const payload = userQueryData.data;
  return Boolean(payload && typeof payload === "object");
};
