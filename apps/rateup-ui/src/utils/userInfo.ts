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

export async function getUserEmail() {
  let email: string;
  if (await Session.doesSessionExist()) {
    const accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
    email = accessTokenPayload.email;
  }
  return { email };
}

export async function fetchUserData(): Promise<{
  email: string;
  role: string;
  userId: string;
}> {
  const emailResponse = await getUserEmail();
  const roleResponse = await getOrgIdRole();
  const userIdResponse = await getUserID();

  return {
    email: emailResponse.email,
    role: roleResponse.role,
    userId: userIdResponse.userId,
  };
}
