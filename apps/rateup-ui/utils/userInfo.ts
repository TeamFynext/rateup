import Session from 'supertokens-auth-react/recipe/session';

export async function getOrgIdRole() {
    let orgId, role;
    if (await Session.doesSessionExist()) {
        let accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
        orgId = accessTokenPayload.orgId
        role = accessTokenPayload.role
    }
    return { orgId, role };
}


export async function getUserID() {
    let userId ;
    userId = await Session.getUserId();
    return { userId };
}
  
