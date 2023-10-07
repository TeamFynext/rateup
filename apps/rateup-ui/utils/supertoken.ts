import Session from "supertokens-web-js/recipe/session";

export async function getUserEmail() {
  let email: string;
  if (await Session.doesSessionExist()) {
    let accessTokenPayload = await Session.getAccessTokenPayloadSecurely();
    email = accessTokenPayload.email;

    // console.log("session....................."+ email)
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
