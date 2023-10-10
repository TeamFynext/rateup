import { GetServerSidePropsContext } from "next";

export const getAccessTokenFromContext = (
  context: GetServerSidePropsContext,
) => {
  return (
    context.req.cookies["st-access-token"] ||
    context.req.cookies["sAccessToken"]
  );
};
