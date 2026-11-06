import Session from "supertokens-auth-react/recipe/session";

/** The org on the session. The role is not read from the token: `/user/info` carries it. */
export async function getOrgIdRole() {
  let orgId: string | undefined;
  if (await Session.doesSessionExist()) {
    const accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
    orgId = accessTokenPayload.orgId;
  }
  return { orgId };
}

export async function getUserID() {
  const userId: string = await Session.getUserId();
  return { userId };
}
