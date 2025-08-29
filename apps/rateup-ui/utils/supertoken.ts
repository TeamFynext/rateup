import Session from "supertokens-auth-react/recipe/session";

export async function getUserEmail() {
  let email: string;
  if (await Session.doesSessionExist()) {
    let accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
    email = accessTokenPayload.email;
  }
  return email;
}

export function checkTokenExpiry(args) {
  for (let arg of args) {
    if (arg === "Token has expired") {
      return {
        props: {
          fromSupertokens: "needs-refresh",
        },
      };
    }
  }
  return null;
}
