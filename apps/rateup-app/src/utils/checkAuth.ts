import SuperTokens from "supertokens-react-native";

// `doesSessionExist` refreshes an expired access token over the network, and that
// request has no timeout of its own. An unreachable API would otherwise hang startup.
const SESSION_CHECK_TIMEOUT_MS = 8000;

export const checkAuth = async () => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Session check timed out")),
      SESSION_CHECK_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([SuperTokens.doesSessionExist(), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const checkAuthAndGetToken = async () => {
  const sessionExists = await SuperTokens.doesSessionExist();
  if (!sessionExists) {
    return null;
  }
  const token = await SuperTokens.getAccessToken();
  return token;
};

export const getUserID = async () => {
  const userId = await SuperTokens.getUserId();
  return userId;
};
