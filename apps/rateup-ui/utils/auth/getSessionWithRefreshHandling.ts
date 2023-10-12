import Session from "supertokens-node/recipe/session";
import supertokensNode from "supertokens-node";
import { backendConfig } from "../../config/backendConfig";

export async function getSessionWithRefreshHandling(context) {
  try {
    supertokensNode.init(backendConfig());

    // await Session.getSession(context.req, context.res, {
    //   overrideGlobalClaimValidators: () => {
    //     return [];
    //   },
    // });

    //    const token = await Session.getAccessToken();

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { fromSupertokens: "needs-refresh" } };
    }

    return accessToken;
  } catch (err) {
    if (
      err.type === Session.Error.TRY_REFRESH_TOKEN ||
      err.type === Session.Error.UNAUTHORISED
    ) {
      console.log(err);
      return { props: { fromSupertokens: "needs-refresh" } };
    }
    throw err;
  }
}
