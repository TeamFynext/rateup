import Session from "supertokens-auth-react/recipe/session";

export async function getOrgIdRole() {
  let orgId: string, role: string;
  if (await Session.doesSessionExist()) {
    const accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
    orgId = accessTokenPayload.orgId;
    role = accessTokenPayload.role;
  }
  return { orgId, role };
}

export async function getUserID() {
  const userId: string = await Session.getUserId();
  return { userId };
}
